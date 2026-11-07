CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  udid text NOT NULL,
  product text,
  ios_version text,
  serial text,
  label text,
  ipa_path text,
  app_name text,
  bundle_id text,
  app_version text,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner updates devices" ON public.devices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Owner deletes devices" ON public.devices FOR DELETE TO authenticated USING (true);