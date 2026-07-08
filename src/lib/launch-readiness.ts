import { createClient } from "@/lib/supabase/server";

export type Severity = "high" | "medium" | "low";

export type ReadinessItem = {
  key: string;
  title: string;
  count: number;
  severity: Severity;
  href: string;
  description: string;
};

export type FollowupItem = {
  key: string;
  title: string;
  count: number;
  severity: Severity;
  href: string;
  description: string;
};

type ScopeOptions = {
  circleIds?: string[] | null;
  supervisorMode?: boolean;
};

type Row = Record<string, unknown>;

export async function getFollowupAlertsData(options: ScopeOptions = {}) {
  const supabase = await createClient();
  const today = new Date();
  const sevenDaysAgo = addDays(today, -7);
  const thirtyDaysAgo = addDays(today, -30);
  const circleIds = options.circleIds;

  if (Array.isArray(circleIds) && circleIds.length === 0) {
    return { followups: emptyReadiness(options.supervisorMode).followups };
  }

  const halaqatQuery = supabase
    .from("halaqat")
    .select("id,teacher_id")
    .is("archived_at", null)
    .eq("is_test_account", false)
    .limit(1000);
  const enrollmentsQuery = supabase
    .from("student_enrollments")
    .select("student_id,halaqa_id,status,archived_at")
    .is("archived_at", null)
    .limit(5000);
  const progressQuery = supabase
    .from("student_progress_records")
    .select("student_id,halaqa_id,teacher_id,progress_date,rating,attendance_status")
    .is("archived_at", null)
    .limit(5000);
  const sessionsQuery = supabase
    .from("teacher_session_entries")
    .select("student_id,halaqa_id,teacher_id,session_date,rating,attendance_status")
    .is("archived_at", null)
    .limit(5000);
  const lessonsQuery = supabase
    .from("teacher_circle_lessons")
    .select("teacher_id,halaqa_id,lesson_date")
    .gte("lesson_date", toDateKey(sevenDaysAgo))
    .is("archived_at", null)
    .limit(2000);
  const visitsQuery = supabase
    .from("supervisor_visits")
    .select("circle_id,visit_date")
    .gte("visit_date", toDateKey(thirtyDaysAgo))
    .limit(2000);

  if (Array.isArray(circleIds)) {
    halaqatQuery.in("id", circleIds);
    enrollmentsQuery.in("halaqa_id", circleIds);
    progressQuery.in("halaqa_id", circleIds);
    sessionsQuery.in("halaqa_id", circleIds);
    lessonsQuery.in("halaqa_id", circleIds);
    visitsQuery.in("circle_id", circleIds);
  }

  const [teachers, students, halaqat, enrollments, progress, sessions, lessons, visits] = await Promise.all([
    supabase.from("teachers").select("id,status").eq("status", "active").eq("is_test_account", false).is("archived_at", null).limit(1000),
    supabase.from("students").select("id,status").eq("is_test_account", false).is("archived_at", null).limit(5000),
    halaqatQuery,
    enrollmentsQuery,
    progressQuery,
    sessionsQuery,
    lessonsQuery,
    visitsQuery,
  ]);

  const halaqaRows = rows(halaqat.data);
  const activeEnrollments = rows(enrollments.data).filter((row) => text(row.status) === "active" && !row.archived_at);
  const scopedStudentIds = new Set(activeEnrollments.map((row) => text(row.student_id)).filter(Boolean));
  const allStudents = Array.isArray(circleIds)
    ? rows(students.data).filter((student) => scopedStudentIds.has(text(student.id)))
    : rows(students.data).filter((student) => !student.status || text(student.status) === "active");
  const teacherIdsInScope = new Set(halaqaRows.map((row) => text(row.teacher_id)).filter(Boolean));
  const activeTeachers = rows(teachers.data).filter((teacher) => text(teacher.status) === "active");
  const teacherRows = Array.isArray(circleIds)
    ? activeTeachers.filter((teacher) => teacherIdsInScope.has(text(teacher.id)))
    : activeTeachers;

  const progressRows = rows(progress.data);
  const sessionRows = rows(sessions.data);
  const lessonRows = rows(lessons.data);
  const visitRows = rows(visits.data);
  const latestByStudent = new Map<string, string>();
  const ratingByStudent = new Map<string, string>();
  const absencesByStudent = new Map<string, number>();
  const lateByStudent = new Map<string, number>();

  for (const row of [...progressRows, ...sessionRows]) {
    const studentId = text(row.student_id);
    const date = text(row.progress_date) || text(row.session_date);
    if (!studentId) continue;
    if (date && (!latestByStudent.get(studentId) || date > latestByStudent.get(studentId)!)) {
      latestByStudent.set(studentId, date);
      ratingByStudent.set(studentId, text(row.rating));
    }
    if (date >= toDateKey(thirtyDaysAgo) && text(row.attendance_status) === "absent") {
      absencesByStudent.set(studentId, (absencesByStudent.get(studentId) ?? 0) + 1);
    }
    if (date >= toDateKey(thirtyDaysAgo) && text(row.attendance_status) === "late") {
      lateByStudent.set(studentId, (lateByStudent.get(studentId) ?? 0) + 1);
    }
  }

  const recentTeacherIds = new Set([
    ...progressRows.filter((row) => text(row.progress_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.teacher_id)),
    ...sessionRows.filter((row) => text(row.session_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.teacher_id)),
    ...lessonRows.map((row) => text(row.teacher_id)),
  ].filter(Boolean));
  const visitedRecently = new Set(visitRows.map((row) => text(row.circle_id)).filter(Boolean));
  const halaqaIdsWithRecentEntry = new Set([
    ...progressRows.filter((row) => text(row.progress_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.halaqa_id)),
    ...sessionRows.filter((row) => text(row.session_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.halaqa_id)),
    ...lessonRows.map((row) => text(row.halaqa_id)),
  ].filter(Boolean));
  const studentIdsWithProgress = new Set([
    ...progressRows.map((row) => text(row.student_id)).filter(Boolean),
    ...sessionRows.map((row) => text(row.student_id)).filter(Boolean),
  ]);
  const teacherByHalaqa = new Map<string, string>();
  for (const row of halaqaRows) {
    const halaqaId = text(row.id);
    if (halaqaId) teacherByHalaqa.set(halaqaId, text(row.teacher_id));
  }

  const studentsWithoutProgress = allStudents.filter((student) => !studentIdsWithProgress.has(text(student.id))).length;
  const staleStudents = allStudents.filter((student) => {
    const id = text(student.id);
    const latest = latestByStudent.get(id);
    return typeof latest === "string" && latest < toDateKey(sevenDaysAgo);
  }).length;
  const needsFollowupStudents = allStudents.filter((student) => {
    const rating = ratingByStudent.get(text(student.id));
    return rating === "needs_follow_up" || rating === "weak";
  }).length;
  const weakStudents = allStudents.filter((student) => ratingByStudent.get(text(student.id)) === "weak").length;
  const repeatedAbsenceStudents = allStudents.filter((student) => (absencesByStudent.get(text(student.id)) ?? 0) >= 3).length;
  const repeatedLateStudents = allStudents.filter((student) => (lateByStudent.get(text(student.id)) ?? 0) >= 3).length;
  const staleStudentIds = new Set(
    allStudents
      .filter((student) => {
        const id = text(student.id);
        const latest = latestByStudent.get(id);
        return !latest || latest < toDateKey(sevenDaysAgo);
      })
      .map((student) => text(student.id))
      .filter(Boolean),
  );
  const staleStudentsByTeacher = new Map<string, number>();
  for (const enrollment of activeEnrollments) {
    const studentId = text(enrollment.student_id);
    if (!staleStudentIds.has(studentId)) continue;
    const teacherId = teacherByHalaqa.get(text(enrollment.halaqa_id));
    if (teacherId) staleStudentsByTeacher.set(teacherId, (staleStudentsByTeacher.get(teacherId) ?? 0) + 1);
  }

  return {
    followups: [
      followup("stale-students", "طلاب بلا تحديث خلال 7 أيام", staleStudents, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "راجع آخر منجزات الطلاب قبل التشغيل."),
      followup("students-needs-follow-up", "طلاب تقييمهم يحتاج متابعة", needsFollowupStudents, "high", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "آخر تقييم مسجل يحتاج متابعة أو ضعيف."),
      followup("weak-students", "طلاب تقييمهم ضعيف", weakStudents, "high", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "طلاب يحتاجون عناية تعليمية مباشرة."),
      followup("repeated-absence", "طلاب غيابهم متكرر", repeatedAbsenceStudents, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/attendance", "ثلاثة غيابات أو أكثر خلال 30 يومًا."),
      followup("students-no-progress", "طلاب بلا منجز", studentsWithoutProgress, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "لا يوجد منجز حفظ أو تسميع مسجل."),
      followup("students-repeated-late", "طلاب تأخرهم متكرر", repeatedLateStudents, "low", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "ثلاث حالات تأخر أو أكثر خلال 30 يومًا."),
      followup("inactive-teachers", "معلمون لم يسجلوا خلال 7 أيام", countWhere(teacherRows, (row) => !recentTeacherIds.has(text(row.id))), "medium", options.supervisorMode ? "/supervisor/circles" : "/dashboard/teachers", "لا يوجد إدخال حديث للمعلم."),
      followup("teachers-many-stale-students", "معلمون لديهم طلاب كثر بلا تحديث", [...staleStudentsByTeacher.values()].filter((count) => count >= 5).length, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/teachers", "خمسة طلاب أو أكثر لدى المعلم بلا تحديث حديث."),
      followup("unvisited-circles", "حلقات بلا زيارة خلال 30 يومًا", countWhere(halaqaRows, (row) => !visitedRecently.has(text(row.id))), "low", options.supervisorMode ? "/supervisor/visits" : "/dashboard/reports", "لا توجد زيارة إشرافية حديثة."),
      followup("circles-without-recent-entries", "حلقات بلا إدخالات حديثة", countWhere(halaqaRows, (row) => !halaqaIdsWithRecentEntry.has(text(row.id))), "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/halaqat", "لا توجد حصة أو منجز حديث للحلقة خلال 7 أيام."),
    ],
  };
}

export async function getLaunchReadinessData(options: ScopeOptions = {}) {
  const supabase = await createClient();
  const today = new Date();
  const todayKey = toDateKey(today);
  const sevenDaysAgo = addDays(today, -7);
  const sevenDaysAhead = addDays(today, 7);
  const thirtyDaysAgo = addDays(today, -30);
  const circleIds = options.circleIds;

  if (Array.isArray(circleIds) && circleIds.length === 0) {
    return emptyReadiness(options.supervisorMode);
  }

  const halaqatQuery = supabase
    .from("halaqat")
    .select("id,name,teacher_id,supervisor_id,mosque_id,status")
    .is("archived_at", null)
    .limit(1000);
  const enrollmentsQuery = supabase
    .from("student_enrollments")
    .select("student_id,halaqa_id,status,archived_at")
    .is("archived_at", null)
    .limit(5000);
  const progressQuery = supabase
    .from("student_progress_records")
    .select("student_id,halaqa_id,teacher_id,progress_date,rating,attendance_status")
    .is("archived_at", null)
    .limit(5000);
  const sessionsQuery = supabase
    .from("teacher_session_entries")
    .select("student_id,halaqa_id,teacher_id,session_date,rating,attendance_status")
    .is("archived_at", null)
    .limit(5000);
  const lessonsQuery = supabase
    .from("teacher_circle_lessons")
    .select("teacher_id,halaqa_id,lesson_date")
    .is("archived_at", null)
    .limit(3000);
  const visitsQuery = supabase
    .from("supervisor_visits")
    .select("circle_id,visit_date,status")
    .limit(3000);

  if (Array.isArray(circleIds)) {
    halaqatQuery.in("id", circleIds);
    enrollmentsQuery.in("halaqa_id", circleIds);
    progressQuery.in("halaqa_id", circleIds);
    sessionsQuery.in("halaqa_id", circleIds);
    lessonsQuery.in("halaqa_id", circleIds);
    visitsQuery.in("circle_id", circleIds);
  }

  const [
    teachers,
    students,
    halaqat,
    enrollments,
    progress,
    sessions,
    lessons,
    visits,
    donors,
    donations,
    receipts,
    pledges,
    meetings,
    letters,
    governance,
    certificates,
    volunteers,
  ] = await Promise.all([
    supabase.from("teachers").select("id,email,auth_user_id,document_number,iban,bank_name,status").eq("is_test_account", false).is("archived_at", null).limit(1000),
    supabase.from("students").select("id,status").eq("is_test_account", false).is("archived_at", null).limit(5000),
    halaqatQuery,
    enrollmentsQuery,
    progressQuery,
    sessionsQuery,
    lessonsQuery,
    visitsQuery,
    supabase.from("donors").select("id,phone,email,next_action,next_action_date,last_contact_at,status").is("archived_at", null).limit(2000),
    supabase.from("donations").select("id,receipt_status").is("archived_at", null).limit(3000),
    supabase.from("donation_receipts").select("donation_id,status").is("archived_at", null).limit(3000),
    supabase.from("pledges").select("id,status,due_date").is("archived_at", null).limit(3000),
    supabase.from("meetings").select("id,status").is("archived_at", null).limit(1000),
    supabase.from("hr_letters").select("id,status").is("archived_at", null).limit(1000),
    supabase.from("governance_items").select("id,status").is("archived_at", null).limit(1000),
    supabase.from("certificates").select("id,status").is("archived_at", null).limit(1000),
    supabase.from("volunteers").select("id,phone,email,skills,status").is("archived_at", null).limit(1000),
  ]);

  const halaqaRows = rows(halaqat.data);
  const activeEnrollments = rows(enrollments.data).filter((row) => text(row.status) === "active" && !row.archived_at);
  const scopedStudentIds = new Set(activeEnrollments.map((row) => text(row.student_id)).filter(Boolean));
  const allStudents = Array.isArray(circleIds)
    ? rows(students.data).filter((student) => scopedStudentIds.has(text(student.id)))
    : rows(students.data).filter((student) => !student.status || text(student.status) === "active");
  const teacherIdsInScope = new Set(halaqaRows.map((row) => text(row.teacher_id)).filter(Boolean));
  const activeTeachers = rows(teachers.data).filter((teacher) => text(teacher.status) === "active");
  const teacherRows = Array.isArray(circleIds)
    ? activeTeachers.filter((teacher) => teacherIdsInScope.has(text(teacher.id)))
    : activeTeachers;

  const progressRows = rows(progress.data);
  const sessionRows = rows(sessions.data);
  const lessonRows = rows(lessons.data);
  const visitRows = rows(visits.data);
  const studentIdsWithCircle = new Set(activeEnrollments.map((row) => text(row.student_id)).filter(Boolean));
  const studentIdsWithProgress = new Set([
    ...progressRows.map((row) => text(row.student_id)).filter(Boolean),
    ...sessionRows.map((row) => text(row.student_id)).filter(Boolean),
  ]);

  const latestByStudent = new Map<string, string>();
  const ratingByStudent = new Map<string, string>();
  const absencesByStudent = new Map<string, number>();
  const lateByStudent = new Map<string, number>();
  for (const row of [...progressRows, ...sessionRows]) {
    const studentId = text(row.student_id);
    const date = text(row.progress_date) || text(row.session_date);
    if (!studentId) continue;
    if (date && (!latestByStudent.get(studentId) || date > latestByStudent.get(studentId)!)) {
      latestByStudent.set(studentId, date);
      ratingByStudent.set(studentId, text(row.rating));
    }
    if (date >= toDateKey(thirtyDaysAgo) && text(row.attendance_status) === "absent") {
      absencesByStudent.set(studentId, (absencesByStudent.get(studentId) ?? 0) + 1);
    }
    if (date >= toDateKey(thirtyDaysAgo) && text(row.attendance_status) === "late") {
      lateByStudent.set(studentId, (lateByStudent.get(studentId) ?? 0) + 1);
    }
  }

  const recentTeacherIds = new Set([
    ...progressRows.filter((row) => text(row.progress_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.teacher_id)),
    ...sessionRows.filter((row) => text(row.session_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.teacher_id)),
    ...lessonRows.filter((row) => text(row.lesson_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.teacher_id)),
  ].filter(Boolean));
  const visitedRecently = new Set(
    visitRows.filter((row) => text(row.visit_date) >= toDateKey(thirtyDaysAgo)).map((row) => text(row.circle_id)).filter(Boolean),
  );
  const halaqaIdsWithStudents = new Set(activeEnrollments.map((row) => text(row.halaqa_id)).filter(Boolean));
  const halaqaIdsWithRecentEntry = new Set([
    ...progressRows.filter((row) => text(row.progress_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.halaqa_id)),
    ...sessionRows.filter((row) => text(row.session_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.halaqa_id)),
    ...lessonRows.filter((row) => text(row.lesson_date) >= toDateKey(sevenDaysAgo)).map((row) => text(row.halaqa_id)),
  ].filter(Boolean));
  const teacherByHalaqa = new Map<string, string>();
  for (const row of halaqaRows) {
    const halaqaId = text(row.id);
    if (halaqaId) teacherByHalaqa.set(halaqaId, text(row.teacher_id));
  }

  const studentsWithoutProgress = allStudents.filter((student) => !studentIdsWithProgress.has(text(student.id))).length;
  const staleStudents = allStudents.filter((student) => {
    const id = text(student.id);
    const latest = latestByStudent.get(id);
    return typeof latest === "string" && latest < toDateKey(sevenDaysAgo);
  }).length;
  const needsFollowupStudents = allStudents.filter((student) => {
    const rating = ratingByStudent.get(text(student.id));
    return rating === "needs_follow_up" || rating === "weak";
  }).length;
  const weakStudents = allStudents.filter((student) => ratingByStudent.get(text(student.id)) === "weak").length;
  const repeatedAbsenceStudents = allStudents.filter((student) => (absencesByStudent.get(text(student.id)) ?? 0) >= 3).length;
  const repeatedLateStudents = allStudents.filter((student) => (lateByStudent.get(text(student.id)) ?? 0) >= 3).length;
  const staleStudentIds = new Set(
    allStudents
      .filter((student) => {
        const id = text(student.id);
        const latest = latestByStudent.get(id);
        return !latest || latest < toDateKey(sevenDaysAgo);
      })
      .map((student) => text(student.id))
      .filter(Boolean),
  );
  const staleStudentsByTeacher = new Map<string, number>();
  for (const enrollment of activeEnrollments) {
    const studentId = text(enrollment.student_id);
    if (!staleStudentIds.has(studentId)) continue;
    const teacherId = teacherByHalaqa.get(text(enrollment.halaqa_id));
    if (teacherId) staleStudentsByTeacher.set(teacherId, (staleStudentsByTeacher.get(teacherId) ?? 0) + 1);
  }

  const teacherIdsWithHalaqat = new Set(halaqaRows.map((row) => text(row.teacher_id)).filter(Boolean));
  const donationsRows = rows(donations.data);
  const issuedReceiptDonationIds = new Set(
    rows(receipts.data)
      .filter((row) => ["issued", "sent", "approved"].includes(text(row.status)))
      .map((row) => text(row.donation_id))
      .filter(Boolean),
  );
  const donorRows = rows(donors.data);
  const pledgeRows = rows(pledges.data);
  const certificateRows = rows(certificates.data);
  const volunteerRows = rows(volunteers.data);

  const readinessItems: ReadinessItem[] = [
    item("teachers-without-circles", "معلمون بلا حلقات", countWhere(teacherRows, (row) => !teacherIdsWithHalaqat.has(text(row.id))), "high", "/dashboard/teachers", "معلم نشط غير مرتبط بحلقة."),
    item("teachers-without-login", "معلمون بلا بريد دخول", countWhere(teacherRows, (row) => !text(row.email) && !text(row.auth_user_id)), "high", "/dashboard/teachers", "لا يوجد بريد أو حساب دخول مرتبط."),
    item("teachers-missing-document", "معلمون ناقصو الهوية/الإقامة", countWhere(teacherRows, (row) => !text(row.document_number)), "high", "/dashboard/teachers", "بيانات مطلوبة للرواتب والتقارير."),
    item("teachers-missing-bank", "معلمون ناقصو الآيبان/البنك", countWhere(teacherRows, (row) => !text(row.iban) || !text(row.bank_name)), "medium", "/dashboard/teachers", "تؤثر على جاهزية مسير الرواتب."),
    item("students-without-circles", "طلاب بلا حلقات", Array.isArray(circleIds) ? 0 : countWhere(allStudents, (row) => !studentIdsWithCircle.has(text(row.id))), "high", "/dashboard/students", "طالب غير مرتبط بحلقة نشطة."),
    item("students-without-progress", "طلاب بلا منجز حفظ", studentsWithoutProgress, "medium", "/dashboard/reports/student-progress", "لا يوجد أي منجز مسجل للطالب."),
    item("halaqat-without-teacher", "حلقات بلا معلم", countWhere(halaqaRows, (row) => !text(row.teacher_id)), "high", options.supervisorMode ? "/supervisor/circles" : "/dashboard/halaqat", "الحلقة لا يظهر لها معلم أساسي."),
    item("halaqat-without-students", "حلقات بلا طلاب", countWhere(halaqaRows, (row) => !halaqaIdsWithStudents.has(text(row.id))), "medium", options.supervisorMode ? "/supervisor/circles" : "/dashboard/halaqat", "الحلقة لا تحتوي طلابًا نشطين."),
    item("halaqat-without-supervisor", "حلقات بلا مشرف", countWhere(halaqaRows, (row) => !text(row.supervisor_id)), "medium", "/dashboard/halaqat", "لا يوجد مشرف محدد للحلقة."),
    item("students-stale-progress", "طلاب بلا تحديث خلال 7 أيام", staleStudents, "medium", "/dashboard/reports/student-progress", "آخر منجز أقدم من 7 أيام."),
    item("students-repeated-absence", "طلاب غيابهم متكرر", repeatedAbsenceStudents, "medium", "/dashboard/attendance", "ثلاثة غيابات أو أكثر خلال 30 يومًا."),
    item("students-repeated-late", "طلاب تأخرهم متكرر", repeatedLateStudents, "low", "/dashboard/reports/student-progress", "ثلاث حالات تأخر أو أكثر خلال 30 يومًا."),
    item("donors-without-contact", "مانحون بلا وسيلة تواصل", countWhere(donorRows, (row) => !text(row.phone) && !text(row.email)), "medium", "/dashboard/donors", "لا يوجد جوال أو بريد للتواصل."),
    item("donors-without-next-action", "مانحون بلا إجراء قادم", countWhere(donorRows, (row) => !text(row.next_action) && !text(row.next_action_date)), "low", "/dashboard/donors", "يساعد الإجراء القادم على انتظام متابعة المانحين."),
    item("donations-without-receipts", "تبرعات بلا إيصال", donationsRows.filter((row) => !["issued", "sent"].includes(text(row.receipt_status)) && !issuedReceiptDonationIds.has(text(row.id))).length, "medium", "/dashboard/receipts", "تبرعات تحتاج توثيق إيصال."),
    item("open-or-overdue-pledges", "تعهدات مفتوحة أو متأخرة", countWhere(pledgeRows, (row) => ["open", "partially_collected", "overdue"].includes(text(row.status)) || (!!text(row.due_date) && text(row.due_date) < todayKey && text(row.status) !== "collected")), "medium", "/dashboard/pledges", "تعهدات تحتاج متابعة تحصيل."),
    item("pending-meetings", "اجتماعات قيد الاعتماد", countWhere(rows(meetings.data), (row) => ["draft", "pending_review"].includes(text(row.status))), "low", "/dashboard/meetings", "محاضر لم تعتمد بعد."),
    item("pending-letters", "خطابات قيد الاعتماد", countWhere(rows(letters.data), (row) => ["draft", "ready", "pending"].includes(text(row.status))), "low", "/dashboard/letters", "خطابات تحتاج مراجعة أو اعتماد."),
    item("pending-certificates", "شهادات قيد الاعتماد", countWhere(certificateRows, (row) => ["draft", "ready", "pending"].includes(text(row.status))), "low", "/dashboard/certificates", "شهادات تحتاج مراجعة أو اعتماد."),
    item("governance-needs-update", "سياسات حوكمة تحتاج تحديث", countWhere(rows(governance.data), (row) => text(row.status) === "needs_update"), "low", "/dashboard/governance", "بنود حوكمة حالتها تحتاج تحديث."),
    item("volunteers-missing-contact-or-skills", "متطوعون ناقصو التواصل أو المهارات", countWhere(volunteerRows, (row) => !text(row.phone) && !text(row.email) || !text(row.skills)), "low", "/dashboard/volunteers", "بيانات التواصل والمهارات تساعد في توزيع الفرص التطوعية."),
  ];

  const followups: FollowupItem[] = [
    followup("stale-students", "طلاب بلا تحديث خلال 7 أيام", staleStudents, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "راجع آخر منجزات الطلاب قبل التشغيل."),
    followup("students-needs-follow-up", "طلاب تقييمهم يحتاج متابعة", needsFollowupStudents, "high", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "آخر تقييم مسجل يحتاج متابعة أو ضعيف."),
    followup("weak-students", "طلاب تقييمهم ضعيف", weakStudents, "high", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "طلاب يحتاجون عناية تعليمية مباشرة."),
    followup("repeated-absence", "طلاب غيابهم متكرر", repeatedAbsenceStudents, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/attendance", "ثلاثة غيابات أو أكثر خلال 30 يومًا."),
    followup("students-no-progress", "طلاب بلا منجز", studentsWithoutProgress, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "لا يوجد منجز حفظ أو تسميع مسجل."),
    followup("students-repeated-late", "طلاب تأخرهم متكرر", repeatedLateStudents, "low", options.supervisorMode ? "/supervisor/reports" : "/dashboard/reports/student-progress", "ثلاث حالات تأخر أو أكثر خلال 30 يومًا."),
    followup("inactive-teachers", "معلمون لم يسجلوا خلال 7 أيام", countWhere(teacherRows, (row) => !recentTeacherIds.has(text(row.id))), "medium", options.supervisorMode ? "/supervisor/circles" : "/dashboard/teachers", "لا يوجد إدخال حديث للمعلم."),
    followup("teachers-many-stale-students", "معلمون لديهم طلاب كثر بلا تحديث", [...staleStudentsByTeacher.values()].filter((count) => count >= 5).length, "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/teachers", "خمسة طلاب أو أكثر لدى المعلم بلا تحديث حديث."),
    followup("unvisited-circles", "حلقات بلا زيارة خلال 30 يومًا", countWhere(halaqaRows, (row) => !visitedRecently.has(text(row.id))), "low", options.supervisorMode ? "/supervisor/visits" : "/dashboard/reports", "لا توجد زيارة إشرافية حديثة."),
    followup("circles-without-recent-entries", "حلقات بلا إدخالات حديثة", countWhere(halaqaRows, (row) => !halaqaIdsWithRecentEntry.has(text(row.id))), "medium", options.supervisorMode ? "/supervisor/reports" : "/dashboard/halaqat", "لا توجد حصة أو منجز حديث للحلقة خلال 7 أيام."),
  ];

  const donorPipeline = {
    upcomingActions: donorRows.filter((row) => text(row.next_action) && inDateRange(text(row.next_action_date), todayKey, toDateKey(sevenDaysAhead))).length,
    noContact: donorRows.filter((row) => !text(row.last_contact_at)).length,
    openPledges: countWhere(pledgeRows, (row) => ["open", "partially_collected", "overdue"].includes(text(row.status))),
  };

  return {
    readinessItems,
    followups,
    donorPipeline,
    isReady: readinessItems.every((entry) => entry.count === 0 || entry.severity === "low"),
  };
}

function emptyReadiness(supervisorMode?: boolean) {
  return {
    readinessItems: [],
    followups: [
      followup("no-scope", "لا توجد حلقات مرتبطة", 0, "low", supervisorMode ? "/supervisor/circles" : "/dashboard/halaqat", "لا توجد بيانات ضمن النطاق الحالي."),
    ],
    donorPipeline: { upcomingActions: 0, noContact: 0, openPledges: 0 },
    isReady: true,
  };
}

function item(key: string, title: string, count: number, severity: Severity, href: string, description: string): ReadinessItem {
  return { key, title, count, severity, href, description };
}

function followup(key: string, title: string, count: number, severity: Severity, href: string, description: string): FollowupItem {
  return { key, title, count, severity, href, description };
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function text(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function countWhere(rows: Row[], fn: (row: Row) => boolean) {
  return rows.filter(fn).length;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inDateRange(value: string, start: string, end: string) {
  return Boolean(value) && value >= start && value <= end;
}
