import { redirect } from "next/navigation";

export default function ArchivedSessionsPage() {
  redirect("/sessions?view=archived");
}
