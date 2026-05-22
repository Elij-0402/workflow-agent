import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function WorkbenchPage({ params }: Props) {
  const { id } = await params;
  redirect(`/sessions/${id}`);
}
