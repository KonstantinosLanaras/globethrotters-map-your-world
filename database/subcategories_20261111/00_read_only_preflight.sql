-- Run as project owner/service role to include inactive and coverage records.
SELECT count(*) AS all_catalogue_rows,
 count(*) FILTER(WHERE is_active) AS active_rows,
 count(*) FILTER(WHERE quality_tier='coverage') AS coverage_rows
FROM public.catalog_items;
SELECT canonical_category,subcategory,count(*) FROM public.catalog_items GROUP BY 1,2 ORDER BY 1,2;
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('catalog_items','catalog_review_queue')
 AND column_name IN ('canonical_category','subcategory','subcategory_key','content_kind','metadata');
