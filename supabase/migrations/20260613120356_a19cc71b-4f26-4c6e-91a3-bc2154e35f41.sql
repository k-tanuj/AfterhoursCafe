
CREATE POLICY "polaroids public read" ON storage.objects FOR SELECT USING (bucket_id = 'memory-polaroids');
CREATE POLICY "polaroids user upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memory-polaroids' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "polaroids user delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'memory-polaroids' AND (storage.foldername(name))[1] = auth.uid()::text);
