-- Switch project_financials to SECURITY INVOKER so the view runs under the
-- caller's identity. Without this, Supabase's API route the view through the
-- definer (postgres) and bypasses RLS — flagged by the security advisor.
-- Postgres 15+ supports security_invoker on views.

alter view public.project_financials set (security_invoker = on);
