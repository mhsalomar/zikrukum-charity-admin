-- Meeting minutes structured data
-- No DROP or TRUNCATE

-- Add saved signature image to board members
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Extend meeting_signatures with board_member link and image URL
ALTER TABLE public.meeting_signatures
  ADD COLUMN IF NOT EXISTS board_member_id UUID REFERENCES public.board_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- Board member attendance per meeting
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  board_member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  is_present BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, board_member_id)
);

-- Structured agenda items
CREATE TABLE IF NOT EXISTS public.meeting_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Structured decisions (linked to agenda items optionally)
CREATE TABLE IF NOT EXISTS public.meeting_decisions_structured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES public.meeting_agenda_items(id) ON DELETE SET NULL,
  order_num INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'follow_up', 'postponed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional attached tables (e.g. donation tables)
CREATE TABLE IF NOT EXISTS public.meeting_attached_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_decisions_structured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attached_tables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_attendance' AND policyname='Meeting attendance read') THEN
    CREATE POLICY "Meeting attendance read" ON public.meeting_attendance FOR SELECT TO authenticated USING (app_private.current_user_can_manage_admin_sections());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_attendance' AND policyname='Meeting attendance write') THEN
    CREATE POLICY "Meeting attendance write" ON public.meeting_attendance FOR ALL TO authenticated USING (app_private.current_user_can_manage_admin_sections()) WITH CHECK (app_private.current_user_can_manage_admin_sections());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_agenda_items' AND policyname='Meeting agenda items read') THEN
    CREATE POLICY "Meeting agenda items read" ON public.meeting_agenda_items FOR SELECT TO authenticated USING (app_private.current_user_can_manage_admin_sections());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_agenda_items' AND policyname='Meeting agenda items write') THEN
    CREATE POLICY "Meeting agenda items write" ON public.meeting_agenda_items FOR ALL TO authenticated USING (app_private.current_user_can_manage_admin_sections()) WITH CHECK (app_private.current_user_can_manage_admin_sections());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_decisions_structured' AND policyname='Meeting decisions structured read') THEN
    CREATE POLICY "Meeting decisions structured read" ON public.meeting_decisions_structured FOR SELECT TO authenticated USING (app_private.current_user_can_manage_admin_sections());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_decisions_structured' AND policyname='Meeting decisions structured write') THEN
    CREATE POLICY "Meeting decisions structured write" ON public.meeting_decisions_structured FOR ALL TO authenticated USING (app_private.current_user_can_manage_admin_sections()) WITH CHECK (app_private.current_user_can_manage_admin_sections());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_attached_tables' AND policyname='Meeting attached tables read') THEN
    CREATE POLICY "Meeting attached tables read" ON public.meeting_attached_tables FOR SELECT TO authenticated USING (app_private.current_user_can_manage_admin_sections());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meeting_attached_tables' AND policyname='Meeting attached tables write') THEN
    CREATE POLICY "Meeting attached tables write" ON public.meeting_attached_tables FOR ALL TO authenticated USING (app_private.current_user_can_manage_admin_sections()) WITH CHECK (app_private.current_user_can_manage_admin_sections());
  END IF;
END
$$;
