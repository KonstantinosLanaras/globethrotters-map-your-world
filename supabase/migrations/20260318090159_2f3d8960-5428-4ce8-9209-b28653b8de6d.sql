
CREATE OR REPLACE FUNCTION public.compute_authenticity_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  score INTEGER := 0;
  depth INTEGER := 0;
  photo_count INTEGER := 0;
  tag_count INTEGER := 0;
BEGIN
  score := 20;
  tag_count := COALESCE(array_length(NEW.tags, 1), 0);

  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 10 THEN
    score := score + 15; depth := depth + 20;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 50 THEN
    score := score + 10; depth := depth + 20;
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 150 THEN
    score := score + 10; depth := depth + 20;
  END IF;

  IF tag_count > 0 THEN score := score + 10; depth := depth + 10; END IF;
  IF tag_count > 2 THEN score := score + 5; depth := depth + 10; END IF;

  IF NEW.rating > 0 THEN score := score + 10; END IF;
  IF NEW.date_visited IS NOT NULL THEN score := score + 10; END IF;

  SELECT count(*) INTO photo_count FROM public.photos WHERE place_id = NEW.id;
  IF photo_count > 0 THEN score := score + 10; depth := depth + 20; END IF;

  IF score > 100 THEN score := 100; END IF;
  IF depth > 100 THEN depth := 100; END IF;

  INSERT INTO public.review_scores (place_id, user_id, authenticity_score, depth_score, has_photos, has_detailed_notes, has_specific_tags)
  VALUES (
    NEW.id, NEW.user_id, score, depth,
    photo_count > 0,
    COALESCE(NEW.notes IS NOT NULL AND length(NEW.notes) > 50, false),
    tag_count > 2
  )
  ON CONFLICT (place_id, user_id) DO UPDATE SET
    authenticity_score = score, depth_score = depth,
    has_photos = photo_count > 0,
    has_detailed_notes = COALESCE(NEW.notes IS NOT NULL AND length(NEW.notes) > 50, false),
    has_specific_tags = tag_count > 2,
    updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS compute_authenticity_on_place ON public.places;
CREATE TRIGGER compute_authenticity_on_place
  AFTER INSERT OR UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_authenticity_score();
