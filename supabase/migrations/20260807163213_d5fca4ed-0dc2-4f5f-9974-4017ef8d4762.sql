
CREATE TYPE public.app_role AS ENUM ('owner','admin','member');
CREATE TYPE public.agent_status AS ENUM ('healthy','degraded','incident');
CREATE TYPE public.sla_metric AS ENUM ('success_rate','p95_latency','error_rate');
CREATE TYPE public.incident_severity AS ENUM ('low','medium','high');
CREATE TYPE public.incident_status AS ENUM ('open','acknowledged','resolved');
CREATE TYPE public.incident_event_type AS ENUM ('breach_detected','paged','acknowledged','note','resolved','canary_failed','postmortem_drafted');
CREATE TYPE public.canary_result AS ENUM ('pass','fail');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  full_payload_capture boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  framework text NOT NULL DEFAULT 'unknown',
  otel_service_name text NOT NULL,
  status public.agent_status NOT NULL DEFAULT 'healthy',
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, otel_service_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  metric public.sla_metric NOT NULL,
  threshold numeric NOT NULL,
  window_minutes int NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_configs TO authenticated;
GRANT ALL ON public.sla_configs TO service_role;
ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.spans (
  id bigserial PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  trace_id text NOT NULL,
  span_id text NOT NULL,
  name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_ms int NOT NULL DEFAULT 0,
  status_code text NOT NULL DEFAULT 'OK',
  is_canary boolean NOT NULL DEFAULT false,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb
);
CREATE INDEX spans_agent_started_idx ON public.spans(agent_id, started_at DESC);
GRANT SELECT ON public.spans TO authenticated;
GRANT ALL ON public.spans TO service_role;
ALTER TABLE public.spans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.metric_rollups (
  id bigserial PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  metric public.sla_metric NOT NULL,
  value numeric NOT NULL,
  sample_count int NOT NULL DEFAULT 0,
  UNIQUE (agent_id, window_start, metric)
);
CREATE INDEX metric_rollups_agent_window_idx ON public.metric_rollups(agent_id, window_start DESC);
GRANT SELECT ON public.metric_rollups TO authenticated;
GRANT ALL ON public.metric_rollups TO service_role;
ALTER TABLE public.metric_rollups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.canaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Canary',
  endpoint_url text,
  schedule_cron text NOT NULL DEFAULT '*/15 * * * *',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_result public.canary_result,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canaries TO authenticated;
GRANT ALL ON public.canaries TO service_role;
ALTER TABLE public.canaries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  sla_config_id uuid REFERENCES public.sla_configs(id) ON DELETE SET NULL,
  title text NOT NULL,
  severity public.incident_severity NOT NULL DEFAULT 'medium',
  status public.incident_status NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  root_cause text,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  postmortem_draft text,
  postmortem_final text,
  published boolean NOT NULL DEFAULT false
);
CREATE INDEX incidents_agent_status_idx ON public.incidents(agent_id, status) WHERE status <> 'resolved';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.incident_events (
  id bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_type public.incident_event_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_events_incident_created_idx ON public.incident_events(incident_id, created_at);
GRANT SELECT, INSERT ON public.incident_events TO authenticated;
GRANT ALL ON public.incident_events TO service_role;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.oncall_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Primary rotation',
  rotation_config jsonb NOT NULL DEFAULT '{"responders":[],"rotation":"weekly"}'::jsonb,
  escalation_policy jsonb NOT NULL DEFAULT '{"escalate_after_minutes":10,"channels":["email"]}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oncall_schedules TO authenticated;
GRANT ALL ON public.oncall_schedules TO service_role;
ALTER TABLE public.oncall_schedules ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ingest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default key',
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingest_keys TO authenticated;
GRANT ALL ON public.ingest_keys TO service_role;
ALTER TABLE public.ingest_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  target text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_ws_created_idx ON public.audit_log(workspace_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id AND m.role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.agent_workspace(_agent_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.agents WHERE id = _agent_id;
$$;

CREATE OR REPLACE FUNCTION public.incident_workspace(_incident_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.workspace_id FROM public.incidents i JOIN public.agents a ON a.id = i.agent_id WHERE i.id = _incident_id;
$$;

CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT TO authenticated USING (public.is_member(id, auth.uid()));
CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE TO authenticated USING (public.has_workspace_role(id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE TO authenticated USING (public.has_workspace_role(id, auth.uid(), ARRAY['owner']::public.app_role[]));

CREATE POLICY "members_select" ON public.workspace_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members_insert" ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "members_update" ON public.workspace_members FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "members_delete" ON public.workspace_members FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "agents_select" ON public.agents FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "agents_insert" ON public.agents FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "agents_update" ON public.agents FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "agents_delete" ON public.agents FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "sla_select" ON public.sla_configs FOR SELECT TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));
CREATE POLICY "sla_insert" ON public.sla_configs FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "sla_update" ON public.sla_configs FOR UPDATE TO authenticated USING (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "sla_delete" ON public.sla_configs FOR DELETE TO authenticated USING (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "spans_select" ON public.spans FOR SELECT TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));
CREATE POLICY "rollups_select" ON public.metric_rollups FOR SELECT TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));

CREATE POLICY "canaries_select" ON public.canaries FOR SELECT TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));
CREATE POLICY "canaries_insert" ON public.canaries FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "canaries_update" ON public.canaries FOR UPDATE TO authenticated USING (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "canaries_delete" ON public.canaries FOR DELETE TO authenticated USING (public.has_workspace_role(public.agent_workspace(agent_id), auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "incidents_select" ON public.incidents FOR SELECT TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));
CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.is_member(public.agent_workspace(agent_id), auth.uid()));
CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE TO authenticated USING (public.is_member(public.agent_workspace(agent_id), auth.uid()));

CREATE POLICY "incident_events_select" ON public.incident_events FOR SELECT TO authenticated USING (public.is_member(public.incident_workspace(incident_id), auth.uid()));
CREATE POLICY "incident_events_insert" ON public.incident_events FOR INSERT TO authenticated WITH CHECK (public.is_member(public.incident_workspace(incident_id), auth.uid()));

CREATE POLICY "oncall_select" ON public.oncall_schedules FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "oncall_insert" ON public.oncall_schedules FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "oncall_update" ON public.oncall_schedules FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "oncall_delete" ON public.oncall_schedules FOR DELETE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "keys_select" ON public.ingest_keys FOR SELECT TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "keys_insert" ON public.ingest_keys FOR INSERT TO authenticated WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "keys_update" ON public.ingest_keys FOR UPDATE TO authenticated USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE POLICY "audit_select" ON public.audit_log FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws_id uuid;
  display_name text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,'user'),'@',1));

  INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, display_name);

  INSERT INTO public.workspaces (name, created_by) VALUES (display_name || '''s workspace', NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');

  INSERT INTO public.ingest_keys (workspace_id, token)
  VALUES (ws_id, 'fw_' || encode(gen_random_bytes(24), 'hex'));

  INSERT INTO public.oncall_schedules (workspace_id, rotation_config, escalation_policy)
  VALUES (ws_id,
    jsonb_build_object('responders', jsonb_build_array(jsonb_build_object('name', display_name, 'email', NEW.email)), 'rotation', 'weekly'),
    jsonb_build_object('escalate_after_minutes', 10, 'channels', jsonb_build_array('email')));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
