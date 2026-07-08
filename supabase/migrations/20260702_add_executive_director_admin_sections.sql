-- =============================================================
-- إضافة executive_director لدالة current_user_can_manage_admin_sections
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- الغرض:
-- executive_director لا يملك صلاحية DB على الاجتماعات/المجلس/الحوكمة
-- رغم أنه مسموح له بالدخول على مستوى الواجهة والمسارات (executiveRoles).
-- إضافة فقط — admin وexecutive_manager يحتفظان بصلاحياتهما كاملة.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION app_private.current_user_can_manage_admin_sections()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app_private.current_user_has_role('admin')
    OR app_private.current_user_has_role('executive_manager')
    OR app_private.current_user_has_role('executive_director');
$$;

COMMIT;
