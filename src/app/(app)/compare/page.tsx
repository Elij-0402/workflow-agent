import { redirect } from "next/navigation";

type SearchParams = Promise<{ sessionIds?: string | string[] }>;

function normalizeIds(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const flat = Array.isArray(raw) ? raw : [raw];
  return Array.from(
    new Set(
      flat
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionIds = normalizeIds(params.sessionIds);
  if (sessionIds[0]) {
    redirect(`/sessions/${sessionIds[0]}?step=compare`);
  }
  redirect("/sessions");
}
