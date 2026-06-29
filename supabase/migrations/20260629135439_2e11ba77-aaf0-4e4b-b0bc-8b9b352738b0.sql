
ALTER VIEW public.pdf_reaction_counts SET (security_invoker = true);
ALTER VIEW public.pdf_view_counts SET (security_invoker = true);
ALTER VIEW public.contributor_stats SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.set_pdf_reaction(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_pdf_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pdf_reaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_pdf_view(uuid) TO authenticated;
