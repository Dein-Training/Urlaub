-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Update: Position "Rezeption" + Positionswechsel Thomas
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Rezeption in die Bereichszuordnung aufnehmen ───────────────
-- Rezeption hat keine eigene Teamleitung: zuständig sind damit
-- automatisch nur Praxisleitung, Geschäftsleitung und Administratoren.
CREATE OR REPLACE FUNCTION public.pos_bereich(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'tl_physio'  THEN 'physio'  WHEN 'physiotherapeut' THEN 'physio'
    WHEN 'tl_ergo'    THEN 'ergo'    WHEN 'ergotherapeut'   THEN 'ergo'
    WHEN 'tl_logo'    THEN 'logo'    WHEN 'logopaede'       THEN 'logo'
    WHEN 'tl_podo'    THEN 'podo'    WHEN 'podologe'        THEN 'podo'
    WHEN 'tl_trainer' THEN 'trainer' WHEN 'trainer'         THEN 'trainer'
    WHEN 'rezeption'  THEN 'rezeption'
    ELSE NULL END;
$$;

-- ─── 2. Thomas Keilig: Teamleitung Trainer mit Administratorrechten ─
UPDATE public.profiles
SET position   = 'tl_trainer',
    role       = 'admin',
    geschlecht = 'm'
WHERE email = 'thomas.keilig@tz-westlausitz.de';

-- ─── 3. Kontrolle ──────────────────────────────────────────────────
SELECT vorname, nachname, role AS berechtigung, position, geschlecht,
       public.pos_scope(position)   AS reichweite,
       public.pos_bereich(position) AS bereich
FROM public.profiles ORDER BY nachname, vorname;
