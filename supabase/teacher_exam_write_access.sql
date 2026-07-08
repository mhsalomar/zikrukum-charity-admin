-- teacher_exam_write_access.sql
-- Enables teachers to add/edit exam results for their own students.
-- Admins can approve and lock results. Safe, additive migration.

-- ─── 1. New columns on exam_results ────────────────────────────────────────
ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS teacher_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id),
  ADD COLUMN IF NOT EXISTS exam_title text,       -- title for standalone teacher entries
  ADD COLUMN IF NOT EXISTS exam_type text,        -- type for standalone teacher entries
  ADD COLUMN IF NOT EXISTS exam_date date,        -- date for standalone teacher entries
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS exam_results_teacher_id_idx ON public.exam_results(teacher_id);
CREATE INDEX IF NOT EXISTS exam_results_teacher_submitted_idx ON public.exam_results(teacher_submitted) WHERE teacher_submitted = true;

-- ─── 2. Helper function: is current user the teacher for this student? ──────
CREATE OR REPLACE FUNCTION app_private.current_teacher_owns_student(target_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, app_private, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    JOIN public.halaqat h ON h.id = se.halaqa_id
    JOIN public.teachers t ON (t.id = h.teacher_id OR t.id = h.assistant_teacher_id)
    WHERE se.student_id = target_student_id
      AND se.archived_at IS NULL
      AND se.status = 'active'
      AND h.archived_at IS NULL
      AND t.auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_teacher_id_v2()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, app_private, pg_temp AS $$
  SELECT id FROM public.teachers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ─── 3. Drop & recreate teacher READ policy to include teacher-submitted ────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Teachers read approved related exam results" ON public.exam_results;
  DROP POLICY IF EXISTS "Teachers read own submitted exam results" ON public.exam_results;
END $$;

CREATE POLICY "Teachers read exam results"
  ON public.exam_results FOR SELECT TO authenticated
  USING (
    student_id IS NOT NULL
    AND (
      -- existing: approved exam results for their students
      (
        exam_id IS NOT NULL
        AND app_private.teacher_can_read_exam_result(exam_id, student_id)
      )
      OR
      -- new: teacher-submitted results they created
      (
        teacher_submitted = true
        AND teacher_id = app_private.current_teacher_id_v2()
      )
    )
  );

-- ─── 4. Teachers can INSERT exam_results for their own students ─────────────
DROP POLICY IF EXISTS "Teachers insert exam results for own students" ON public.exam_results;

CREATE POLICY "Teachers insert exam results for own students"
  ON public.exam_results FOR INSERT TO authenticated
  WITH CHECK (
    teacher_submitted = true
    AND approved_at IS NULL
    AND locked_at IS NULL
    AND teacher_id = app_private.current_teacher_id_v2()
    AND student_id IS NOT NULL
    AND app_private.current_teacher_owns_student(student_id)
  );

-- ─── 5. Teachers can UPDATE their own pending (unapproved, unlocked) results ─
DROP POLICY IF EXISTS "Teachers update own pending exam results" ON public.exam_results;

CREATE POLICY "Teachers update own pending exam results"
  ON public.exam_results FOR UPDATE TO authenticated
  USING (
    teacher_submitted = true
    AND approved_at IS NULL
    AND locked_at IS NULL
    AND teacher_id = app_private.current_teacher_id_v2()
  )
  WITH CHECK (
    teacher_submitted = true
    AND approved_at IS NULL
    AND locked_at IS NULL
    AND teacher_id = app_private.current_teacher_id_v2()
  );

-- ─── 6. Admins can approve teacher-submitted results ────────────────────────
-- (Admin already has full access via existing "Admins manage exams" policy,
--  but we add explicit policies here for clarity)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exam_results'
      AND policyname = 'Admins approve and lock teacher results'
  ) THEN
    CREATE POLICY "Admins approve and lock teacher results"
      ON public.exam_results FOR UPDATE TO authenticated
      USING (app_private.current_user_is_halaqat_admin())
      WITH CHECK (app_private.current_user_is_halaqat_admin());
  END IF;
END $$;
