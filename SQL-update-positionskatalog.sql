-- ═══════════════════════════════════════════════════════════════════
-- Urlaubsplaner – Positionen als pflegbarer Katalog
-- Im Supabase SQL-Editor ausführen
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Tabelle ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.positionen (
  key          TEXT PRIMARY KEY,
  label_m      TEXT NOT NULL,
  label_w      TEXT,
  label_d      TEXT,
  sparte       TEXT NOT NULL CHECK (sparte IN ('leitung','therapie','pflege')),
  bereich      TEXT,
  bereich_name TEXT,
  scope        TEXT NOT NULL DEFAULT 'selbst'
               CHECK (scope IN ('alle','sparte','bereich','selbst')),
  sortierung   INT  NOT NULL DEFAULT 900,
  geschuetzt   BOOLEAN NOT NULL DEFAULT false,   -- darf nicht gelöscht werden
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.positionen ENABLE ROW LEVEL SECURITY;

-- Lesen darf jeder Angemeldete (die App braucht die Bezeichnungen)
DROP POLICY IF EXISTS "pos_select" ON public.positionen;
CREATE POLICY "pos_select" ON public.positionen
  FOR SELECT TO authenticated USING (true);

-- Ändern ausschließlich Administratoren
DROP POLICY IF EXISTS "pos_write" ON public.positionen;
CREATE POLICY "pos_write" ON public.positionen
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK(EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Geschützte Positionen nicht löschbar (Geschäftsleitung, Praxis-/Pflegedienstleitung)
CREATE OR REPLACE FUNCTION public.schuetze_positionen()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.geschuetzt THEN
    RAISE EXCEPTION 'Die Position "%" ist fest hinterlegt und kann nicht gelöscht werden', OLD.label_m;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE position = OLD.key) THEN
    RAISE EXCEPTION 'Diese Position ist noch Mitarbeitern zugewiesen';
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_schuetze_positionen ON public.positionen;
CREATE TRIGGER trg_schuetze_positionen
  BEFORE DELETE ON public.positionen
  FOR EACH ROW EXECUTE FUNCTION public.schuetze_positionen();

-- ─── 2. Katalog befüllen ───────────────────────────────────────────
INSERT INTO public.positionen
  (key,label_m,label_w,label_d,sparte,bereich,scope,sortierung,geschuetzt) VALUES
-- Leitung & Verwaltung
('geschaeftsleitung','Geschäftsleitung','Geschäftsleitung','Geschäftsleitung','leitung',NULL,'alle',10,true),
('buchhaltung','Buchhaltung','Buchhaltung','Buchhaltung','leitung','buchhaltung','selbst',20,false),
('hausmeister','Hausmeister','Hausmeisterin','Hausmeister/in','leitung','hausmeister','selbst',30,false),
('taxi','Fahrdienst / Taxi','Fahrdienst / Taxi','Fahrdienst / Taxi','leitung','taxi','selbst',40,false),
-- Therapie
('praxisleitung','Praxisleitung','Praxisleitung','Praxisleitung','therapie',NULL,'sparte',100,true),
('tl_physio_koenigsbrueck','Teamleitung Physiotherapie Königsbrück','Teamleitung Physiotherapie Königsbrück','Teamleitung Physiotherapie Königsbrück','therapie','physio_koenigsbrueck','bereich',110,false),
('tl_physio_pulsnitz','Teamleitung Physiotherapie Pulsnitz','Teamleitung Physiotherapie Pulsnitz','Teamleitung Physiotherapie Pulsnitz','therapie','physio_pulsnitz','bereich',111,false),
('tl_physio_kamenz','Teamleitung Physiotherapie Kamenz','Teamleitung Physiotherapie Kamenz','Teamleitung Physiotherapie Kamenz','therapie','physio_kamenz','bereich',112,false),
('tl_ergo','Teamleitung Ergotherapie','Teamleitung Ergotherapie','Teamleitung Ergotherapie','therapie','ergo','bereich',120,false),
('tl_logo','Teamleitung Logopädie','Teamleitung Logopädie','Teamleitung Logopädie','therapie','logo','bereich',121,false),
('tl_podo','Teamleitung Podologie','Teamleitung Podologie','Teamleitung Podologie','therapie','podo','bereich',122,false),
('tl_trainer','Teamleitung Trainer','Teamleitung Trainer','Teamleitung Trainer','therapie','trainer','bereich',123,false),
('physio_koenigsbrueck','Physiotherapeut Königsbrück','Physiotherapeutin Königsbrück','Physiotherapeut/in Königsbrück','therapie','physio_koenigsbrueck','selbst',130,false),
('physio_pulsnitz','Physiotherapeut Pulsnitz','Physiotherapeutin Pulsnitz','Physiotherapeut/in Pulsnitz','therapie','physio_pulsnitz','selbst',131,false),
('physio_kamenz','Physiotherapeut Kamenz','Physiotherapeutin Kamenz','Physiotherapeut/in Kamenz','therapie','physio_kamenz','selbst',132,false),
('ergotherapeut','Ergotherapeut','Ergotherapeutin','Ergotherapeut/in','therapie','ergo','selbst',140,false),
('logopaede','Logopäde','Logopädin','Logopäde/Logopädin','therapie','logo','selbst',141,false),
('podologe','Podologe','Podologin','Podologe/Podologin','therapie','podo','selbst',142,false),
('trainer','Trainer','Trainerin','Trainer/in','therapie','trainer','selbst',143,false),
('rezeption','Rezeption','Rezeption','Rezeption','therapie','rezeption','selbst',150,false),
('reinigungskraft','Reinigungskraft','Reinigungskraft','Reinigungskraft','therapie','reinigung','selbst',160,false),
-- Pflege
('pflegedienstleitung','Pflegedienstleitung','Pflegedienstleitung','Pflegedienstleitung','pflege',NULL,'sparte',200,true),
('tl_ambulant','Teamleitung Ambulante Pflege','Teamleitung Ambulante Pflege','Teamleitung Ambulante Pflege','pflege','ambulant','bereich',210,false),
('tl_wg_koenigsbrueck','Teamleitung WG Königsbrück','Teamleitung WG Königsbrück','Teamleitung WG Königsbrück','pflege','wg_koenigsbrueck','bereich',211,false),
('tl_wg_kamenz','Teamleitung WG Kamenz','Teamleitung WG Kamenz','Teamleitung WG Kamenz','pflege','wg_kamenz','bereich',212,false),
('tl_ip_kamenz','Teamleitung Intensivpflege Kamenz','Teamleitung Intensivpflege Kamenz','Teamleitung Intensivpflege Kamenz','pflege','ip_kamenz','bereich',213,false),
('pflege_ambulant','Pflegekraft Ambulante Pflege','Pflegekraft Ambulante Pflege','Pflegekraft Ambulante Pflege','pflege','ambulant','selbst',220,false),
('pflege_wg_koenigsbrueck','Pflegekraft WG Königsbrück','Pflegekraft WG Königsbrück','Pflegekraft WG Königsbrück','pflege','wg_koenigsbrueck','selbst',221,false),
('pflege_wg_kamenz','Pflegekraft WG Kamenz','Pflegekraft WG Kamenz','Pflegekraft WG Kamenz','pflege','wg_kamenz','selbst',222,false),
('pflege_ip_kamenz','Pflegekraft Intensivpflege Kamenz','Pflegekraft Intensivpflege Kamenz','Pflegekraft Intensivpflege Kamenz','pflege','ip_kamenz','selbst',223,false),
('haushaltspflege','Haushaltspflege','Haushaltspflege','Haushaltspflege','pflege','haushalt','selbst',230,false)
ON CONFLICT (key) DO UPDATE SET
  label_m=EXCLUDED.label_m, label_w=EXCLUDED.label_w, label_d=EXCLUDED.label_d,
  sparte=EXCLUDED.sparte, bereich=EXCLUDED.bereich, scope=EXCLUDED.scope,
  sortierung=EXCLUDED.sortierung, geschuetzt=EXCLUDED.geschuetzt;

-- ─── 3. Entfernte Bereiche umziehen ────────────────────────────────
-- WG Ohorn und Intensivpflege Steina entfallen. Betroffene Mitarbeiter
-- werden auf die Ambulante Pflege gesetzt und sollten anschließend im
-- Mitarbeiter-Dialog dem richtigen Bereich zugewiesen werden.
UPDATE public.profiles SET position='tl_ambulant'
 WHERE position IN ('tl_wg_ohorn','tl_ip_steina');
UPDATE public.profiles SET position='pflege_ambulant'
 WHERE position IN ('pflege_wg_ohorn','pflege_ip_steina');

DELETE FROM public.positionen
 WHERE key IN ('tl_wg_ohorn','tl_ip_steina','pflege_wg_ohorn','pflege_ip_steina');

-- ─── 4. Prüffunktionen lesen jetzt aus der Tabelle ─────────────────
-- Sie sind dadurch STABLE statt IMMUTABLE (sie greifen auf Daten zu).
CREATE OR REPLACE FUNCTION public.pos_sparte(p TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT sparte FROM public.positionen WHERE key = p;
$$;

CREATE OR REPLACE FUNCTION public.pos_bereich(p TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT bereich FROM public.positionen WHERE key = p;
$$;

CREATE OR REPLACE FUNCTION public.pos_scope(p TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((SELECT scope FROM public.positionen WHERE key = p), 'selbst');
$$;

-- ─── 5. Kontrolle ──────────────────────────────────────────────────
SELECT sparte, key, label_m, scope, bereich, sortierung
FROM public.positionen ORDER BY sparte, sortierung;

SELECT vorname, nachname, position,
       public.pos_sparte(position) AS sparte,
       public.pos_scope(position)  AS reichweite
FROM public.profiles ORDER BY nachname;
