ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'combustivel';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fuel_log_id uuid REFERENCES public.fuel_logs(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_fuel_log_id_key ON public.expenses(fuel_log_id) WHERE fuel_log_id IS NOT NULL;