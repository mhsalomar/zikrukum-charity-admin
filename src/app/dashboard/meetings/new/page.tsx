import { redirect } from "next/navigation";

export default function NewMeetingPage() {
  redirect("/dashboard/meetings");
}
