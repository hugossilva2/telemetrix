-- Abastecimento: tanque cheio e tipo de combustível
alter table public.fuel_logs
  add column if not exists is_full_tank boolean not null default true,
  add column if not exists fuel_type text not null default 'gasolina'
    check (fuel_type in ('gasolina','etanol','misto'));

-- Calibração medida, por veículo e por combustível
create table if not exists public.vehicle_fuel_calibration (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  user_id uuid not null,
  fuel_type text not null check (fuel_type in ('gasolina','etanol','misto')),
  kmpl numeric not null check (kmpl > 0),
  samples integer not null default 0,
  last_fill_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, fuel_type)
);

grant select, insert, update, delete on public.vehicle_fuel_calibration to authenticated;
grant all on public.vehicle_fuel_calibration to service_role;

alter table public.vehicle_fuel_calibration enable row level security;

create policy "own calibration" on public.vehicle_fuel_calibration for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- km/L full-to-full, agregado por tipo de combustível
create or replace function public.recompute_fuel_calibration(_vehicle_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select user_id into v_user from public.vehicles where id = _vehicle_id;
  if v_user is null then return; end if;
  with fills as (
    select date, fuel_type, liters_filled, mileage_at_fill,
           lag(mileage_at_fill) over (order by mileage_at_fill) as prev_km
    from public.fuel_logs
    where vehicle_id = _vehicle_id and is_full_tank
  ),
  seg as (
    select fuel_type, (mileage_at_fill - prev_km) as km, liters_filled as liters, date
    from fills
    where prev_km is not null
      and mileage_at_fill - prev_km between 30 and 1200
      and liters_filled > 0
  ),
  agg as (
    select fuel_type,
           sum(km) / nullif(sum(liters), 0) as kmpl,
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

create or replace function public.on_fuel_log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_fuel_calibration(coalesce(new.vehicle_id, old.vehicle_id));
  return coalesce(new, old);
end $$;

drop trigger if exists trg_fuel_log_calibration on public.fuel_logs;
create trigger trg_fuel_log_calibration
after insert or update or delete on public.fuel_logs
for each row execute function public.on_fuel_log_change();

-- Viagem: separa estimativa de medição e registra a procedência do número
alter table public.trips
  add column if not exists fuel_liters_device numeric,
  add column if not exists fuel_kmpl_used numeric,
  add column if not exists fuel_source text
    check (fuel_source in ('calibrado','ficha','device','padrao'));

-- Mata o default enganoso de 10 km/L
alter table public.vehicles alter column avg_consumption_kmpl drop not null;
alter table public.vehicles alter column avg_consumption_kmpl drop default;
update public.vehicles set avg_consumption_kmpl = null where avg_consumption_kmpl = 10;