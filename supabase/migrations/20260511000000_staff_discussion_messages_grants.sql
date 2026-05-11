-- Droits table salon staff (évite « permission denied for table staff_discussion_messages » côté API).

grant select, insert on public.staff_discussion_messages to authenticated;
grant all on public.staff_discussion_messages to service_role;
