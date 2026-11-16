SELECT canonical_category,subcategory_key,count(*) FROM public.catalog_items GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) AS audited_updates FROM public.catalog_subcategory_changes WHERE change_set='catalogue-subcategories-20261111-v1';
SELECT id,name,canonical_category,subcategory FROM public.catalog_items WHERE subcategory_key IS NULL ORDER BY canonical_category,name;
