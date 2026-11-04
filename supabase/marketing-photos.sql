-- Run once in this project's Supabase SQL Editor. Re-running is safe.
-- Creates only the advertising photo library; existing company_data is untouched.
begin;
create table if not exists public.marketing_photos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('Утеплення','Ламінат і підлога','Фарби та оздоблення','Наші об’єкти','Інше')),
  description text not null default '' check (char_length(description) <= 2000),
  original_path text not null unique,
  thumbnail_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  bytes integer not null check (bytes > 0 and bytes <= 15728640),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (original_path like user_id::text || '/' || id::text || '/original.%'),
  check (thumbnail_path = user_id::text || '/' || id::text || '/thumbnail.jpg')
);
create index if not exists marketing_photos_user_created on public.marketing_photos(user_id, created_at desc, id desc);
alter table public.marketing_photos enable row level security;
revoke all on public.marketing_photos from anon;
grant select, insert, update, delete on public.marketing_photos to authenticated;
drop policy if exists marketing_photos_own_select on public.marketing_photos;
create policy marketing_photos_own_select on public.marketing_photos for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists marketing_photos_own_insert on public.marketing_photos;
create policy marketing_photos_own_insert on public.marketing_photos for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists marketing_photos_own_update on public.marketing_photos;
create policy marketing_photos_own_update on public.marketing_photos for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists marketing_photos_own_delete on public.marketing_photos;
create policy marketing_photos_own_delete on public.marketing_photos for delete to authenticated using (user_id = (select auth.uid()));
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('marketing-photos','marketing-photos',false,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false, file_size_limit=15728640, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists marketing_photos_files_select on storage.objects;
create policy marketing_photos_files_select on storage.objects for select to authenticated using (bucket_id='marketing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists marketing_photos_files_insert on storage.objects;
create policy marketing_photos_files_insert on storage.objects for insert to authenticated with check (bucket_id='marketing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists marketing_photos_files_delete on storage.objects;
create policy marketing_photos_files_delete on storage.objects for delete to authenticated using (bucket_id='marketing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists marketing_photos_files_update on storage.objects;
create policy marketing_photos_files_update on storage.objects for update to authenticated using (bucket_id='marketing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='marketing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
notify pgrst, 'reload schema';
commit;
