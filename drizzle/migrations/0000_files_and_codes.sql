CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own files select" ON public.files FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own files insert" ON public.files FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own files delete" ON public.files FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  code_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own codes select" ON public.access_codes FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own codes insert" ON public.access_codes FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own codes delete" ON public.access_codes FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.access_code_files (
  code_id uuid NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, file_id)
);
GRANT SELECT, INSERT, DELETE ON public.access_code_files TO authenticated;
GRANT ALL ON public.access_code_files TO service_role;
ALTER TABLE public.access_code_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own code files" ON public.access_code_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.access_codes c WHERE c.id = code_id AND c.owner_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.access_codes c WHERE c.id = code_id AND c.owner_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.files f WHERE f.id = file_id AND f.owner_id = auth.uid())
  );

CREATE POLICY "owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);