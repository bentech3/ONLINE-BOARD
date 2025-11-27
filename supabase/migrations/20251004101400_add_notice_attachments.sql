-- Create notice_attachments table for supporting multiple content types
CREATE TABLE public.notice_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'document'
  mime_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on notice_attachments
ALTER TABLE public.notice_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notice_attachments
CREATE POLICY "Everyone can view approved notice attachments"
  ON public.notice_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notices
      WHERE notices.id = notice_attachments.notice_id
      AND notices.status = 'approved'
    ) OR
    EXISTS (
      SELECT 1 FROM public.notices
      WHERE notices.id = notice_attachments.notice_id
      AND notices.author_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Staff can create attachments"
  ON public.notice_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'staff') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authors can delete own attachments"
  ON public.notice_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notices
      WHERE notices.id = notice_attachments.notice_id
      AND notices.author_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

-- Create index for better performance
CREATE INDEX idx_notice_attachments_notice_id ON public.notice_attachments(notice_id);
CREATE INDEX idx_notice_attachments_file_type ON public.notice_attachments(file_type);