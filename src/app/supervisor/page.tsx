import { redirect } from "next/navigation";

export default function SupervisorRootRedirectPage() {
  redirect("/supervisor/dashboard");
}
