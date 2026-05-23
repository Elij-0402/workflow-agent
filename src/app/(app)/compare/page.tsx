import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ANALYSIS_DIMENSION_CONFIG, EXTENDED_ANALYSIS_DIMENSION_CONFIG } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisDimension } from "@/lib/types";

import { CompareClient, type CompareBook } from "./CompareClient";

const MAX_BOOKS = 6;

type SearchParams = Promise<{ sessionIds?: string | string[] }>;

function normalizeIds(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const flat = Array.isArray(raw) ? raw : [raw];
  const ids = flat
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sessionIds = normalizeIds(params.sessionIds);
  const supabase = await createClient();

  if (sessionIds.length === 0) {
    return (
      <div className="app-page">
        <PageHeader
          label="compare"
          title="多书并排比较"
          description="在「我的项目」选择多个项目后，跳转到本页可以并排查看分析结果。"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/sessions">去选择项目</Link>
            </Button>
          }
        />
        <div className="surface-panel px-6 py-12 text-center">
          <p className="text-[13.5px] leading-7 text-muted-foreground">还没有选择任何项目。</p>
        </div>
      </div>
    );
  }

  const limited = sessionIds.slice(0, MAX_BOOKS);

  const [{ data: sessions }, { data: books }] = await Promise.all([
    supabase.from("sessions").select("id, name, mode").in("id", limited),
    supabase.from("books").select("id, session_id, title, position").in("session_id", limited),
  ]);

  const safeSessions = sessions ?? [];
  const safeBooks = books ?? [];

  if (safeBooks.length === 0) {
    return (
      <div className="app-page">
        <PageHeader
          label="compare"
          title="多书并排比较"
          description="选中的项目尚无书籍数据。"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/sessions">返回项目列表</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const bookIds = safeBooks.map((b) => b.id);
  const { data: analyses } = await supabase
    .from("analyses")
    .select("book_id, dimension, result")
    .in("book_id", bookIds);

  const validDimensions = new Set<AnalysisDimension>([
    ...(Object.keys(ANALYSIS_DIMENSION_CONFIG) as AnalysisDimension[]),
    ...(Object.keys(EXTENDED_ANALYSIS_DIMENSION_CONFIG) as AnalysisDimension[]),
  ]);

  const sessionById = new Map(safeSessions.map((s) => [s.id, s]));
  const analysesByBook = new Map<string, Map<AnalysisDimension, unknown>>();
  for (const a of analyses ?? []) {
    if (!a.book_id || !a.dimension) continue;
    const dim = a.dimension as AnalysisDimension;
    if (!validDimensions.has(dim)) continue;
    const bookMap = analysesByBook.get(a.book_id) ?? new Map();
    bookMap.set(dim, a.result);
    analysesByBook.set(a.book_id, bookMap);
  }

  const compareBooks: CompareBook[] = safeBooks.slice(0, MAX_BOOKS).map((b) => {
    const session = sessionById.get(b.session_id);
    const sessionName = session?.name ?? "未命名项目";
    const displayTitle =
      session?.mode === "dual"
        ? `${sessionName} · ${b.position === 0 ? "A" : "B"} · ${b.title}`
        : `${sessionName} · ${b.title}`;
    return {
      bookId: b.id,
      sessionId: b.session_id,
      displayTitle,
      analyses: Object.fromEntries(analysesByBook.get(b.id) ?? new Map()) as Partial<
        Record<AnalysisDimension, unknown>
      >,
    };
  });

  return (
    <div className="app-page">
      <PageHeader
        label="compare"
        title="多书并排比较"
        description={`正在比较 ${compareBooks.length} 本书（最多 ${MAX_BOOKS} 本）。横向滚动查看更多书。`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">返回项目列表</Link>
          </Button>
        }
      />
      <CompareClient books={compareBooks} />
    </div>
  );
}
