-- Account deletion (App Store / Play requirement) and data export.

-- Deletes the caller's auth user; every table cascades. SECURITY DEFINER because
-- auth.users is not writable by the authenticated role.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Everything stored about the caller, as JSON (RLS applies: security invoker).
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user_id', auth.uid(),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = auth.uid()),
    'settings', (select s.data from public.user_settings s where s.user_id = auth.uid()),
    'plan_enrollments', coalesce((select jsonb_agg(to_jsonb(e) order by e.started_at) from public.plan_enrollments e where e.user_id = auth.uid()), '[]'::jsonb),
    'workout_sessions', coalesce((select jsonb_agg(to_jsonb(w) order by w.started_at) from public.workout_sessions w where w.user_id = auth.uid()), '[]'::jsonb),
    'workout_sets', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at) from public.workout_sets x where x.user_id = auth.uid()), '[]'::jsonb)
  );
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
