CREATE TABLE public.reseller_credit_purchases (
  session_id text PRIMARY KEY,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.reseller_credit_purchases TO service_role;
ALTER TABLE public.reseller_credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.add_reseller_credits(_session text, _reseller uuid, _qty integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.reseller_credit_purchases(session_id, reseller_id, credits) VALUES (_session, _reseller, _qty)
    ON CONFLICT (session_id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.resellers SET credits = credits + _qty WHERE id = _reseller;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.add_reseller_credits(text, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_reseller_credits(text, uuid, integer) TO service_role;