-- ============================================================
-- gis-sync — Scheduled execution via pg_cron
-- Run this in the Supabase SQL Editor AFTER deploying the Edge Function.
-- ============================================================

-- 1. Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Allow cron to invoke Edge Functions via the internal edge function URL.
--    The CRON_SECRET must match the Edge Function secret of the same name.
DO $$
BEGIN
  -- Create a cron job that calls gis-sync every hour.
  -- Replace '<PROJECT-REF>' with your Supabase project ref
  -- and '<CRON_SECRET>' with the secret set in Edge Function secrets.
  PERFORM cron.schedule(
    'gis-sync-hourly',
    '0 * * * *',                                   -- every hour at minute 0
    $ cron $
      SELECT content
      FROM extensions.http_request(
        'https://<PROJECT-REF>.functions.supabase.co/gis-sync',
        'POST',
        '{"headers":{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}}'::jsonb
      );
    $ cron $
  );


EXCEPTION WHEN OTHERS THEN 
  RAISE NOTICE 'cron schedule skipped: %', SQLERRM;
END $$;

-- View active jobs:
-- SELECT jobid, schedule, command, active FROM cron.job;

-- Unschedule (to stop):
-- SELECT cron.unschedule('gis-sync-hourly');