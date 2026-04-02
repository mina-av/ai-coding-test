-- ============================================================
-- PROJ-6: Initial Schema — teams, profiles, projekte, positionen
-- ============================================================

-- ------------------------------------------------------------
-- teams
-- ------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;

-- Jeder authentifizierte User darf sein Team lesen
create policy "Eigenes Team lesen"
  on public.teams for select
  using (
    id in (
      select team_id from public.profiles where id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- profiles (ein Eintrag pro Supabase-Auth-User)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  rolle      text not null check (rolle in ('kalkulator', 'teamleiter')),
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- User liest eigenes Profil
create policy "Eigenes Profil lesen"
  on public.profiles for select
  using (id = auth.uid());

-- Teamleiter liest alle Profile seines Teams
create policy "Teamleiter liest Team-Profile"
  on public.profiles for select
  using (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rolle = 'teamleiter'
    )
  );

-- Profil wird automatisch beim ersten Login angelegt (via Trigger unten)
create policy "Eigenes Profil anlegen"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Eigenes Profil aktualisieren"
  on public.profiles for update
  using (id = auth.uid());

-- ------------------------------------------------------------
-- Trigger: Profil automatisch anlegen wenn User sich registriert
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, rolle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data->>'rolle', 'kalkulator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- projekte
-- ------------------------------------------------------------
create table if not exists public.projekte (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  status     text not null default 'in-bearbeitung'
               check (status in ('in-bearbeitung', 'abgeschlossen')),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.projekte (owner_id);
create index on public.projekte (team_id);

alter table public.projekte enable row level security;

-- Kalkulator: voller Zugriff auf eigene Projekte
create policy "Kalkulator CRUD eigene Projekte"
  on public.projekte for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Teamleiter: alle Projekte des Teams lesen
create policy "Teamleiter liest Team-Projekte"
  on public.projekte for select
  using (
    team_id in (
      select team_id from public.profiles where id = auth.uid()
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and rolle = 'teamleiter'
    )
  );

-- updated_at automatisch setzen
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_projekte_updated_at
  before update on public.projekte
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- positionen
-- ------------------------------------------------------------
create table if not exists public.positionen (
  id                  uuid primary key default gen_random_uuid(),
  projekt_id          uuid not null references public.projekte(id) on delete cascade,
  positionsnummer     text not null default '',
  kurzbeschreibung    text not null default '',
  langbeschreibung    text,
  menge               text not null default '',
  einheit             text not null default '',
  einheitspreis       numeric(12, 2) not null default 0,
  bki_vorschlag       numeric(12, 2),
  bki_konfidenz       text check (bki_konfidenz in ('hoch', 'mittel', 'niedrig', 'schätzung')),
  bki_positionsnummer text,
  bki_beschreibung    text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

create index on public.positionen (projekt_id);

alter table public.positionen enable row level security;

-- Kalkulator: Zugriff über eigene Projekte
create policy "Kalkulator CRUD eigene Positionen"
  on public.positionen for all
  using (
    projekt_id in (
      select id from public.projekte where owner_id = auth.uid()
    )
  )
  with check (
    projekt_id in (
      select id from public.projekte where owner_id = auth.uid()
    )
  );

-- Teamleiter: Positionen der Team-Projekte lesen
create policy "Teamleiter liest Team-Positionen"
  on public.positionen for select
  using (
    projekt_id in (
      select p.id from public.projekte p
      join public.profiles pr on pr.id = auth.uid()
      where p.team_id = pr.team_id and pr.rolle = 'teamleiter'
    )
  );
