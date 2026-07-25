CREATE TABLE public.favorite_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'pin',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_places TO authenticated;
GRANT ALL ON public.favorite_places TO service_role;
ALTER TABLE public.favorite_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorite places" ON public.favorite_places FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_favorite_places_updated_at BEFORE UPDATE ON public.favorite_places FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();