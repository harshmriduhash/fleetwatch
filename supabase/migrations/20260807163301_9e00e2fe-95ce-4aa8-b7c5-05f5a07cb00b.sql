
GRANT EXECUTE ON FUNCTION public.is_member(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid,uuid,public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.incident_workspace(uuid) TO authenticated;
