
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_lesson_unlocked(uuid, uuid) from public, anon;
revoke execute on function public.upsert_lesson_progress(uuid, numeric, integer) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
