-- PROJ-8: Schema-Updates für Supabase-Migration
-- Dieses SQL im Supabase Dashboard SQL Editor ausführen.
-- Setzt voraus, dass 20260402_001_initial_schema.sql (PROJ-6) bereits ausgeführt wurde.

-- 1. projekte.owner_id: NOT NULL entfernen (Projekte gehören allen authentifizierten Nutzern)
ALTER TABLE public.projekte ALTER COLUMN owner_id DROP NOT NULL;

-- 2. RLS auf projekte: alle authentifizierten Nutzer dürfen alle Projekte lesen/schreiben
DROP POLICY IF EXISTS "Kalkulator CRUD eigene Projekte" ON public.projekte;
DROP POLICY IF EXISTS "Teamleiter liest Team-Projekte" ON public.projekte;

CREATE POLICY "Authenticated users can select projekte"
  ON public.projekte FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projekte"
  ON public.projekte FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projekte"
  ON public.projekte FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projekte"
  ON public.projekte FOR DELETE
  USING (auth.role() = 'authenticated');

-- 3. positionen: bki_preise-Spalte hinzufügen (war in PROJ-6 Schema nicht vorhanden)
ALTER TABLE public.positionen ADD COLUMN IF NOT EXISTS bki_preise JSONB;

-- 4. positionen: bki_konfidenz CHECK-Constraint entfernen (schätzung ist bereits erlaubt, aber
--    wir entfernen den Constraint damit zukünftige Werte nicht brechen)
ALTER TABLE public.positionen DROP CONSTRAINT IF EXISTS positionen_bki_konfidenz_check;

-- 5. RLS auf positionen: alle authentifizierten Nutzer
DROP POLICY IF EXISTS "Kalkulator CRUD eigene Positionen" ON public.positionen;
DROP POLICY IF EXISTS "Teamleiter liest Team-Positionen" ON public.positionen;

CREATE POLICY "Authenticated users can select positionen"
  ON public.positionen FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert positionen"
  ON public.positionen FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update positionen"
  ON public.positionen FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete positionen"
  ON public.positionen FOR DELETE
  USING (auth.role() = 'authenticated');

-- 6. angebote-Tabelle erstellen (neu, existiert noch nicht)
CREATE TABLE IF NOT EXISTS public.angebote (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id    UUID NOT NULL REFERENCES public.projekte(id) ON DELETE CASCADE,
  projektname   TEXT,
  kundenname    TEXT,
  kundenadresse TEXT,
  objektnummer  TEXT,
  angebotsnummer TEXT,
  datum         DATE,
  ohne_preis    TEXT,
  exported_at   TIMESTAMPTZ
);

ALTER TABLE public.angebote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select angebote"
  ON public.angebote FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert angebote"
  ON public.angebote FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update angebote"
  ON public.angebote FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete angebote"
  ON public.angebote FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_angebote_projekt_id ON public.angebote(projekt_id);
