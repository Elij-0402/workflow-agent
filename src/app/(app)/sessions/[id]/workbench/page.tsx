import { notFound } from "next/navigation";

import { loadDualSessionPageData } from "../page-data";
import { WorkbenchClient } from "./workbench-client";
import { createClient } from "@/lib/supabase/server";

type WorkbenchSearchParams = {
  step?: string;
  panel?: string;
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<WorkbenchSearchParams>;
};

export default async function WorkbenchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const dualData = await loadDualSessionPageData({
    supabase,
    sessionId: id,
    userId: user.id,
  });

  if (!dualData || dualData.session.mode !== "dual") {
    notFound();
  }

  return (
    <WorkbenchClient
      session={dualData.session}
      books={dualData.books}
      chapters={dualData.chapters}
      briefs={dualData.briefs}
      bookSynthesisByBook={dualData.bookSynthesisByBook}
      blueprintId={dualData.blueprintId}
      blueprintStatus={dualData.blueprintStatus}
      blueprintUpdatedAt={dualData.blueprintUpdatedAt}
      blueprintConfirmedAt={dualData.blueprintConfirmedAt}
      blueprint={dualData.blueprint}
      variants={dualData.variants}
      initialStep={resolveWorkbenchStep(query)}
    />
  );
}

function resolveWorkbenchStep(query: WorkbenchSearchParams) {
  if (query.panel === "results") {
    return "generate";
  }

  if (
    query.step === "upload" ||
    query.step === "analysis" ||
    query.step === "compare" ||
    query.step === "generate"
  ) {
    return query.step;
  }

  return undefined;
}
