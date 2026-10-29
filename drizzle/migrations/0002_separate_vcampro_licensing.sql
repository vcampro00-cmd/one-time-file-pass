CREATE TABLE public.license_operators (user_id uuid PRIMARY KEY);
GRANT SELECT ON public.license_operators TO authenticated;
GRANT ALL ON public.license_operators TO service_role;
ALTER TABLE public.license_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY operator_read_self ON public.license_operators FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.license_operators(user_id) SELECT DISTINCT owner_id FROM public.files ON CONFLICT DO NOTHING;

CREATE TABLE public.vcampro_licenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 code text NOT NULL UNIQUE,
 customer_label text NOT NULL DEFAULT '',
 environment text NOT NULL,
 expires_at timestamptz NOT NULL,
 revoked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vcampro_licenses TO authenticated;
GRANT UPDATE(revoked) ON public.vcampro_licenses TO authenticated;
GRANT ALL ON public.vcampro_licenses TO service_role;
ALTER TABLE public.vcampro_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY operator_licenses_read ON public.vcampro_licenses FOR SELECT TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.license_operators o WHERE o.user_id = auth.uid()));
CREATE POLICY operator_licenses_insert ON public.vcampro_licenses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.license_operators o WHERE o.user_id = auth.uid()));
CREATE POLICY operator_licenses_update ON public.vcampro_licenses FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.license_operators o WHERE o.user_id = auth.uid())) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.vcampro_license_payments (
 session_id text NOT NULL,
 environment text NOT NULL,
 license_id uuid NOT NULL REFERENCES public.vcampro_licenses(id),
 plan text NOT NULL,
 amount integer NOT NULL,
 currency text NOT NULL DEFAULT 'eur',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id, environment)
);
GRANT SELECT ON public.vcampro_license_payments TO authenticated;
GRANT ALL ON public.vcampro_license_payments TO service_role;
ALTER TABLE public.vcampro_license_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY operator_payments_read ON public.vcampro_license_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.vcampro_licenses l WHERE l.id = license_id AND l.owner_id = auth.uid()));

CREATE FUNCTION public.fulfill_vcampro_license(p_session text, p_env text, p_plan text, p_code text, p_license uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.vcampro_licenses; days integer; price integer; operator_id uuid;
BEGIN
 IF p_env NOT IN ('sandbox','live') OR p_plan NOT IN ('week','month') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 IF p_code !~ '^VC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' THEN RAISE EXCEPTION 'Invalid code'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_env || ':' || p_session, 0));
 SELECT v.* INTO l FROM public.vcampro_license_payments p JOIN public.vcampro_licenses v ON v.id = p.license_id WHERE p.session_id = p_session AND p.environment = p_env;
 IF FOUND THEN RETURN jsonb_build_object('code',l.code,'expiresAt',l.expires_at,'revoked',l.revoked); END IF;
 days := CASE WHEN p_plan = 'week' THEN 7 ELSE 30 END;
 price := CASE WHEN p_plan = 'week' THEN 1500 ELSE 6000 END;
 IF p_license IS NULL THEN
  SELECT user_id INTO operator_id FROM public.license_operators ORDER BY user_id LIMIT 1;
  IF operator_id IS NULL THEN RAISE EXCEPTION 'No operator'; END IF;
  INSERT INTO public.vcampro_licenses(owner_id,code,environment,expires_at) VALUES(operator_id,p_code,p_env,now() + make_interval(days => days)) RETURNING * INTO l;
 ELSE
  SELECT * INTO l FROM public.vcampro_licenses WHERE id = p_license AND environment = p_env FOR UPDATE;
  IF NOT FOUND OR l.revoked THEN RAISE EXCEPTION 'License unavailable'; END IF;
  UPDATE public.vcampro_licenses SET expires_at = greatest(now(),expires_at) + make_interval(days => days) WHERE id = l.id RETURNING * INTO l;
 END IF;
 INSERT INTO public.vcampro_license_payments(session_id,environment,license_id,plan,amount) VALUES(p_session,p_env,l.id,p_plan,price);
 RETURN jsonb_build_object('code',l.code,'expiresAt',l.expires_at,'revoked',l.revoked);
END $$;
REVOKE ALL ON FUNCTION public.fulfill_vcampro_license(text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_vcampro_license(text,text,text,text,uuid) TO service_role;