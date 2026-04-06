-- PROJ-8: Supabase-Migration — Tabellen für Projekte, Positionen und Angebote
-- Dieses SQL im Supabase Dashboard SQL Editor ausführen.

-- 1. Tabelle: projekte
CREATE TABLE IF NOT EXISTS projekte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in-bearbeitung',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projekte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select projekte"
  ON projekte FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projekte"
  ON projekte FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projekte"
  ON projekte FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projekte"
  ON projekte FOR DELETE
  USING (auth.role() = 'authenticated');

-- 2. Tabelle: positionen
CREATE TABLE IF NOT EXISTS positionen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  positionsnummer TEXT,
  kurzbeschreibung TEXT,
  langbeschreibung TEXT,
  menge TEXT,
  einheit TEXT,
  einheitspreis NUMERIC DEFAULT 0,
  bki_vorschlag NUMERIC,
  bki_preise JSONB,
  bki_konfidenz TEXT,
  bki_positionsnummer TEXT,
  bki_beschreibung TEXT,
  sort_order INT DEFAULT 0
);

ALTER TABLE positionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select positionen"
  ON positionen FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert positionen"
  ON positionen FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update positionen"
  ON positionen FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete positionen"
  ON positionen FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_positionen_projekt_id ON positionen(projekt_id);

-- 3. Tabelle: angebote
CREATE TABLE IF NOT EXISTS angebote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  projektname TEXT,
  kundenname TEXT,
  kundenadresse TEXT,
  objektnummer TEXT,
  angebotsnummer TEXT,
  datum DATE,
  ohne_preis TEXT,
  exported_at TIMESTAMPTZ
);

ALTER TABLE angebote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select angebote"
  ON angebote FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert angebote"
  ON angebote FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update angebote"
  ON angebote FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete angebote"
  ON angebote FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_angebote_projekt_id ON angebote(projekt_id);
