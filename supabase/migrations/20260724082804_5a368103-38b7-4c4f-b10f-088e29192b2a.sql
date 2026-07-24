
CREATE POLICY "users read own fuel receipts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fuel-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own fuel receipts" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fuel-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own fuel receipts" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fuel-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
