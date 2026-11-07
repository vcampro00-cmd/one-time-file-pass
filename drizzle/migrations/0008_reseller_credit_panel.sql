CREATE TABLE public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  access_key_hash text NOT NULL UNIQUE,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resellers TO authenticated;
GRANT ALL ON public.resellers TO service_role;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY resellers_operator_all ON public.resellers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));

CREATE TABLE public.reseller_links (
  token text PRIMARY KEY,
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  label text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reseller_links TO service_role;
ALTER TABLE public.reseller_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.devices ADD COLUMN reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL;

CREATE FUNCTION public.consume_reseller_credit(_key_hash text, _token text, _label text, _expires timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.resellers;
BEGIN
  UPDATE public.resellers SET credits = credits - 1
    WHERE access_key_hash = _key_hash AND active AND credits > 0
    RETURNING * INTO r;
  IF r.id IS NULL THEN RETURN -1; END IF;
  INSERT INTO public.reseller_links(token, reseller_id, label, expires_at) VALUES (_token, r.id, _label, _expires);
  RETURN r.credits;
END $$;
REVOKE ALL ON FUNCTION public.consume_reseller_credit(text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_reseller_credit(text, text, text, timestamptz) TO service_role;