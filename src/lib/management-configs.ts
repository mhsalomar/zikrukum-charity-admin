export type ManagementTable = "meetings" | "governance_items" | "hr_employees" | "hr_letters" | "management_reports" | "media_posts" | "board_members";
export type ManagementIconName = "briefcase" | "chart" | "file-check" | "mail-check" | "messages" | "newspaper";

export type ManagementColumn = {
  key: string;
  label: string;
  kind?: "date" | "time" | "money" | "status" | "text";
};

export type ManagementField = {
  name: string;
  label: string;
  kind?: "text" | "date" | "time" | "number" | "email" | "tel" | "select" | "textarea";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

export type ManagementConfig = {
  table: ManagementTable;
  title: string;
  eyebrow: string;
  description: string;
  addLabel: string;
  addUrl?: string;
  returnTo: string;
  iconName: ManagementIconName;
  columns: ManagementColumn[];
  fields: ManagementField[];
  statusOptions: Array<{ value: string; label: string }>;
  typeOptions?: Array<{ value: string; label: string }>;
  sections: Array<{ title: string; description: string }>;
};

const meetingStatus = [
  { value: "draft", label: "مسودة" },
  { value: "approved", label: "معتمد" },
  { value: "archived", label: "مؤرشف" },
];

const governanceStatus = [
  { value: "active", label: "ساري" },
  { value: "needs_update", label: "يحتاج تحديث" },
  { value: "archived", label: "مؤرشف" },
];

const activeStatus = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
];

const reportStatus = [
  { value: "draft", label: "مسودة" },
  { value: "approved", label: "معتمد" },
  { value: "archived", label: "مؤرشف" },
];

const letterStatus = [
  { value: "draft", label: "مسودة" },
  { value: "ready", label: "جاهز" },
  { value: "approved", label: "معتمد" },
  { value: "archived", label: "مؤرشف" },
];

const mediaStatus = [
  { value: "draft", label: "مسودة" },
  { value: "ready_for_review", label: "جاهز للمراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "published", label: "منشور داخليًا" },
  { value: "archived", label: "مؤرشف" },
];

export const managementConfigs = {
  meetings: {
    table: "meetings",
    eyebrow: "الإدارة",
    title: "الاجتماعات والمحاضر",
    description: "اجتماعات الجمعية ومحاضرها وقراراتها وتوصياتها.",
    addLabel: "إضافة اجتماع",
    returnTo: "/dashboard/meetings",
    iconName: "messages",
    statusOptions: meetingStatus,
    typeOptions: [
      { value: "board", label: "مجلس إدارة" },
      { value: "committee", label: "لجنة" },
      { value: "work_team", label: "فريق عمل" },
      { value: "general_assembly", label: "جمعية عمومية" },
      { value: "other", label: "أخرى" },
    ],
    sections: [
      { title: "قائمة الاجتماعات", description: "عرض الاجتماعات حسب التاريخ والحالة." },
      { title: "تفاصيل الاجتماع", description: "الحضور، جدول الأعمال، المحضر، القرارات والتوصيات." },
      { title: "أرشفة آمنة", description: "زر الحذف في هذه الوحدة يؤرشف السجل ولا يحذفه نهائيًا." },
    ],
    columns: [
      { key: "title", label: "عنوان الاجتماع" },
      { key: "meeting_number", label: "رقم الاجتماع" },
      { key: "meeting_type", label: "النوع", kind: "status" },
      { key: "meeting_date", label: "التاريخ", kind: "date" },
      { key: "start_time", label: "البداية", kind: "time" },
      { key: "location", label: "المكان" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "title", label: "عنوان الاجتماع", required: true },
      { name: "meeting_number", label: "رقم الاجتماع" },
      { name: "meeting_type", label: "نوع الاجتماع", kind: "select", options: [
        { value: "board", label: "مجلس إدارة" },
        { value: "committee", label: "لجنة" },
        { value: "work_team", label: "فريق عمل" },
        { value: "general_assembly", label: "جمعية عمومية" },
        { value: "other", label: "أخرى" },
      ] },
      { name: "meeting_date", label: "التاريخ", kind: "date", required: true },
      { name: "start_time", label: "وقت البداية", kind: "time" },
      { name: "end_time", label: "وقت النهاية", kind: "time" },
      { name: "location", label: "المكان" },
      { name: "chair_name", label: "رئيس الاجتماع" },
      { name: "prepared_by", label: "معد المحضر" },
      { name: "status", label: "الحالة", kind: "select", options: meetingStatus },
    ],
  },
  governance: {
    table: "governance_items",
    eyebrow: "الحوكمة",
    title: "الحوكمة والامتثال",
    description: "متابعة السياسات واللوائح والإفصاحات وأعضاء المجلس والقرارات ومؤشرات الامتثال.",
    addLabel: "إضافة بند حوكمة",
    returnTo: "/dashboard/governance",
    iconName: "file-check",
    statusOptions: governanceStatus,
    typeOptions: [
      { value: "policy", label: "سياسة أو لائحة" },
      { value: "disclosure", label: "إفصاح" },
      { value: "board_member", label: "عضو مجلس" },
      { value: "committee_member", label: "عضو لجنة" },
      { value: "decision", label: "قرار" },
      { value: "compliance_indicator", label: "مؤشر امتثال" },
      { value: "other", label: "أخرى" },
    ],
    sections: [
      { title: "السياسات واللوائح", description: "حفظ أسماء الوثائق وحالتها والمسؤول عنها." },
      { title: "الإفصاحات والقرارات", description: "متابعة البنود الرسمية بتاريخ وحالة واضحة." },
      { title: "مؤشرات الامتثال", description: "واجهة مبسطة قبل بناء تقارير متقدمة." },
    ],
    columns: [
      { key: "title", label: "اسم الوثيقة أو البند" },
      { key: "item_type", label: "النوع", kind: "status" },
      { key: "item_date", label: "التاريخ", kind: "date" },
      { key: "responsible_person", label: "المسؤول" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "title", label: "اسم الوثيقة أو البند", required: true },
      { name: "item_type", label: "النوع", kind: "select", options: [
        { value: "policy", label: "سياسة أو لائحة" },
        { value: "disclosure", label: "إفصاح" },
        { value: "board_member", label: "عضو مجلس" },
        { value: "committee_member", label: "عضو لجنة" },
        { value: "decision", label: "قرار" },
        { value: "compliance_indicator", label: "مؤشر امتثال" },
        { value: "other", label: "أخرى" },
      ] },
      { name: "item_date", label: "التاريخ", kind: "date" },
      { name: "responsible_person", label: "المسؤول" },
      { name: "status", label: "الحالة", kind: "select", options: governanceStatus },
      { name: "notes", label: "ملاحظات", kind: "textarea" },
    ],
  },
  hr: {
    table: "hr_employees",
    eyebrow: "الموارد البشرية",
    title: "الموظفون والموارد البشرية",
    description: "سجل إداري للموظفين والعقود والإجازات والعهد والتقييمات دون تكرار نظام الرواتب.",
    addLabel: "إضافة موظف",
    returnTo: "/dashboard/hr",
    iconName: "briefcase",
    statusOptions: activeStatus,
    sections: [
      { title: "الموظفون", description: "بيانات الموظف الأساسية وحالته الإدارية." },
      { title: "العقود والإجازات", description: "مجهزة كسجلات مستقلة عند اكتمال بيانات الموارد البشرية." },
      { title: "العهد والتقييمات", description: "متابعة إدارية واضحة دون رفع مرفقات في هذه المرحلة." },
    ],
    columns: [
      { key: "full_name", label: "الاسم" },
      { key: "job_title", label: "المسمى" },
      { key: "department", label: "القسم" },
      { key: "phone", label: "الجوال" },
      { key: "start_date", label: "المباشرة", kind: "date" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "full_name", label: "الاسم", required: true },
      { name: "national_id", label: "رقم الهوية" },
      { name: "phone", label: "الجوال", kind: "tel" },
      { name: "email", label: "البريد", kind: "email" },
      { name: "job_title", label: "المسمى الوظيفي" },
      { name: "department", label: "القسم" },
      { name: "start_date", label: "تاريخ المباشرة", kind: "date" },
      { name: "salary", label: "الراتب للعرض الإداري", kind: "number" },
      { name: "status", label: "الحالة", kind: "select", options: activeStatus },
      { name: "notes", label: "ملاحظات", kind: "textarea" },
    ],
  },
  hrLetters: {
    table: "hr_letters",
    eyebrow: "الموارد البشرية",
    title: "الصادر والخطابات",
    description: "إدارة الخطابات الإدارية الرسمية وتجهيزها للطباعة بترويسة الجمعية وخانة اعتماد وختم.",
    addLabel: "إضافة خطاب",
    returnTo: "/dashboard/hr/letters",
    iconName: "mail-check",
    statusOptions: letterStatus,
    typeOptions: [
      { value: "introduction", label: "خطاب تعريف" },
      { value: "start_work", label: "خطاب مباشرة" },
      { value: "assignment", label: "خطاب تكليف" },
      { value: "warning", label: "خطاب إنذار" },
      { value: "thanks", label: "خطاب شكر" },
      { value: "donor", label: "خطاب للجهات المانحة" },
      { value: "internal", label: "خطاب داخلي" },
      { value: "other", label: "أخرى" },
    ],
    sections: [
      { title: "خطابات رسمية", description: "رقم، تاريخ، جهة، موضوع، ونص خطاب واضح." },
      { title: "اعتماد وطباعة", description: "صفحة طباعة مستقلة بترويسة وخانة توقيع وختم." },
      { title: "أرشفة آمنة", description: "الحذف في هذه الوحدة إخفاء/أرشفة فقط وليس حذفًا نهائيًا." },
    ],
    columns: [
      { key: "letter_number", label: "رقم الخطاب" },
      { key: "letter_date", label: "التاريخ", kind: "date" },
      { key: "letter_type", label: "النوع", kind: "status" },
      { key: "recipient_name", label: "المرسل إليه" },
      { key: "subject", label: "الموضوع" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "letter_number", label: "رقم الخطاب" },
      { name: "letter_date", label: "تاريخ الخطاب", kind: "date", required: true },
      { name: "letter_type", label: "نوع الخطاب", kind: "select", options: [
        { value: "introduction", label: "خطاب تعريف" },
        { value: "start_work", label: "خطاب مباشرة" },
        { value: "assignment", label: "خطاب تكليف" },
        { value: "warning", label: "خطاب إنذار" },
        { value: "thanks", label: "خطاب شكر" },
        { value: "donor", label: "خطاب للجهات المانحة" },
        { value: "internal", label: "خطاب داخلي" },
        { value: "other", label: "أخرى" },
      ] },
      { name: "recipient_name", label: "الجهة أو الشخص المرسل إليه" },
      { name: "related_person_name", label: "الموظف/المعلم المرتبط" },
      { name: "subject", label: "الموضوع", required: true },
      { name: "body", label: "نص الخطاب", kind: "textarea" },
      { name: "prepared_by", label: "معد الخطاب" },
      { name: "approved_by", label: "المعتمد" },
      { name: "status", label: "الحالة", kind: "select", options: letterStatus },
      { name: "notes", label: "ملاحظات", kind: "textarea" },
    ],
  },
  reports: {
    table: "management_reports",
    eyebrow: "التقارير",
    title: "التقارير التنفيذية",
    description: "مركز تقارير رسمي يجمع المالية والبرامج والمسابقات والموارد البشرية والاجتماعات والحوكمة.",
    addLabel: "إضافة تقرير",
    returnTo: "/dashboard/reports",
    iconName: "chart",
    statusOptions: reportStatus,
    typeOptions: [
      { value: "financial", label: "مالي" },
      { value: "programs", label: "برامج" },
      { value: "competitions", label: "مسابقات" },
      { value: "hr", label: "موارد بشرية" },
      { value: "meetings_governance", label: "اجتماعات وحوكمة" },
      { value: "executive", label: "تنفيذي" },
      { value: "other", label: "أخرى" },
    ],
    sections: [
      { title: "تقارير مالية", description: "ملخصات إدارية واضحة قابلة للتطوير حسب احتياج الإدارة." },
      { title: "تقارير البرامج والمسابقات", description: "تجهيز بنية التقارير قبل التصدير الرسمي." },
      { title: "تقارير الموارد والاجتماعات", description: "خيارات تصفية للفترة والنوع والحالة ضمن الواجهة." },
    ],
    columns: [
      { key: "title", label: "عنوان التقرير" },
      { key: "report_type", label: "النوع", kind: "status" },
      { key: "period_start", label: "من", kind: "date" },
      { key: "period_end", label: "إلى", kind: "date" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "title", label: "عنوان التقرير", required: true },
      { name: "report_type", label: "نوع التقرير", kind: "select", options: [
        { value: "financial", label: "مالي" },
        { value: "programs", label: "برامج" },
        { value: "competitions", label: "مسابقات" },
        { value: "hr", label: "موارد بشرية" },
        { value: "meetings_governance", label: "اجتماعات وحوكمة" },
        { value: "executive", label: "تنفيذي" },
        { value: "other", label: "أخرى" },
      ] },
      { name: "period_start", label: "الفترة من", kind: "date" },
      { name: "period_end", label: "الفترة إلى", kind: "date" },
      { name: "status", label: "الحالة", kind: "select", options: reportStatus },
      { name: "summary", label: "الملخص", kind: "textarea" },
      { name: "notes", label: "ملاحظات", kind: "textarea" },
    ],
  },
  mediaPosts: {
    table: "media_posts",
    eyebrow: "المركز الإعلامي",
    title: "الإعلام والتدوين",
    description: "إدارة أخبار الجمعية والتغطيات والإعلانات داخليًا قبل اعتماد أي نشر عام.",
    addLabel: "إضافة تدوينة",
    returnTo: "/dashboard/media/posts",
    iconName: "newspaper",
    statusOptions: mediaStatus,
    typeOptions: [
      { value: "news", label: "خبر" },
      { value: "announcement", label: "إعلان" },
      { value: "coverage", label: "تغطية" },
      { value: "achievement", label: "إنجاز" },
      { value: "program", label: "برنامج" },
      { value: "competition", label: "مسابقة" },
      { value: "circular", label: "تعميم" },
      { value: "other", label: "أخرى" },
    ],
    sections: [
      { title: "محتوى داخلي", description: "تجهيز الأخبار والتغطيات دون نشر عام في هذه المرحلة." },
      { title: "مسار مراجعة", description: "مسودة، جاهز للمراجعة، معتمد، منشور داخليًا، أو مؤرشف." },
      { title: "مرفقات وروابط", description: "يمكن حفظ رابط اختياري للمرفقات والصور عند الحاجة." },
    ],
    columns: [
      { key: "title", label: "العنوان" },
      { key: "content_type", label: "النوع", kind: "status" },
      { key: "category", label: "التصنيف" },
      { key: "proposed_publish_date", label: "تاريخ مقترح", kind: "date" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "title", label: "العنوان", required: true },
      { name: "content_type", label: "نوع المحتوى", kind: "select", options: [
        { value: "news", label: "خبر" },
        { value: "announcement", label: "إعلان" },
        { value: "coverage", label: "تغطية" },
        { value: "achievement", label: "إنجاز" },
        { value: "program", label: "برنامج" },
        { value: "competition", label: "مسابقة" },
        { value: "circular", label: "تعميم" },
        { value: "other", label: "أخرى" },
      ] },
      { name: "category", label: "التصنيف" },
      { name: "summary", label: "الملخص", kind: "textarea" },
      { name: "content", label: "المحتوى", kind: "textarea" },
      { name: "proposed_publish_date", label: "تاريخ النشر المقترح", kind: "date" },
      { name: "status", label: "الحالة", kind: "select", options: mediaStatus },
      { name: "author_name", label: "الكاتب/المعد" },
      { name: "external_asset_url", label: "رابط صورة أو مرفق خارجي" },
      { name: "internal_notes", label: "ملاحظات داخلية", kind: "textarea" },
    ],
  },
  boardMembers: {
    table: "board_members",
    eyebrow: "مجلس الإدارة",
    title: "أعضاء مجلس الإدارة",
    description: "سجل أعضاء مجلس الإدارة ومناصبهم وتواصلهم وفترات عضويتهم.",
    addLabel: "إضافة عضو",
    returnTo: "/dashboard/board/members",
    iconName: "briefcase",
    statusOptions: [
      { value: "active", label: "نشط" },
      { value: "inactive", label: "غير نشط" },
      { value: "expired", label: "منتهية العضوية" },
    ],
    sections: [
      { title: "بيانات الأعضاء", description: "الاسم والمنصب والتواصل وتاريخ العضوية." },
      { title: "التوكيل والمهام", description: "يمكن توكيل مهام لأعضاء المجلس من صفحة توزيع المهام." },
      { title: "أرشفة آمنة", description: "الحذف في هذه الوحدة أرشفة فقط وليس حذفًا نهائيًا." },
    ],
    columns: [
      { key: "full_name", label: "الاسم" },
      { key: "position", label: "المنصب" },
      { key: "phone", label: "الجوال" },
      { key: "email", label: "البريد" },
      { key: "membership_start", label: "بداية العضوية", kind: "date" },
      { key: "membership_end", label: "نهاية العضوية", kind: "date" },
      { key: "status", label: "الحالة", kind: "status" },
    ],
    fields: [
      { name: "full_name", label: "الاسم الكامل", required: true },
      { name: "position", label: "المنصب", kind: "select", options: [
        { value: "chairman", label: "رئيس المجلس" },
        { value: "vice_chairman", label: "نائب الرئيس" },
        { value: "secretary", label: "أمين السر" },
        { value: "treasurer", label: "أمين الصندوق" },
        { value: "member", label: "عضو" },
      ] },
      { name: "phone", label: "الجوال", kind: "tel" },
      { name: "email", label: "البريد الإلكتروني", kind: "email" },
      { name: "membership_start", label: "بداية العضوية", kind: "date" },
      { name: "membership_end", label: "نهاية العضوية", kind: "date" },
      { name: "status", label: "الحالة", kind: "select", options: [
        { value: "active", label: "نشط" },
        { value: "inactive", label: "غير نشط" },
        { value: "expired", label: "منتهية العضوية" },
      ] },
      { name: "notes", label: "ملاحظات", kind: "textarea" },
    ],
  },
} satisfies Record<string, ManagementConfig>;
