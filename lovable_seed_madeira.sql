-- Madeira is an additional destination outside the 50-city European seed.
-- Run after lovable_catalog_setup.sql and before the Madeira candidate batches.
-- The coordinates are the representative centre used for island-wide discovery;
-- they are not a claim that Madeira's attractions are located at this point.

INSERT INTO public.catalog_cities
  (slug,name,country,country_code,latitude,longitude,market_rank,search_radius_km,is_launch_city,is_active)
VALUES
  ('madeira-pt','Madeira','Portugal','PT',32.7220,-16.9500,NULL,45,false,true)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,
  country=EXCLUDED.country,
  country_code=EXCLUDED.country_code,
  latitude=EXCLUDED.latitude,
  longitude=EXCLUDED.longitude,
  search_radius_km=EXCLUDED.search_radius_km,
  is_active=true,
  updated_at=now();

SELECT slug,name,country,latitude,longitude,is_active
FROM public.catalog_cities
WHERE slug='madeira-pt';
