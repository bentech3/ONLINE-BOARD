-- Create audit_logs table for tracking all important actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', 'login', etc.
  entity_type TEXT NOT NULL, -- 'notice', 'user', 'role', 'category', etc.
  entity_id UUID, -- ID of the affected entity
  old_values JSONB, -- Previous values (for updates)
  new_values JSONB, -- New values (for updates/creates)
  metadata JSONB, -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Create triggers for automatic audit logging

-- Audit trigger for notices
CREATE OR REPLACE FUNCTION public.audit_notice_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.author_id,
      'create',
      'notice',
      NEW.id,
      NULL,
      row_to_json(NEW)::jsonb,
      jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes specially
    IF OLD.status != NEW.status THEN
      PERFORM public.log_audit_event(
        COALESCE(NEW.approved_by, NEW.author_id),
        CASE NEW.status
          WHEN 'approved' THEN 'approve'
          WHEN 'rejected' THEN 'reject'
          ELSE 'update'
        END,
        'notice',
        NEW.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        jsonb_build_object('approved_by', NEW.approved_by, 'approved_at', NEW.approved_at)
      );
    ELSE
      PERFORM public.log_audit_event(
        NEW.author_id,
        'update',
        'notice',
        NEW.id,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb,
        NULL
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      OLD.author_id,
      'delete',
      'notice',
      OLD.id,
      row_to_json(OLD)::jsonb,
      NULL,
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create audit trigger for notices
CREATE TRIGGER audit_notice_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_notice_changes();

-- Audit trigger for user roles
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      'assign_role',
      'user_role',
      NEW.id,
      NULL,
      jsonb_build_object('role', NEW.role),
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      OLD.user_id,
      'remove_role',
      'user_role',
      OLD.id,
      jsonb_build_object('role', OLD.role),
      NULL,
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create audit trigger for user roles
CREATE TRIGGER audit_user_role_changes_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_user_role_changes();

-- Create index for better performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);