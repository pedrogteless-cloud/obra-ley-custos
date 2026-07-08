
create policy "comprovantes_select" on storage.objects for select to anon, authenticated using (bucket_id = 'comprovantes');
create policy "comprovantes_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'comprovantes');
create policy "comprovantes_update" on storage.objects for update to anon, authenticated using (bucket_id = 'comprovantes');
create policy "comprovantes_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'comprovantes');
