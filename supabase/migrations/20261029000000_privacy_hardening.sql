-- Privacy hardening for OTwo.
--
-- 1. Doctor advice notes are local-only. They are never uploaded, so the
--    cloud column that claimed to hold client-side encrypted notes is removed.
-- 2. The unused encrypted "sync_snapshots" table is removed. Local progress is
--    not backed up to the cloud.
-- 3. Audit logs become server-managed. Clients may read their own rows but can
--    no longer insert arbitrary audit entries.

ALTER TABLE public.onboarding_responses
  DROP COLUMN IF EXISTS doctor_recommendations_encrypted;

DROP TABLE IF EXISTS public.sync_snapshots;

DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;

REVOKE INSERT ON public.audit_logs FROM anon, authenticated;

COMMENT ON TABLE public.onboarding_responses IS
  'Non-sensitive onboarding inputs used only to rebuild a local routine plan. Doctor advice notes are never stored here.';

COMMENT ON TABLE public.audit_logs IS
  'Server-managed security events only. Clients can read their own rows and cannot insert or modify them.';
