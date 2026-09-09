create or replace function public.recompute_fuel_calibration(_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_user uuid;
begin
  select user_id into v_user from public.vehicles where id = _vehicle_id;
  if v_user is null then return; end if;

  with f as (
    select fuel_type,
           liters_filled,
           mileage_at_fill as km,
           is_full_tank,
           date,
           count(*) filter (where is_full_tank)
             over (partition by fuel_type order by mileage_at_fill
                   rows between unbounded preceding and current row) as grp
    from public.fuel_logs
    where vehicle_id = _vehicle_id
      and mileage_at_fill > 0
      and liters_filled > 0
  ),
  closes as (
    select fuel_type, grp, km, date from f where is_full_tank
  ),
  seg as (
    select c.fuel_type,
           c.date,
           (c.km - p.km) as km,
           (select coalesce(sum(x.liters_filled), 0)
              from f x
             where x.fuel_type = c.fuel_type
               and x.km > p.km
               and x.km <= c.km) as liters
    from closes c
    join closes p on p.fuel_type = c.fuel_type and p.grp = c.grp - 1
  ),
  ok as (
    select * from seg
    where km between 30 and 1200 and liters > 0
  ),
  agg as (
    select fuel_type, sum(km) / nullif(sum(liters), 0) as kmpl,
           count(*) as n, max(date) as last_at
    from ok group by fuel_type
    having sum(km) / nullif(sum(liters), 0) between 4 and 30
  )
  insert into public.vehicle_fuel_calibration
    (vehicle_id, user_id, fuel_type, kmpl, samples, last_fill_at, updated_at)
  select _vehicle_id, v_user, fuel_type, round(kmpl, 2), n, last_at, now() from agg
  on conflict (vehicle_id, fuel_type) do update
    set kmpl = excluded.kmpl, samples = excluded.samples,
        last_fill_at = excluded.last_fill_at, updated_at = now();

  -- Sem base suficiente, a calibração antiga não deve continuar valendo.
  delete from public.vehicle_fuel_calibration c
   where c.vehicle_id = _vehicle_id
     and not exists (
       select 1 from public.fuel_logs l
        where l.vehicle_id = _vehicle_id
          and l.fuel_type = c.fuel_type
          and l.is_full_tank
     );
end $function$;

do $$
declare v uuid;
begin
  for v in select distinct vehicle_id from public.fuel_logs where vehicle_id is not null loop
    perform public.recompute_fuel_calibration(v);
  end loop;
end $$;