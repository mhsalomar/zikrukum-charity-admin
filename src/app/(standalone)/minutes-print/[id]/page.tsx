import Image from "next/image";

import { requireAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { executiveRoles } from "@/lib/module-access";
import { PrintButton } from "@/components/print-button";

type PageProps = { params: Promise<{ id: string }> };
type BoardMember = { id: string; full_name: string; position: string | null; signature_url?: string | null };

const meetingTypeLabel: Record<string, string> = {
  board: "مجلس إدارة",
  committee: "لجنة",
  work_team: "فريق عمل",
  general_assembly: "جمعية عمومية",
  other: "أخرى",
};

const boardPositionLabel: Record<string, string> = {
  chairman: "رئيس مجلس الإدارة",
  "رئيس مجلس الإدارة": "رئيس مجلس الإدارة",
  "رئيس المجلس": "رئيس مجلس الإدارة",
  vice_chairman: "نائب رئيس مجلس الإدارة",
  "نائب رئيس مجلس الإدارة": "نائب رئيس مجلس الإدارة",
  "نائب الرئيس": "نائب رئيس مجلس الإدارة",
  secretary: "أمين السر",
  "أمين السر": "أمين السر",
  treasurer: "أمين الصندوق",
  "أمين الصندوق": "أمين الصندوق",
  member: "عضو مجلس الإدارة",
  board_member: "عضو مجلس الإدارة",
  "عضو مجلس الإدارة": "عضو مجلس الإدارة",
  "عضو مجلس": "عضو مجلس الإدارة",
  committee_member: "عضو لجنة",
  "عضو لجنة": "عضو لجنة",
};

const positionSortOrder: Record<string, number> = {
  chairman: 0,
  "رئيس مجلس الإدارة": 0,
  "رئيس المجلس": 0,
  vice_chairman: 1,
  "نائب رئيس مجلس الإدارة": 1,
  "نائب الرئيس": 1,
  secretary: 2,
  "أمين السر": 2,
  treasurer: 3,
  "أمين الصندوق": 3,
  member: 4,
  board_member: 4,
  "عضو مجلس الإدارة": 4,
  "عضو مجلس": 4,
  committee_member: 5,
  "عضو لجنة": 5,
};

export default async function MinutesPrintPage({ params }: PageProps) {
  await requireAnyRole([...executiveRoles, "admin", "demo_admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: meeting },
    { data: boardMembers },
    { data: agendaItems },
    { data: decisionsData },
    { data: tablesData },
    { data: attendanceData },
    { data: signaturesData },
  ] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("board_members")
      .select("id,full_name,position,signature_url,status")
      .eq("status", "active")
      .is("archived_at", null)
      .order("full_name"),
    supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", id)
      .order("order_num"),
    supabase
      .from("meeting_decisions_structured")
      .select("*")
      .eq("meeting_id", id)
      .order("order_num"),
    supabase
      .from("meeting_attached_tables")
      .select("*")
      .eq("meeting_id", id)
      .order("created_at"),
    supabase
      .from("meeting_attendance")
      .select("board_member_id,is_present")
      .eq("meeting_id", id),
    supabase
      .from("meeting_signatures")
      .select("board_member_id,signature_image_url")
      .eq("meeting_id", id),
  ]);

  if (!meeting) {
    return (
      <div className="p-10 text-center text-sm text-gray-500">
        لم يتم العثور على الاجتماع.
      </div>
    );
  }

  const attendanceMap: Record<string, boolean> = {};
  (attendanceData ?? []).forEach((a: { board_member_id: string; is_present: boolean }) => {
    attendanceMap[a.board_member_id] = a.is_present;
  });

  const sigMap: Record<string, string> = {};
  (signaturesData ?? []).forEach((s: { board_member_id: string; signature_image_url: string | null }) => {
    if (s.signature_image_url) sigMap[s.board_member_id] = s.signature_image_url;
  });

  const agendaById: Record<string, string> = {};
  (agendaItems ?? []).forEach((a: { id: string; order_num: number; title: string }) => {
    agendaById[a.id] = `${a.order_num}. ${a.title}`;
  });

  const orderedBoardMembers = [...(boardMembers ?? [])].sort(
    (a: { full_name: string; position: string | null }, b: { full_name: string; position: string | null }) => {
      const aOrder = getPositionOrder(a.position);
      const bOrder = getPositionOrder(b.position);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""), "ar");
    },
  );

  const presentMembers = orderedBoardMembers.filter(
    (m: { id: string }) => attendanceMap[m.id] !== false,
  );
  const absentMembers = orderedBoardMembers.filter(
    (m: { id: string }) => attendanceMap[m.id] === false,
  );

  const meetingDate = formatOfficialMeetingDate(meeting.meeting_date);

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm 12mm; }
        html, body { background: #f3f0e8; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          nav, aside { display: none !important; }
          table, tr, section { break-inside: avoid; page-break-inside: avoid; }
          img { object-fit: contain; }
        }
      `}</style>

      <main className="min-h-screen py-4 print:min-h-0 print:py-0" dir="rtl">
      <div className="mx-auto w-[794px] max-w-full bg-white px-8 pb-8 pt-3 shadow-xl shadow-black/10 print:w-auto print:max-w-none print:px-0 print:pb-0 print:pt-0 print:shadow-none">
        <div className="no-print mb-3 flex justify-end gap-2 print:hidden">
          <PrintButton />
        </div>

        <MeetingMinutesLetterhead />

        <MeetingDetailsTable
          title={meeting.title}
          type={meetingTypeLabel[meeting.meeting_type] ?? meeting.meeting_type ?? "اجتماع"}
          date={meetingDate || "—"}
          location={meeting.location || "مقر الجمعية"}
          startTime={formatMeetingTime(meeting.start_time)}
          endTime={formatMeetingTime(meeting.end_time)}
        />

        {orderedBoardMembers.length > 0 && (
          <ParticipantsTable
            members={orderedBoardMembers as BoardMember[]}
            attendanceMap={attendanceMap}
            presentCount={presentMembers.length}
            absentCount={absentMembers.length}
          />
        )}

        {/* Agenda */}
        {(agendaItems ?? []).length > 0 && (
          <Section title="محاور الاجتماع">
            <ol className="space-y-2 text-sm">
              {(agendaItems ?? []).map(
                (item: { id: string; order_num: number; title: string; notes: string | null }) => (
                  <li key={item.id}>
                    <span className="font-semibold">
                      {item.order_num}. {item.title}
                    </span>
                    {item.notes && (
                      <p className="mt-0.5 text-xs text-gray-500">{item.notes}</p>
                    )}
                  </li>
                ),
              )}
            </ol>
          </Section>
        )}

        {/* Decisions */}
        {(decisionsData ?? []).length > 0 && (
          <Section title="القرارات والتوصيات">
            <ol className="space-y-2 text-sm">
              {(decisionsData ?? []).map(
                (d: { id: string; order_num: number; content: string; agenda_item_id: string | null; status: string }) => (
                  <li key={d.id}>
                    <span className="font-semibold">{d.order_num}.</span>{" "}
                    {d.content}
                    {d.agenda_item_id && agendaById[d.agenda_item_id] && (
                      <span className="mr-2 text-xs text-gray-400">
                        ({agendaById[d.agenda_item_id]})
                      </span>
                    )}
                    <DecisionBadge status={d.status} />
                  </li>
                ),
              )}
            </ol>
          </Section>
        )}

        {/* Attached tables */}
        {(tablesData ?? []).map(
          (tbl: { id: string; title: string; rows: Array<{ item: string; amount: string; notes: string }> }) => {
            const total = (tbl.rows ?? []).reduce((sum: number, r) => {
              const n = parseFloat(String(r.amount ?? "").replace(/,/g, ""));
              return sum + (isNaN(n) ? 0 : n);
            }, 0);
            return (
              <Section key={tbl.id} title={tbl.title}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                  <tr className="bg-[#f4efe3] text-xs text-gray-700">
                      <th className="border border-gray-300 p-2 text-right">
                        البند
                      </th>
                      <th className="border border-gray-300 p-2 text-right">
                        المبلغ
                      </th>
                      <th className="border border-gray-300 p-2 text-right">
                        الملاحظات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tbl.rows ?? []).map(
                      (
                        row: { item: string; amount: string; notes: string },
                        i: number,
                      ) => (
                        <tr key={i}>
                          <td className="border border-gray-300 p-2">
                            {row.item}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {row.amount}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {row.notes}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border border-gray-300 p-2 text-xs">
                        الإجمالي
                      </td>
                      <td className="border border-gray-300 p-2 text-xs">
                        {total.toLocaleString("ar-SA")}
                      </td>
                      <td className="border border-gray-300 p-2" />
                    </tr>
                  </tfoot>
                </table>
              </Section>
            );
          },
        )}

        {/* Signatures */}
        {orderedBoardMembers.length > 0 && (
          <Section title="التوقيعات والاعتماد">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#f4efe3] text-right text-xs text-gray-700">
                  <th className="border border-gray-300 p-2">م</th>
                  <th className="border border-gray-300 p-2">الاسم</th>
                  <th className="border border-gray-300 p-2">المنصب</th>
                  <th className="border border-gray-300 p-2">الحضور</th>
                  <th className="border border-gray-300 p-2">التوقيع</th>
                </tr>
              </thead>
              <tbody>
                {orderedBoardMembers.map(
                  (
                    m: BoardMember,
                    i: number,
                  ) => {
                    const present = attendanceMap[m.id] !== false;
                    const sigUrl = getMemberSignatureUrl(m.id, sigMap[m.id] ?? m.signature_url);
                    return (
                      <tr
                        key={m.id}
                        className={present ? "" : "opacity-40"}
                      >
                        <td className="border border-gray-300 p-2 text-center text-xs">
                          {i + 1}
                        </td>
                        <td className="border border-gray-300 p-2 font-semibold">
                          {m.full_name}
                        </td>
                        <td className="border border-gray-300 p-2 text-xs text-gray-700">
                          {formatBoardPosition(m.position)}
                        </td>
                        <td className="border border-gray-300 p-2 text-center text-xs">
                          {present ? "حاضر" : "غائب"}
                        </td>
                        <td className="border border-gray-300 p-2" style={{ minHeight: 56 }}>
                          {!present ? (
                            <span className="text-xs font-bold text-gray-500">غائب</span>
                          ) : sigUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sigUrl}
                              alt={`توقيع ${m.full_name}`}
                              className="mx-auto h-12 max-h-12 max-w-[130px] object-contain"
                            />
                          ) : (
                            <span className="text-xs font-bold text-gray-500">لا يوجد توقيع محفوظ</span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </Section>
        )}

      </div>
      </main>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="mb-2 border-b border-[#b58a3a]/40 pb-1 text-base font-semibold text-[#0b5d42]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MeetingMinutesLetterhead() {
  return (
    <header className="mb-4">
      <div className="relative min-h-[86px] border-b-2 border-[#0b5d42] pb-4">
        <Image
          src="/logo-zikrukum-transparent.png"
          alt="شعار جمعية ذكركم"
          width={220}
          height={90}
          priority
          unoptimized
          className="absolute right-0 top-0 h-20 w-auto object-contain"
        />
        <div className="pr-48 pt-2 text-right">
          <p className="text-base font-semibold text-[#0b5d42]">
            جمعية ذكركم لتحفيظ القرآن الكريم بالعيون
          </p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <h1 className="text-2xl font-bold text-[#0b5d42]">محضر اجتماع</h1>
        <div className="mx-auto mt-3 flex h-[3px] w-40 overflow-hidden rounded-full">
          <span className="flex-1 bg-[#0b5d42]" />
          <span className="w-12 bg-[#b58a3a]" />
        </div>
      </div>
    </header>
  );
}

function MeetingDetailsTable({
  title,
  type,
  date,
  location,
  startTime,
  endTime,
}: {
  title: string;
  type: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
}) {
  return (
    <table className="mt-4 w-full table-fixed border-collapse text-sm">
      <tbody>
        <tr>
          <th className="w-24 border border-[#315e37] bg-[#2f7d32] p-2 text-center font-semibold leading-7 text-white" rowSpan={3}>
            محضر
            <br />
            اجتماع
          </th>
          <th className="border border-[#315e37] bg-[#dcefd5] p-2 text-center font-semibold text-[#0b3f2d]" colSpan={6}>
            موضوع الاجتماع
          </th>
        </tr>
        <tr>
          <td className="border border-[#315e37] p-3 text-center font-semibold" colSpan={6}>
            {title || type}
          </td>
        </tr>
        <tr>
          <th className="border border-[#315e37] bg-[#2f7d32] p-2 text-center text-xs font-semibold text-white">
            مكان الاجتماع
          </th>
          <td className="border border-[#315e37] p-2 text-center font-bold">
            {location}
          </td>
          <th className="border border-[#315e37] bg-[#2f7d32] p-2 text-center text-xs font-semibold text-white">
            تاريخ الاجتماع
          </th>
          <td className="border border-[#315e37] p-2 text-center font-bold">
            {date}
          </td>
          <th className="border border-[#315e37] bg-[#2f7d32] p-2 text-center text-xs font-semibold text-white">
            وقت الاجتماع
          </th>
          <td className="border border-[#315e37] p-2 text-center font-bold">
            {startTime}
            {endTime && endTime !== "—" ? ` - ${endTime}` : ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ParticipantsTable({
  members,
  attendanceMap,
  presentCount,
  absentCount,
}: {
  members: BoardMember[];
  attendanceMap: Record<string, boolean>;
  presentCount: number;
  absentCount: number;
}) {
  return (
    <section className="mt-4 break-inside-avoid">
      <table className="w-full table-fixed border-collapse text-sm">
        <tbody>
          <tr>
            <th
              className="w-24 border border-[#315e37] bg-[#2f7d32] p-2 text-center font-semibold text-white"
              rowSpan={members.length + 2}
            >
              المشاركون
            </th>
            <th className="w-12 border border-[#315e37] bg-[#dcefd5] p-2 text-center font-semibold text-[#0b3f2d]">
              م
            </th>
            <th className="border border-[#315e37] bg-[#dcefd5] p-2 text-center font-semibold text-[#0b3f2d]">
              الاسم
            </th>
            <th className="w-44 border border-[#315e37] bg-[#dcefd5] p-2 text-center font-semibold text-[#0b3f2d]">
              المنصب
            </th>
            <th className="w-24 border border-[#315e37] bg-[#dcefd5] p-2 text-center font-semibold text-[#0b3f2d]">
              الحضور
            </th>
          </tr>
          {members.map((member, index) => {
            const present = attendanceMap[member.id] !== false;
            return (
              <tr key={member.id} className={present ? "" : "text-[#6b7280]"}>
                <td className="border border-[#315e37] p-2 text-center font-bold">{index + 1}</td>
                <td className="border border-[#315e37] p-2 font-semibold">{member.full_name}</td>
                <td className="border border-[#315e37] p-2 text-center font-bold">{formatBoardPosition(member.position)}</td>
                <td className="border border-[#315e37] p-2 text-center font-bold">{present ? "حاضر" : "غائب"}</td>
              </tr>
            );
          })}
          <tr className="bg-[#fff8e6] text-xs font-semibold text-[#0b3f2d]">
            <td className="border border-[#315e37] p-2 text-center" colSpan={2}>
              الحاضرون: {presentCount}
            </td>
            <td className="border border-[#315e37] p-2 text-center" colSpan={2}>
              الغائبون: {absentCount}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function formatBoardPosition(position?: string | null) {
  if (!position) return "عضو";
  const key = String(position).trim();
  return boardPositionLabel[key] ?? boardPositionLabel[key.toLowerCase()] ?? "عضو";
}

function getPositionOrder(position?: string | null) {
  if (!position) return 9;
  const key = String(position).trim().toLowerCase();
  return positionSortOrder[key] ?? 9;
}

function getMemberSignatureUrl(memberId: string, storedUrl?: string | null) {
  if (!storedUrl) return "";
  return `/api/board-member-signatures/${memberId}`;
}

function formatMeetingTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function formatGregorianMeetingDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date).replaceAll("-", "/") + "م";
}

function formatOfficialMeetingDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const gregorian = formatGregorianMeetingDate(value);

  try {
    const hijriParts = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Riyadh",
    }).formatToParts(date);
    const day = hijriParts.find((part) => part.type === "day")?.value;
    const month = hijriParts.find((part) => part.type === "month")?.value;
    const year = hijriParts.find((part) => part.type === "year")?.value;
    if (day && month && year) {
      return `${gregorian} الموافق ${day}/${month}/${year}هـ`;
    }
  } catch {
    // Gregorian date is enough when Hijri formatting is unavailable.
  }

  return gregorian;
}

function DecisionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    approved: { label: "معتمد", color: "bg-green-100 text-green-800" },
    follow_up: { label: "للمتابعة", color: "bg-yellow-100 text-yellow-800" },
    postponed: { label: "مؤجل", color: "bg-gray-100 text-gray-700" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span
      className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.color}`}
    >
      {s.label}
    </span>
  );
}
