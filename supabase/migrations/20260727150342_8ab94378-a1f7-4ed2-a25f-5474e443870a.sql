CREATE TYPE public.vehicle_document_type AS ENUM ('crlv','seguro','ipva','licenciamento','inspecao','outro');

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  photo_path text,
  license_number text,
  license_category text,
  license_expires_on date,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drivers" ON public.drivers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid,
  type public.vehicle_document_type NOT NULL DEFAULT 'outro',
  title text,
  number text,
  issuer text,
  amount numeric,
  expires_on date,
  notes text,
  file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_documents TO authenticated;
GRANT ALL ON public.vehicle_documents TO service_role;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vehicle documents" ON public.vehicle_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_vehicle_documents_updated_at BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vehicle_documents_user_expires ON public.vehicle_documents (user_id, expires_on);

ALTER TABLE public.trips ADD COLUMN driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE POLICY "own vehicle docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own vehicle docs insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own vehicle docs update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own vehicle docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-docs' AND auth.uid()::text = (storage.foldername(name))[1]);