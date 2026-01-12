-- Fix update_updated_at_column function to include SET search_path = public
-- This addresses SUPA_function_search_path_mutable and cache_migration_missing_search_path warnings

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;