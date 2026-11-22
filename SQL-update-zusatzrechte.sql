-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Zusatzberechtigungen + Regeln je Bereich
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Zusatzberechtigungen ───────────────────────────────────────
-- Erlaubt es, einzelnen Personen (z. B. der Buchhaltung) Einblick oder
-- Bearbeitungsrecht für bestimmte Gruppen zu geben — unabhängig von ihrer Position.
CREATE TABLE IF NOT EXISTS public.zusatzrechte (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ziel_typ        TEXT NOT NULL CHECK (ziel_typ IN ('alle','leitung','sparte','bereich')),
  ziel_wert       TEXT,                       -- Sparte bzw. Bereich; bei alle/leitung leer
  darf_bearbeiten BOOLEAN NOT NULL DEFAULT false,
  notiz           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ziel_typ, ziel_wert)
);

CREATE INDEX IF NOT EXISTS idx_zr_user ON public.zusatzrechte(user_id);

ALTER TABLE public.zusatzrechte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zr_select" ON public.zusatzrechte;
CREATE POLICY "zr_select" ON public.zusatzrechte
  FOR SELECT TO authenticated USING (true);

-- Vergeben dürfen nur Administratoren und die Geschäftsleitung
DROP POLICY IF EXISTS "zr_write" ON public.zusatzrechte;
CREATE POLICY "zr_write" ON public.zusatzrechte
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
                 AND (p.role='admin' OR public.pos_scope(p.position)='alle')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
                 AND (p.role='admin' OR public.pos_scope(p.position)='alle')));

-- ─── 2. Trifft ein Zusatzrecht auf die Zielperson zu? ──────────────
CREATE OR REPLACE FUNCTION public.zusatzrecht_trifft(
  p_actor UUID, p_ziel UUID, p_nur_bearbeiten BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE ziel public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO ziel FROM public.profiles WHERE id = p_ziel;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.zusatzrechte z
    WHERE z.user_id = p_actor
      AND (NOT p_nur_bearbeiten OR z.darf_bearbeiten)
      AND (
        z.ziel_typ = 'alle'
        OR (z.ziel_typ = 'leitung'
            AND public.pos_scope(ziel.position) IN ('alle','sparte','bereich'))
        OR (z.ziel_typ = 'sparte'  AND public.pos_sparte(ziel.position)  = z.ziel_wert)
        OR (z.ziel_typ = 'bereich' AND public.pos_bereich(ziel.position) = z.ziel_wert)
      ));
END; $$;

-- ─── 3. Sehen und Bearbeiten getrennt prüfen ───────────────────────
CREATE OR REPLACE FUNCTION public.darf_verwalten(target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE ich public.profiles%ROWTYPE; ziel public.profiles%ROWTYPE; sc TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF auth.uid() = target_id THEN RETURN TRUE; END IF;

  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF ich.role = 'admin' THEN RETURN TRUE; END IF;

  sc := public.pos_scope(ich.position);
  IF sc = 'alle' THEN RETURN TRUE; END IF;

  SELECT * INTO ziel FROM public.profiles WHERE id = target_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF sc = 'sparte'
     AND public.pos_sparte(ich.position) IS NOT NULL
     AND public.pos_sparte(ziel.position) = public.pos_sparte(ich.position) THEN
    RETURN TRUE;
  END IF;

  IF sc = 'bereich'
     AND public.pos_bereich(ich.position) IS NOT NULL
     AND public.pos_bereich(ziel.position) = public.pos_bereich(ich.position) THEN
    RETURN TRUE;
  END IF;

  -- Zusatzberechtigung mit Bearbeitungsrecht
  RETURN public.zusatzrecht_trifft(auth.uid(), target_id, true);
END; $$;

-- Nur-Lesen-Recht: alles aus darf_verwalten plus reine Leserechte
CREATE OR REPLACE FUNCTION public.darf_sehen(target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  IF public.darf_verwalten(target_id) THEN RETURN TRUE; END IF;
  RETURN public.zusatzrecht_trifft(auth.uid(), target_id, false);
END; $$;

-- ─── 4. Leserichtlinien auf darf_sehen umstellen ───────────────────
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated USING (public.darf_sehen(id));

DROP POLICY IF EXISTS "entries_select" ON public.entries;
CREATE POLICY "entries_select" ON public.entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_sehen(user_id));

DROP POLICY IF EXISTS "ue_select" ON public.ueberstunden_antraege;
CREATE POLICY "ue_select" ON public.ueberstunden_antraege
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_sehen(user_id));

DROP POLICY IF EXISTS "jk_select" ON public.jahreskonten;
CREATE POLICY "jk_select" ON public.jahreskonten
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_sehen(user_id));

DROP POLICY IF EXISTS "uek_select" ON public.ueberstunden_konto;
CREATE POLICY "uek_select" ON public.ueberstunden_konto
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_sehen(user_id));

-- ─── 5. Regeln je Geltungsbereich ──────────────────────────────────
-- Bisher gab es genau eine Zeile. Jetzt kann es je Sparte und je Bereich
-- eigene Regeln geben; fehlt eine, gilt die nächsthöhere Ebene.
ALTER TABLE public.einstellungen DROP CONSTRAINT IF EXISTS einstellungen_pkey CASCADE;
ALTER TABLE public.einstellungen DROP CONSTRAINT IF EXISTS einstellungen_id_check;
ALTER TABLE public.einstellungen
  ADD COLUMN IF NOT EXISTS geltung TEXT;

UPDATE public.einstellungen SET geltung = 'global' WHERE geltung IS NULL;

ALTER TABLE public.einstellungen ALTER COLUMN geltung SET NOT NULL;
ALTER TABLE public.einstellungen ALTER COLUMN id DROP DEFAULT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='einstellungen_geltung_key') THEN
    ALTER TABLE public.einstellungen ADD CONSTRAINT einstellungen_geltung_key UNIQUE (geltung);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='einstellungen_pkey') THEN
    ALTER TABLE public.einstellungen ADD PRIMARY KEY (geltung);
  END IF;
END $$;

-- Ändern darf: Administrator und Geschäftsleitung überall,
-- Sparten-/Teamleitung nur den eigenen Geltungsbereich.
CREATE OR REPLACE FUNCTION public.darf_regeln(p_geltung TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE ich public.profiles%ROWTYPE; sc TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT * INTO ich FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF ich.role = 'admin' THEN RETURN TRUE; END IF;

  sc := public.pos_scope(ich.position);
  IF sc = 'alle' THEN RETURN TRUE; END IF;
  IF sc = 'sparte'  THEN RETURN p_geltung = 'sparte:'  || public.pos_sparte(ich.position); END IF;
  IF sc = 'bereich' THEN RETURN p_geltung = 'bereich:' || public.pos_bereich(ich.position); END IF;
  RETURN FALSE;
END; $$;

DROP POLICY IF EXISTS "eins_update" ON public.einstellungen;
DROP POLICY IF EXISTS "eins_write"  ON public.einstellungen;
CREATE POLICY "eins_write" ON public.einstellungen
  FOR ALL TO authenticated
  USING (public.darf_regeln(geltung))
  WITH CHECK (public.darf_regeln(geltung));

-- ─── 6. Gültige Regel für eine Person ermitteln ────────────────────
-- Reihenfolge: Ausnahme am Mitarbeiter → Bereich → Sparte → global
CREATE OR REPLACE FUNCTION public.regeln_fuer(p_user UUID)
RETURNS TABLE(frist_tag INT, frist_monat INT, mindest_prozent INT,
              ueberstunden_erlaubt BOOLEAN, quelle TEXT)
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE pr public.profiles%ROWTYPE; e public.einstellungen%ROWTYPE;
BEGIN
  SELECT * INTO pr FROM public.profiles WHERE id = p_user;

  SELECT * INTO e FROM public.einstellungen
   WHERE geltung = 'bereich:' || public.pos_bereich(pr.position);
  IF NOT FOUND THEN
    SELECT * INTO e FROM public.einstellungen
     WHERE geltung = 'sparte:' || public.pos_sparte(pr.position);
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO e FROM public.einstellungen WHERE geltung = 'global';
  END IF;

  frist_tag            := COALESCE(e.frist_tag, 30);
  frist_monat          := COALESCE(e.frist_monat, 11);
  mindest_prozent      := COALESCE(pr.mindest_prozent, e.mindest_prozent, 90);
  ueberstunden_erlaubt := COALESCE(pr.ueberstunden_erlaubt, e.ueberstunden_erlaubt, true);
  quelle               := COALESCE(e.geltung, 'global');
  RETURN NEXT;
END; $$;

-- ─── 7. Kontrolle ──────────────────────────────────────────────────
SELECT geltung, frist_tag, frist_monat, mindest_prozent, ueberstunden_erlaubt
FROM public.einstellungen ORDER BY geltung;

SELECT p.vorname, z.ziel_typ, z.ziel_wert, z.darf_bearbeiten
FROM public.zusatzrechte z JOIN public.profiles p ON p.id = z.user_id;
