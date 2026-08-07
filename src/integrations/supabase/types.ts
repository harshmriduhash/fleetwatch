export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          framework: string
          id: string
          last_seen_at: string | null
          name: string
          otel_service_name: string
          status: Database["public"]["Enums"]["agent_status"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          framework?: string
          id?: string
          last_seen_at?: string | null
          name: string
          otel_service_name: string
          status?: Database["public"]["Enums"]["agent_status"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          framework?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          otel_service_name?: string
          status?: Database["public"]["Enums"]["agent_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          target?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          target?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      canaries: {
        Row: {
          agent_id: string
          created_at: string
          endpoint_url: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_result: Database["public"]["Enums"]["canary_result"] | null
          last_run_at: string | null
          name: string
          payload: Json
          schedule_cron: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_result?: Database["public"]["Enums"]["canary_result"] | null
          last_run_at?: string | null
          name?: string
          payload?: Json
          schedule_cron?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_result?: Database["public"]["Enums"]["canary_result"] | null
          last_run_at?: string | null
          name?: string
          payload?: Json
          schedule_cron?: string
        }
        Relationships: [
          {
            foreignKeyName: "canaries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: Database["public"]["Enums"]["incident_event_type"]
          id: number
          incident_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: Database["public"]["Enums"]["incident_event_type"]
          id?: number
          incident_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: Database["public"]["Enums"]["incident_event_type"]
          id?: number
          incident_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_items: Json
          agent_id: string
          id: string
          opened_at: string
          postmortem_draft: string | null
          postmortem_final: string | null
          published: boolean
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          sla_config_id: string | null
          status: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_items?: Json
          agent_id: string
          id?: string
          opened_at?: string
          postmortem_draft?: string | null
          postmortem_final?: string | null
          published?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          sla_config_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_items?: Json
          agent_id?: string
          id?: string
          opened_at?: string
          postmortem_draft?: string | null
          postmortem_final?: string | null
          published?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          sla_config_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "sla_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_keys: {
        Row: {
          created_at: string
          id: string
          name: string
          revoked_at: string | null
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          revoked_at?: string | null
          token: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          revoked_at?: string | null
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_rollups: {
        Row: {
          agent_id: string
          id: number
          metric: Database["public"]["Enums"]["sla_metric"]
          sample_count: number
          value: number
          window_start: string
        }
        Insert: {
          agent_id: string
          id?: number
          metric: Database["public"]["Enums"]["sla_metric"]
          sample_count?: number
          value: number
          window_start: string
        }
        Update: {
          agent_id?: string
          id?: number
          metric?: Database["public"]["Enums"]["sla_metric"]
          sample_count?: number
          value?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_rollups_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      oncall_schedules: {
        Row: {
          created_at: string
          escalation_policy: Json
          id: string
          is_active: boolean
          name: string
          rotation_config: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          escalation_policy?: Json
          id?: string
          is_active?: boolean
          name?: string
          rotation_config?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          escalation_policy?: Json
          id?: string
          is_active?: boolean
          name?: string
          rotation_config?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oncall_schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      sla_configs: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          metric: Database["public"]["Enums"]["sla_metric"]
          threshold: number
          window_minutes: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          metric: Database["public"]["Enums"]["sla_metric"]
          threshold: number
          window_minutes?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metric?: Database["public"]["Enums"]["sla_metric"]
          threshold?: number
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      spans: {
        Row: {
          agent_id: string
          attributes: Json
          duration_ms: number
          id: number
          is_canary: boolean
          name: string
          payload: Json | null
          span_id: string
          started_at: string
          status_code: string
          trace_id: string
        }
        Insert: {
          agent_id: string
          attributes?: Json
          duration_ms?: number
          id?: number
          is_canary?: boolean
          name: string
          payload?: Json | null
          span_id: string
          started_at?: string
          status_code?: string
          trace_id: string
        }
        Update: {
          agent_id?: string
          attributes?: Json
          duration_ms?: number
          id?: number
          is_canary?: boolean
          name?: string
          payload?: Json | null
          span_id?: string
          started_at?: string
          status_code?: string
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spans_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          full_payload_capture: boolean
          id: string
          name: string
          plan: string
        }
        Insert: {
          created_at?: string
          created_by: string
          full_payload_capture?: boolean
          id?: string
          name: string
          plan?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          full_payload_capture?: boolean
          id?: string
          name?: string
          plan?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_workspace: { Args: { _agent_id: string }; Returns: string }
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      incident_workspace: { Args: { _incident_id: string }; Returns: string }
      is_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_status: "healthy" | "degraded" | "incident"
      app_role: "owner" | "admin" | "member"
      canary_result: "pass" | "fail"
      incident_event_type:
        | "breach_detected"
        | "paged"
        | "acknowledged"
        | "note"
        | "resolved"
        | "canary_failed"
        | "postmortem_drafted"
      incident_severity: "low" | "medium" | "high"
      incident_status: "open" | "acknowledged" | "resolved"
      sla_metric: "success_rate" | "p95_latency" | "error_rate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_status: ["healthy", "degraded", "incident"],
      app_role: ["owner", "admin", "member"],
      canary_result: ["pass", "fail"],
      incident_event_type: [
        "breach_detected",
        "paged",
        "acknowledged",
        "note",
        "resolved",
        "canary_failed",
        "postmortem_drafted",
      ],
      incident_severity: ["low", "medium", "high"],
      incident_status: ["open", "acknowledged", "resolved"],
      sla_metric: ["success_rate", "p95_latency", "error_rate"],
    },
  },
} as const
