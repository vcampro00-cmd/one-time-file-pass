import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_CUSTOMER_STEPS = { dns: false, link: false, files: false, warranty: false };
export type CustomerSteps = typeof DEFAULT_CUSTOMER_STEPS;
export type CustomerStep = keyof CustomerSteps;

export function resolveCustomerSteps(settings: Partial<CustomerSteps> | null): CustomerSteps {
  return { ...DEFAULT_CUSTOMER_STEPS, ...settings };
}

export const customerStepsQuery = queryOptions({
  queryKey: ["customer-steps"],
  queryFn: async () => {
    const { data, error } = await supabase.from("customer_steps").select("dns, link, files, warranty").eq("id", true).maybeSingle();
    if (error) throw error;
    return resolveCustomerSteps(data);
  },
  refetchInterval: 15000,
});