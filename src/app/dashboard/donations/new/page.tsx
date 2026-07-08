import { redirect } from "next/navigation";

export default function NewDonationPage() {
  redirect("/dashboard/donations#new-record");
}
