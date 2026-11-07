ALTER TABLE public.access_codes ADD COLUMN reseller boolean NOT NULL DEFAULT false;
ALTER TABLE public.code_purchases ADD COLUMN reseller boolean NOT NULL DEFAULT false;
ALTER TABLE public.devices ADD COLUMN reseller boolean NOT NULL DEFAULT false;