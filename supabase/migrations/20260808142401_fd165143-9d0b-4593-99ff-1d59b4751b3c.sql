-- 1. Fix signup trigger (pgcrypto lives in extensions schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  ws_id uuid;
  display_name text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,'user'),'@',1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, display_name)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.workspaces (name, created_by) VALUES (display_name || '''s workspace', NEW.id)
    RETURNING id INTO ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');

    INSERT INTO public.ingest_keys (workspace_id, token)
    VALUES (ws_id, 'fw_' || encode(extensions.gen_random_bytes(24), 'hex'));

    INSERT INTO public.oncall_schedules (workspace_id, rotation_config, escalation_policy)
    VALUES (ws_id,
      jsonb_build_object('responders', jsonb_build_array(jsonb_build_object('name', display_name, 'email', NEW.email)), 'rotation', 'weekly'),
      jsonb_build_object('escalate_after_minutes', 10, 'channels', jsonb_build_array('email')));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user workspace bootstrap failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 2. Role helper
CREATE OR REPLACE FUNCTION public.my_role(_workspace_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = auth.uid() LIMIT 1;
$$;

-- 3. Postmortem review flow
DO $$ BEGIN
  CREATE TYPE public.postmortem_review_status AS ENUM ('not_started','in_review','changes_requested','approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS review_status postmortem_review_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TYPE public.incident_event_type ADD VALUE IF NOT EXISTS 'postmortem_submitted';
ALTER TYPE public.incident_event_type ADD VALUE IF NOT EXISTS 'postmortem_approved';
ALTER TYPE public.incident_event_type ADD VALUE IF NOT EXISTS 'postmortem_changes_requested';
ALTER TYPE public.incident_event_type ADD VALUE IF NOT EXISTS 'postmortem_published';

-- 4. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'incident',
  severity incident_severity,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, read_at, created_at DESC);

-- 5. Fan-out helper + triggers
CREATE OR REPLACE FUNCTION public.notify_workspace(_workspace_id uuid, _incident_id uuid, _severity incident_severity, _title text, _body text, _link text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.notifications (workspace_id, user_id, incident_id, severity, title, body, link)
  SELECT _workspace_id, m.user_id, _incident_id, _severity, _title, _body, _link
  FROM public.workspace_members m WHERE m.workspace_id = _workspace_id;
$$;

CREATE OR REPLACE FUNCTION public.on_incident_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ws_id uuid;
  agent_name text;
  link text;
BEGIN
  SELECT a.workspace_id, a.name INTO ws_id, agent_name FROM public.agents a WHERE a.id = NEW.agent_id;
  IF ws_id IS NULL THEN RETURN NEW; END IF;
  link := '/app/incidents/' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Incident opened: ' || NEW.title, agent_name || ' breached its SLA.', link);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'acknowledged' THEN
      PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Incident acknowledged: ' || NEW.title, 'A responder picked up ' || agent_name || '.', link);
    ELSIF NEW.status = 'resolved' THEN
      PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Incident resolved: ' || NEW.title, agent_name || ' is back within SLA.', link);
    END IF;
  END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    IF NEW.review_status = 'in_review' THEN
      PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Postmortem ready for review', NEW.title || ' needs an owner or admin to review.', link);
    ELSIF NEW.review_status = 'approved' THEN
      PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Postmortem approved', NEW.title || ' is approved and can be published.', link);
    ELSIF NEW.review_status = 'changes_requested' THEN
      PERFORM public.notify_workspace(ws_id, NEW.id, NEW.severity, 'Postmortem changes requested', COALESCE(NEW.review_notes, 'A reviewer asked for changes.'), link);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incidents_notify_insert ON public.incidents;
CREATE TRIGGER incidents_notify_insert AFTER INSERT ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.on_incident_change();

DROP TRIGGER IF EXISTS incidents_notify_update ON public.incidents;
CREATE TRIGGER incidents_notify_update AFTER UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.on_incident_change();

-- 6. Review authorisation + publish gate
CREATE OR REPLACE FUNCTION public.enforce_postmortem_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ws_id uuid;
BEGIN
  SELECT a.workspace_id INTO ws_id FROM public.agents a WHERE a.id = NEW.agent_id;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     AND NEW.review_status IN ('approved','changes_requested')
     AND NOT public.has_workspace_role(ws_id, auth.uid(), ARRAY['owner','admin']::app_role[]) THEN
    RAISE EXCEPTION 'Only workspace owners and admins can review postmortems';
  END IF;

  IF NEW.published AND NOT OLD.published AND NEW.review_status <> 'approved' THEN
    RAISE EXCEPTION 'Postmortem must be approved before publishing';
  END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status AND NEW.review_status IN ('approved','changes_requested') THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  IF NEW.review_status = 'in_review' AND OLD.review_status IS DISTINCT FROM 'in_review' THEN
    NEW.submitted_for_review_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incidents_review_guard ON public.incidents;
CREATE TRIGGER incidents_review_guard BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.enforce_postmortem_review();

-- 7. Protect the last owner
CREATE OR REPLACE FUNCTION public.protect_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owners int;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
    SELECT count(*) INTO owners FROM public.workspace_members WHERE workspace_id = OLD.workspace_id AND role = 'owner';
    IF owners <= 1 THEN
      RAISE EXCEPTION 'A workspace must always have at least one owner';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_protect_last_owner ON public.workspace_members;
CREATE TRIGGER members_protect_last_owner BEFORE UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.protect_last_owner();