CREATE TABLE public.code_purchases (
  session_id text PRIMARY KEY,
  environment text NOT NULL,
  code text NOT NULL,
  code_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.code_purchases TO service_role;
ALTER TABLE public.code_purchases ENABLE ROW LEVEL SECURITY;