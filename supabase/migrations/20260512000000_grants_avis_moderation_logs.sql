-- Portail admin : lecture / insert des logs modération avis (évite « permission denied for table avis_moderation_logs »).

grant select, insert on public.avis_moderation_logs to authenticated;
grant all on public.avis_moderation_logs to service_role;
