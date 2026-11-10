ALTER TABLE public.files ADD COLUMN model text NOT NULL DEFAULT 'all' CHECK (model IN ('all','7','8'));
GRANT UPDATE ON public.files TO authenticated;
CREATE POLICY "own files update" ON public.files FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());