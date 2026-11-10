ALTER TABLE public.access_codes ADD COLUMN model text CHECK (model IN ('7', '8'));
ALTER TABLE public.devices ADD COLUMN access_code_id uuid REFERENCES public.access_codes(id) ON DELETE SET NULL;
CREATE INDEX devices_access_code_id_idx ON public.devices(access_code_id);
UPDATE public.access_codes c SET model = '8' WHERE EXISTS (SELECT 1 FROM public.access_code_files cf JOIN public.files f ON f.id = cf.file_id WHERE cf.code_id = c.id AND f.model = '8') AND NOT EXISTS (SELECT 1 FROM public.access_code_files cf JOIN public.files f ON f.id = cf.file_id WHERE cf.code_id = c.id AND f.model = '7');