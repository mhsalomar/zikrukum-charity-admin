import { redirect } from "next/navigation";

export default function NewDonorPage() {
  redirect("/dashboard/donors#new-record");
}
