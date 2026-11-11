-- Restore only this change set; preserve every item and unrelated field.
BEGIN;
LOCK TABLE public.catalog_items IN SHARE ROW EXCLUSIVE MODE;
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.catalog_subcategory_changes a LEFT JOIN public.catalog_items i ON i.id=a.item_id
  WHERE a.change_set='catalogue-subcategories-20261111-v1' AND (i.id IS NULL OR i.canonical_category IS DISTINCT FROM a.new_category
   OR i.subcategory_key IS DISTINCT FROM a.new_key)) THEN
  RAISE EXCEPTION 'Subsequent classification changes found; inspect before rollback.';
 END IF;
END $guard$;
UPDATE public.catalog_items i SET canonical_category=a.old_category,subcategory_key=a.old_key,updated_at=now()
FROM public.catalog_subcategory_changes a WHERE a.change_set='catalogue-subcategories-20261111-v1' AND i.id=a.item_id;
DELETE FROM public.catalog_subcategory_changes WHERE change_set='catalogue-subcategories-20261111-v1';
COMMIT;
