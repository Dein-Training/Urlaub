-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Jahreskonten, Übertrag und Abgabefrist
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Konto je Mitarbeiter UND Jahr ──────────────────────────────
-- Bisher lagen Urlaubsanspruch und Resturlaub als Einzelwerte im Profil und
-- galten dadurch für jedes Jahr gleichzeitig. Ab jetzt pro Jahr getrennt.
CREATE TABLE IF NOT EXISTS public.jahreskonten (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jahr        INT  NOT NULL CHECK (jahr BETWEEN 2000 AND 2100),
  urlaubstage NUMERIC(5,1) NOT NULL DEFAULT 0,
  resturlaub  NUMERIC(5,1) NOT NULL DEFAULT 0,   -- Übertrag aus dem Vorjahr
  notiz       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, jahr)
);

ALTER TABLE public.jahreskonten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jk_select" ON public.jahreskonten;
CREATE POLICY "jk_select" ON public.jahreskonten
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.darf_verwalten(user_id));

-- Ändern darf nur, wer den Mitarbeiter führt — und nie sich selbst
DROP POLICY IF EXISTS "jk_write" ON public.jahreskonten;
CREATE POLICY "jk_write" ON public.jahreskonten
  FOR ALL TO authenticated
  USING (public.darf_verwalten(user_id) AND user_id <> auth.uid())
  WITH CHECK (public.darf_verwalten(user_id) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "jk_admin" ON public.jahreskonten;
CREATE POLICY "jk_admin" ON public.jahreskonten
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 2. Bestand übernehmen ─────────────────────────────────────────
-- Das laufende und das kommende Jahr aus den bisherigen Profilwerten füllen.
INSERT INTO public.jahreskonten (user_id, jahr, urlaubstage, resturlaub)
SELECT id, EXTRACT(YEAR FROM CURRENT_DATE)::int,
       COALESCE(urlaubstage,0), COALESCE(resturlaub,0)
FROM public.profiles WHERE NOT pauschal
ON CONFLICT (user_id, jahr) DO NOTHING;

INSERT INTO public.jahreskonten (user_id, jahr, urlaubstage, resturlaub)
SELECT id, EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
       COALESCE(urlaubstage,0), 0
FROM public.profiles WHERE NOT pauschal
ON CONFLICT (user_id, jahr) DO NOTHING;

-- ─── 3. Übertrag ins Folgejahr berechnen ───────────────────────────
-- Nicht verbrauchter Urlaub eines Jahres wird zum Resturlaub des Folgejahres.
-- Überstundeneinträge zählen dabei nicht mit, sie belasten das Urlaubskonto nicht.
CREATE OR REPLACE FUNCTION public.uebertrag_berechnen(p_jahr INT)
RETURNS TABLE(mitarbeiter TEXT, verbraucht NUMERIC, anspruch NUMERIC, uebertrag NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r RECORD; genutzt NUMERIC; anspr NUMERIC; rest NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                 AND (role = 'admin' OR public.pos_scope(position) = 'alle')) THEN
    RAISE EXCEPTION 'Nur Administratoren sowie Geschäfts- und Praxisleitung dürfen den Übertrag berechnen';
  END IF;

  FOR r IN SELECT p.id, p.vorname, p.nachname,
                  COALESCE(k.urlaubstage,0) AS ut, COALESCE(k.resturlaub,0) AS ru
           FROM public.profiles p
           LEFT JOIN public.jahreskonten k ON k.user_id = p.id AND k.jahr = p_jahr
           WHERE NOT p.pauschal
  LOOP
    SELECT COALESCE(SUM(
      CASE WHEN e.type IN ('urlaub','resturlaub')
        THEN (LEAST(e.bis, make_date(p_jahr,12,31)) - GREATEST(e.von, make_date(p_jahr,1,1)) + 1)
        ELSE 0 END), 0)
      INTO genutzt
    FROM public.entries e
    WHERE e.user_id = r.id AND e.status = 'confirmed'
      AND e.von <= make_date(p_jahr,12,31) AND e.bis >= make_date(p_jahr,1,1);

    anspr := r.ut + r.ru;
    rest  := GREATEST(anspr - genutzt, 0);

    INSERT INTO public.jahreskonten (user_id, jahr, urlaubstage, resturlaub)
    VALUES (r.id, p_jahr + 1, r.ut, rest)
    ON CONFLICT (user_id, jahr) DO UPDATE SET resturlaub = EXCLUDED.resturlaub, updated_at = NOW();

    mitarbeiter := r.vorname || ' ' || COALESCE(r.nachname,'');
    verbraucht  := genutzt;
    anspruch    := anspr;
    uebertrag   := rest;
    RETURN NEXT;
  END LOOP;
END; $$;

-- HINWEIS: Die Kalendertage oben sind eine Näherung (ohne Wochenend-/Feiertagsabzug).
-- Die App rechnet exakt; der Übertrag dient als Vorschlag und ist danach editierbar.

-- ─── 4. Kontrolle ──────────────────────────────────────────────────
SELECT p.vorname, k.jahr, k.urlaubstage, k.resturlaub
FROM public.jahreskonten k JOIN public.profiles p ON p.id = k.user_id
ORDER BY p.nachname, k.jahr;
