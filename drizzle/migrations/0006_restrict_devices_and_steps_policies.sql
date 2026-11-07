DROP POLICY IF EXISTS "Owner deletes devices" ON public.devices;
DROP POLICY IF EXISTS "Owner reads devices" ON public.devices;
DROP POLICY IF EXISTS "Owner updates devices" ON public.devices;
CREATE POLICY "Operators delete devices" ON public.devices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators read devices" ON public.devices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators update devices" ON public.devices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.download_operators o WHERE o.user_id = auth.uid()));
DROP POLICY IF EXISTS customer_steps_public_read ON public.customer_steps;
CREATE POLICY customer_steps_public_read ON public.customer_steps FOR SELECT TO anon, authenticated
  USING (id = true);