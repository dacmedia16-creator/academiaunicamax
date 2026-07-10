
-- course_managers table
CREATE TABLE IF NOT EXISTS public.course_managers (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_managers TO authenticated;
GRANT ALL ON public.course_managers TO service_role;

ALTER TABLE public.course_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage course_managers"
  ON public.course_managers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "managers can see own assignments"
  ON public.course_managers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Helper function
CREATE OR REPLACE FUNCTION public.is_course_manager(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_managers
    WHERE user_id = _user_id AND course_id = _course_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_course_manager(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_course_manager(uuid, uuid) TO authenticated;

-- COURSES: manager can see all their courses (published or not) + full CRUD
CREATE POLICY "managers can view their courses"
  ON public.courses FOR SELECT TO authenticated
  USING (public.is_course_manager(auth.uid(), id));

CREATE POLICY "managers can update their courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.is_course_manager(auth.uid(), id))
  WITH CHECK (public.is_course_manager(auth.uid(), id));

CREATE POLICY "managers can delete their courses"
  ON public.courses FOR DELETE TO authenticated
  USING (public.is_course_manager(auth.uid(), id));

CREATE POLICY "managers can create courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Trigger: auto-assign course to manager who created it
CREATE OR REPLACE FUNCTION public.register_course_manager()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'manager')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.course_managers (course_id, user_id, assigned_by)
    VALUES (NEW.id, auth.uid(), auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_course_manager() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_register_course_manager ON public.courses;
CREATE TRIGGER trg_register_course_manager
  AFTER INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.register_course_manager();

-- MODULES: manager full CRUD on modules of their courses
CREATE POLICY "managers can view modules of their courses"
  ON public.modules FOR SELECT TO authenticated
  USING (public.is_course_manager(auth.uid(), course_id));

CREATE POLICY "managers can insert modules of their courses"
  ON public.modules FOR INSERT TO authenticated
  WITH CHECK (public.is_course_manager(auth.uid(), course_id));

CREATE POLICY "managers can update modules of their courses"
  ON public.modules FOR UPDATE TO authenticated
  USING (public.is_course_manager(auth.uid(), course_id))
  WITH CHECK (public.is_course_manager(auth.uid(), course_id));

CREATE POLICY "managers can delete modules of their courses"
  ON public.modules FOR DELETE TO authenticated
  USING (public.is_course_manager(auth.uid(), course_id));

-- LESSONS: manager full CRUD on lessons whose module belongs to a course they manage
CREATE POLICY "managers can view lessons of their courses"
  ON public.lessons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_course_manager(auth.uid(), m.course_id)
  ));

CREATE POLICY "managers can insert lessons of their courses"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_course_manager(auth.uid(), m.course_id)
  ));

CREATE POLICY "managers can update lessons of their courses"
  ON public.lessons FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_course_manager(auth.uid(), m.course_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_course_manager(auth.uid(), m.course_id)
  ));

CREATE POLICY "managers can delete lessons of their courses"
  ON public.lessons FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = lessons.module_id
      AND public.is_course_manager(auth.uid(), m.course_id)
  ));

-- PROFILES, USER_ROLES, LESSON_PROGRESS: manager can read
CREATE POLICY "managers can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "managers can view user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "managers can view lesson_progress"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));
