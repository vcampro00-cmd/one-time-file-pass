ALTER TABLE public.resellers ADD COLUMN username text UNIQUE;
ALTER TABLE public.resellers ADD COLUMN password_hash text;

CREATE TABLE public.reseller_sessions (
  token_hash text PRIMARY KEY,
  reseller_id uuid NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reseller_sessions TO service_role;
ALTER TABLE public.reseller_sessions ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.consume_reseller_credit_for(_reseller uuid, _token text, _label text, _expires timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE left_credits integer;
BEGIN
  UPDATE public.resellers SET credits = credits - 1
    WHERE id = _reseller AND active AND credits > 0
    RETURNING credits INTO left_credits;
  IF left_credits IS NULL THEN RETURN -1; END IF;
  INSERT INTO public.reseller_links(token, reseller_id, label, expires_at) VALUES (_token, _reseller, _label, _expires);
  RETURN left_credits;
END $$;
REVOKE ALL ON FUNCTION public.consume_reseller_credit_for(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_reseller_credit_for(uuid, text, text, timestamptz) TO service_role;