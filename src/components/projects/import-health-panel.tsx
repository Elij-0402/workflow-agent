import {
  getBookAnalysisMode,
  getBookChapterGate,
  getBookIngestMetadata,
  getBookIngestStatus,
  getBookProviderCompatibility,
  type BookIngestMetadata,
} from "@/lib/books/content";

type ImportHealthPanelProps = {
  books: Array<{
    id: string;
    title: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

function getStatusBadge(status: ReturnType<typeof getBookIngestStatus>) {
  switch (status) {
    case "ready":
      return {
        label: "已就绪",
        className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      };
    case "ready_with_warnings":
      return {
        label: "带告警",
        className: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      };
    case "failed_needs_attention":
      return {
        label: "待处理",
        className: "border-destructive/35 bg-destructive/10 text-destructive",
      };
    case "processing":
      return {
        label: "处理中",
        className: "border-primary/30 bg-primary/10 text-primary",
      };
    default:
      return {
        label: "原文已接收",
        className: "border-border/70 bg-background/50 text-muted-foreground",
      };
  }
}

function pickTopMessages(metadata: BookIngestMetadata) {
  const issues = metadata.ingest_report?.issues ?? [];
  const errors = metadata.ingest_report?.errors ?? [];
  const messages = [...errors.map((item) => item.message), ...issues.map((item) => item.message)];
  return [...new Set(messages)].slice(0, 3);
}

function getGateStatusLabel(status: ReturnType<typeof getBookChapterGate>["status"]) {
  if (status === "pass") return "可直接分析";
  if (status === "retryable") return "可重试";
  if (status === "fallback_only") return "仅限分段分析";
  return "暂时阻断";
}

function getContentProfileLabel(profile?: BookIngestMetadata["content_profile"]) {
  if (profile === "noisy") return "噪声偏多";
  if (profile === "duplicated") return "重复偏多";
  if (profile === "adult") return "成人向";
  if (profile === "mixed") return "混合型";
  return "常规";
}

function getCompatibilityLabel(status: ReturnType<typeof getBookProviderCompatibility>["status"]) {
  if (status === "supported") return "可处理";
  if (status === "risky") return "存在风险";
  return "暂不兼容";
}

export function ImportHealthPanel({ books }: ImportHealthPanelProps) {
  return (
    <section className="surface-panel p-6">
      <div className="flex flex-col gap-2">
        <p className="eyebrow-label">导入体检</p>
        <h2 className="text-[20px] font-semibold leading-tight text-foreground">文本准备状态</h2>
        <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
          每本参考小说都会保留原文，再逐步完成编码识别、正文清洗、章节整理与质量检查。
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {books.map((book) => {
          const metadata = getBookIngestMetadata(book.metadata);
          const status = getBookIngestStatus(book.metadata);
          const badge = getStatusBadge(status);
          const topMessages = pickTopMessages(metadata);
          const gate = getBookChapterGate(book.metadata);
          const analysisMode = getBookAnalysisMode(book.metadata);
          const compatibility = getBookProviderCompatibility(book.metadata);
          const contentTags = metadata.content_risk_tags ?? [];

          return (
            <article key={book.id} className="surface-subtle grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-foreground">{book.title}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-[13px] leading-6 text-muted-foreground sm:grid-cols-2">
                  <p>编码：{metadata.encoding ?? "待识别"}</p>
                  <p>
                    置信度：
                    {typeof metadata.decoder_confidence === "number"
                      ? `${Math.round(metadata.decoder_confidence * 100)}%`
                      : "待生成"}
                  </p>
                  <p>清洗结果：{metadata.cleaned_content_mode ?? "待生成"}</p>
                  <p>章节质量：{metadata.chapter_detection_quality ?? "待评估"}</p>
                  <p>分析路线：{analysisMode === "block-fallback" ? "降级大块" : "标准逐章"}</p>
                  <p>章节门禁：{getGateStatusLabel(gate.status)}</p>
                  <p>内容画像：{getContentProfileLabel(metadata.content_profile)}</p>
                  <p>模型兼容：{getCompatibilityLabel(compatibility.status)}</p>
                </div>
                {contentTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {contentTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[4px] border border-border/70 bg-background/35 px-4 py-3">
                <p className="data-label">诊断信息</p>
                {topMessages.length > 0 ? (
                  <ul className="mt-3 grid gap-2 text-[13px] leading-6 text-foreground">
                    {topMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                    当前没有额外告警，可以继续进入后续分析流程。
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
