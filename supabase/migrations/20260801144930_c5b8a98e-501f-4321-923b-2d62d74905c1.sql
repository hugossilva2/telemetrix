CREATE POLICY "shared vehicle trips read"
ON public.trips
FOR SELECT
TO authenticated
USING (vehicle_id IS NOT NULL AND public.can_view_vehicle(vehicle_id));