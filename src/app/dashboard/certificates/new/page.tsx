import { redirect } from "next/navigation";

export default function NewCertificatePage() {
  redirect("/dashboard/certificates#new-record");
}
