-- Add publish_at column for scheduling notices
ALTER TABLE public.notices ADD COLUMN publish_at TIMESTAMPTZ;

-- Update the status check to also consider publish_at time
-- Notices should only be visible if they are approved AND (publish_at is null OR publish_at <= now())
-- But for admin views, they should see all notices regardless of publish_at

-- Update RLS policies to include publish_at logic
DROP POLICY "Students can view approved notices" ON public.notices;
CREATE POLICY "Students can view approved notices"
  ON public.notices FOR SELECT
  TO authenticated
  USING (
    status = 'approved' AND
    (publish_at IS NULL OR publish_at <= NOW()) AND
    (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

-- For public access (when we add it), we'll need a separate policy
-- But for now, the authenticated policy covers logged-in users