CREATE TABLE public.download_operators (user_id uuid PRIMARY KEY);
GRANT SELECT ON public.download_operators TO authenticated;
GRANT ALL ON public.download_operators TO service_role;
ALTER TABLE public.download_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY download_operator_self_read ON public.download_operators FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.download_operators(user_id) SELECT DISTINCT owner_id FROM public.files ON CONFLICT DO NOTHING;
CREATE TABLE public.customer_steps (
 id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
 dns boolean NOT NULL DEFAULT false,
 link boolean NOT NULL DEFAULT false,
 files boolean NOT NULL DEFAULT false,
 warranty boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.customer_steps TO anon, authenticated;
GRANT INSERT, UPDATE ON public.customer_steps TO authenticated;
GRANT ALL ON public.customer_steps TO service_role;
ALTER TABLE public.customer_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_steps_public_read ON public.customer_steps FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY customer_steps_owner_insert ON public.customer_steps FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));
CREATE POLICY customer_steps_owner_update ON public.customer_steps FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));