-- Dayflow HRMS — additive migration
-- Adds the missing UPDATE/DELETE storage policies for the `employee-files`
-- bucket. 0001_init.sql only granted SELECT and INSERT, so a user's own
-- session client could never overwrite or delete their own file — RLS
-- silently denied it (no matching policy = default deny). This blocked
-- avatar re-uploads from cleaning up the previous file (see
-- src/app/dashboard/profile/actions.ts's uploadAvatarAction, which now
-- works around it with the service-role client) and will block any future
-- document-upload feature the same way.
--
-- Safe to re-run: drops before creating, same pattern as 0001_init.sql.

drop policy if exists "employee_files_update_own_or_admin" on storage.objects;
create policy "employee_files_update_own_or_admin"
  on storage.objects for update
  using (bucket_id = 'employee-files' and (owner = auth.uid() or is_admin()))
  with check (bucket_id = 'employee-files' and (owner = auth.uid() or is_admin()));

drop policy if exists "employee_files_delete_own_or_admin" on storage.objects;
create policy "employee_files_delete_own_or_admin"
  on storage.objects for delete
  using (bucket_id = 'employee-files' and (owner = auth.uid() or is_admin()));
