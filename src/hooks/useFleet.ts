import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Agent = Database["public"]["Tables"]["agents"]["Row"];
export type Incident = Database["public"]["Tables"]["incidents"]["Row"];
export type SlaConfig = Database["public"]["Tables"]["sla_configs"]["Row"];
export type Canary = Database["public"]["Tables"]["canaries"]["Row"];
export type IncidentEvent = Database["public"]["Tables"]["incident_events"]["Row"];
export type Span = Database["public"]["Tables"]["spans"]["Row"];
export type Rollup = Database["public"]["Tables"]["metric_rollups"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export function useWorkspace(enabled = true) {
  return useQuery({
    queryKey: ["workspace"],
    enabled,
    queryFn: async () => {
      const { data: member, error: mErr } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!member) return null;

      const { data: ws, error: wErr } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", member.workspace_id)
        .maybeSingle();
      if (wErr) throw wErr;
      return ws ? { workspace: ws as Workspace, role: member.role } : null;
    },
  });
}

export function useAgents(workspaceId?: string) {
  return useQuery({
    queryKey: ["agents", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
}

export function useIncidents(agentIds: string[], enabled = true) {
  return useQuery({
    queryKey: ["incidents", agentIds],
    enabled: enabled && agentIds.length > 0,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .in("agent_id", agentIds)
        .order("opened_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Incident[];
    },
  });
}
