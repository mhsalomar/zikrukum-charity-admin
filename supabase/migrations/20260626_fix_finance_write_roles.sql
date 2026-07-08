-- =============================================================
-- إصلاح صلاحيات الكتابة المالية وإضافة المدير التنفيذي
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- الغرض:
-- 1. إضافة دور executive_director للدالة current_user_can_write_finance
-- 2. إزالة صلاحية حذف المتبرعين (donors)
--
-- التحذيرات:
-- - راجع هذا الملف قبل التطبيق
-- - اختبر في بيئة تطوير أولاً
-- =============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. تحديث دالة التحقق من صلاحيات المالية
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_private.current_user_can_write_finance()
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN (
        'admin',
        'executive_manager',
        'executive_director'
      )
  );
$$;

COMMENT ON FUNCTION app_private.current_user_can_write_finance() IS 
  'دالة التحقق من صلاحيات الكتابة المالية. 
   مسموح لـ: admin, executive_manager, executive_director.
   ممنوع عن: finance_viewer, supervisor, teacher, hr, halaqat_manager';

-- ------------------------------------------------------------
-- 2. إزالة صلاحية حذف المتبرعين
-- ------------------------------------------------------------
-- السبب: المتبرعين يجب أرشفتهم لا حذفهم

DROP POLICY IF EXISTS "Finance delete donors" ON public.donors;

COMMIT;