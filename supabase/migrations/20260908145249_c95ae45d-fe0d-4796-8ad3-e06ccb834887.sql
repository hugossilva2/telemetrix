-- Associa abastecimentos sem veículo ao único veículo do usuário
update public.fuel_logs f
set vehicle_id = v.id
from public.vehicles v
where f.vehicle_id is null
  and v.user_id = f.user_id
  and (select count(*) from public.vehicles v2 where v2.user_id = f.user_id) = 1;

-- Só conta o trecho quando os dois abastecimentos são do mesmo combustível
create or replace function public.recompute_fuel_calibration(_vehicle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select user_id into v_user from public.vehicles where id = _vehicle_id;
  if v_user is null then return; end if;
  with fills as (
    select date, fuel_type, liters_filled, mileage_at_fill,
           lag(mileage_at_fill) over (order by mileage_at_fill) as prev_km,
           lag(fuel_type)       over (order by mileage_at_fill) as prev_fuel
    from public.fuel_logs
    where vehicle_id = _vehicle_id and is_full_tank
  ),
  seg as (
    select fuel_type, (mileage_at_fill - prev_km) as km, liters_filled as liters, date
    from fills
    where prev_km is not null
      and prev_fuel = fuel_type
      and mileage_at_fill - prev_km between 30 and 1200
      and liters_filled > 0
  ),
  agg as (
    select fuel_type, sum(km) / nullif(sum(liters), 0) as kmpl,
           count(*) as n, max(date) as last_at
    from seg group by fuel_type
    having sum(km) / nullif(sum(liters), 0) between 4 and 30
  )
  insert into public.vehicle_fuel_calibration
    (vehicle_id, user_id, fuel_type, kmpl, samples, last_fill_at, updated_at)
  select _vehicle_id, v_user, fuel_type, round(kmpl, 2), n, last_at, now() from agg
  on conflict (vehicle_id, fuel_type) do update
    set kmpl = excluded.kmpl, samples = excluded.samples,
        last_fill_at = excluded.last_fill_at, updated_at = now();
end $$;

-- Recalcula tudo com os dados já existentes
do $$
declare r record;
begin
  for r in select distinct vehicle_id from public.fuel_logs where vehicle_id is not null loop
    perform public.recompute_fuel_calibration(r.vehicle_id);
  end loop;
end $$;

-- Índices que faltavam
create index if not exists fuel_logs_vehicle_mileage_idx on public.fuel_logs (vehicle_id, mileage_at_fill);
create index if not exists fuel_logs_user_date_idx on public.fuel_logs (user_id, date desc);
create index if not exists trips_user_start_idx on public.trips (user_id, start_time desc);
create index if not exists tracker_events_vehicle_type_idx on public.tracker_events (vehicle_id, type, occurred_at desc);