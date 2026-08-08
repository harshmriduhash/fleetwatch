import { useWorkspace } from "@/hooks/useFleet";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];

/**
 * Role-based access control.
 *
 * The database is the source of truth — every table is protected by RLS and the
 * review/role triggers reject unauthorised writes. These helpers exist so the UI
 * doesn't offer actions that would be rejected server-side.
 */
export const PERMISSIONS = {
  owner: [
    "agent:create",
    "agent:edit",
    "agent:delete",
    "sla:manage",
    "canary:manage",
    "incident:respond",
    "postmortem:write",
    "postmortem:review",
    "postmortem:publish",
    "workspace:manage",
    "members:manage",
    "keys:view",
  ],
  admin: [
    "agent:create",
    "agent:edit",
    "agent:delete",
    "sla:manage",
    "canary:manage",
    "incident:respond",
    "postmortem:write",
    "postmortem:review",
    "postmortem:publish",
    "members:manage",
    "keys:view",
  ],
  member: ["incident:respond", "postmortem:write"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number];

export function useRole() {
  const { data, isLoading } = useWorkspace();
  const role = (data?.role ?? null) as Role | null;

  const can = (permission: Permission) =>
    !!role && (PERMISSIONS[role] as readonly string[]).includes(permission);

  return {
    role,
    loading: isLoading,
    can,
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
    workspaceId: data?.workspace.id,
    workspace: data?.workspace ?? null,
  };
}
