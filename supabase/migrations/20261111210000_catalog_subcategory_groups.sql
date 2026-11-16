-- Add canonical browse groups without overwriting source subtypes or item IDs.
BEGIN;
CREATE TABLE IF NOT EXISTS public.catalog_subcategories (
 canonical_category text NOT NULL CHECK(canonical_category IN ('food','nature','culture','nightlife')),
 key text NOT NULL,
 label text NOT NULL,
 sort_order integer NOT NULL,
 aliases text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(canonical_category,key)
);
INSERT INTO public.catalog_subcategories(canonical_category,key,label,sort_order,aliases) VALUES
('food','restaurants','Restaurants',1,ARRAY['cava and sandwich bar','fine dining','mountain hut','pizzeria','restaurant','restaurants','tapas bar']::text[]),
('food','street_food','Street food',2,ARRAY['fast food','sandwich shop','snack bar','street food']::text[]),
('food','cafes_bakeries','Cafés & bakeries',3,ARRAY['bakery','bakery and cafe','cafe','cafes bakeries','ice cream shop','pastry shop','patisserie']::text[]),
('food','food_markets','Food markets',4,ARRAY['food court','food hall','food market','food markets']::text[]),
('food','food_experiences','Food experiences',5,ARRAY['cooking class','food experiences','food tour','neighbourhood food','producer experience','tasting','winery']::text[]),
('nature','hikes_trails','Hikes & trails',1,ARRAY['classified hiking route','hikes trails','hiking route','hillside walk','park walk','riverside walk','trail','trailhead','urban hike','walking route']::text[]),
('nature','parks_gardens','Parks & gardens',2,ARRAY['botanical garden','garden','laurel forest','park','parks gardens','urban forest']::text[]),
('nature','beaches_lakes','Beaches & lakes',3,ARRAY['beach','beaches lakes','black sand beach','lake','lake and park','lake park','natural pool','swimming spot']::text[]),
('nature','sunsets_views','Sunsets & views',4,ARRAY['seasonal night viewpoint','sunrise experience','sunset experience','sunsets views','timed viewpoint experience','viewpoint']::text[]),
('nature','natural_sites','Natural sites',5,ARRAY['cave','geological formation','gorge','natural feature','natural sites','nature reserve','rock formation','waterfall']::text[]),
('culture','museums_galleries','Museums & galleries',1,ARRAY['archaeological and culture centre','art gallery','art museum','contemporary art','contemporary culture centre','cultural centre','garden and museum','museum','museums galleries']::text[]),
('culture','historic_sites','Historic sites',2,ARRAY['castle','cathedral','church','historic house and architecture','historic site','historic sites','historical landmark','monument','palace']::text[]),
('culture','neighbourhoods_walks','Neighbourhoods & walks',3,ARRAY['architecture walking route','art walking route','historical walk','neighbourhood experience','neighbourhood walk','neighbourhoods walks','town walking route']::text[]),
('nightlife','bars','Bars',1,ARRAY['apres ski bar','bar','bar and restaurant','bars','cocktail bar','historic bar','hotel bar','poncha bar','rum bar','sunset bar','wine bar']::text[]),
('nightlife','clubs','Clubs',2,ARRAY['club','club and cultural venue','clubs','electronic music club','nightclub','open air club','open air nightclub']::text[]),
('nightlife','live_music','Live music',3,ARRAY['club and live music','concert venue','fado venue','jazz club','listening bar','live music','live music venue','music bar']::text[]),
('nightlife','rooftops','Rooftops',4,ARRAY['rooftop bar','rooftops']::text[]),
('nightlife','nightlife_areas','Nightlife areas',5,ARRAY['neighbourhood evening','nightlife area experience','nightlife areas','nightlife district','timed nightlife experience']::text[])
ON CONFLICT(canonical_category,key) DO UPDATE SET label=EXCLUDED.label,sort_order=EXCLUDED.sort_order,aliases=EXCLUDED.aliases;
ALTER TABLE public.catalog_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read catalog subcategories" ON public.catalog_subcategories;
CREATE POLICY "Public can read catalog subcategories" ON public.catalog_subcategories FOR SELECT TO anon,authenticated USING(true);
GRANT SELECT ON public.catalog_subcategories TO anon,authenticated;
GRANT ALL ON public.catalog_subcategories TO service_role;

ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS subcategory_key text;
DO $migration$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='catalog_items_subcategory_group_fkey' AND conrelid='public.catalog_items'::regclass) THEN
  ALTER TABLE public.catalog_items ADD CONSTRAINT catalog_items_subcategory_group_fkey
   FOREIGN KEY(canonical_category,subcategory_key) REFERENCES public.catalog_subcategories(canonical_category,key);
 END IF;
 IF to_regclass('public.catalog_review_queue') IS NOT NULL THEN
  ALTER TABLE public.catalog_review_queue ADD COLUMN IF NOT EXISTS subcategory_key text;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='catalog_review_queue_subcategory_group_fkey' AND conrelid='public.catalog_review_queue'::regclass) THEN
   ALTER TABLE public.catalog_review_queue ADD CONSTRAINT catalog_review_queue_subcategory_group_fkey
    FOREIGN KEY(canonical_category,subcategory_key) REFERENCES public.catalog_subcategories(canonical_category,key);
  END IF;
 END IF;
END $migration$;
CREATE INDEX IF NOT EXISTS catalog_items_city_subcategory_group_idx
 ON public.catalog_items(city_id,canonical_category,subcategory_key) WHERE is_active;

CREATE OR REPLACE FUNCTION public.catalog_normalize_subtype(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog,public AS $$
 SELECT trim(regexp_replace(translate(lower(value),'áàâãäåéèêëíìîïóòôõöúùûüçñ','aaaaaaeeeeiiiiooooouuuucn'),'[^a-z0-9]+',' ','g'))
$$;
CREATE OR REPLACE FUNCTION public.catalog_map_subcategory_group() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE should_map boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  should_map := NEW.subcategory_key IS NULL;
 ELSE
  should_map := (NEW.canonical_category IS DISTINCT FROM OLD.canonical_category OR NEW.subcategory IS DISTINCT FROM OLD.subcategory)
    AND (NEW.subcategory_key IS NULL OR NEW.subcategory_key IS NOT DISTINCT FROM OLD.subcategory_key);
 END IF;
 IF should_map THEN
  NEW.subcategory_key := (SELECT key FROM public.catalog_subcategories
    WHERE canonical_category=NEW.canonical_category
     AND public.catalog_normalize_subtype(NEW.subcategory)=ANY(aliases));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS catalog_items_map_subcategory_group ON public.catalog_items;
CREATE TRIGGER catalog_items_map_subcategory_group BEFORE INSERT OR UPDATE OF canonical_category,subcategory,subcategory_key
 ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.catalog_map_subcategory_group();
DO $migration$
BEGIN
 IF to_regclass('public.catalog_review_queue') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS catalog_review_queue_map_subcategory_group ON public.catalog_review_queue;
  CREATE TRIGGER catalog_review_queue_map_subcategory_group BEFORE INSERT OR UPDATE OF canonical_category,subcategory,subcategory_key
   ON public.catalog_review_queue FOR EACH ROW EXECUTE FUNCTION public.catalog_map_subcategory_group();
 END IF;
END $migration$;

CREATE TABLE IF NOT EXISTS public.catalog_subcategory_changes (
 change_set text NOT NULL,
 item_id uuid NOT NULL,
 old_category text NOT NULL,
 old_key text,
 new_category text NOT NULL,
 new_key text,
 method text NOT NULL,
 reason text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(change_set,item_id)
);
ALTER TABLE public.catalog_subcategory_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_subcategory_changes FROM anon,authenticated;
GRANT ALL ON public.catalog_subcategory_changes TO service_role;
CREATE OR REPLACE VIEW public.catalog_items_needing_subcategory
WITH(security_invoker=true) AS
 SELECT id,city_id,name,canonical_category,subcategory
 FROM public.catalog_items WHERE subcategory_key IS NULL;
GRANT SELECT ON public.catalog_items_needing_subcategory TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
