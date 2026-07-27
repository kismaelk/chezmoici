-- Authors may update note/commentaire on their own avis, but identity fields
-- (annonce_id, auteur_id, created_at) must stay immutable. Without this, a user
-- with any valid review can UPDATE annonce_id to retarget it onto an unrelated
-- listing and bypass the contact-gated INSERT policy.

create or replace function public.protect_avis_identity_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
    or current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.annonce_id is distinct from old.annonce_id
      or new.auteur_id is distinct from old.auteur_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Review identity fields are immutable'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_avis_identity_fields on public.avis;
create trigger protect_avis_identity_fields
  before update on public.avis
  for each row
  execute function public.protect_avis_identity_fields();

revoke all on function public.protect_avis_identity_fields() from public;

-- Keep author UPDATE scoped to ownership; identity immutability is enforced above.
drop policy if exists "avis: modification par auteur" on public.avis;
create policy "avis: modification par auteur"
  on public.avis for update
  using (auth.uid() = auteur_id and public.jwt_user_not_suspended())
  with check (auth.uid() = auteur_id and public.jwt_user_not_suspended());
