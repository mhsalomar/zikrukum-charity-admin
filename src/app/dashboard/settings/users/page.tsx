import { redirect } from "next/navigation";

export default function SettingsUsersRedirectPage() {
  redirect("/dashboard/users");
}
