import Link from "next/link";

import { UploadForm } from "@/components/upload/upload-form";
import { DualUploadForm } from "@/components/upload/dual-upload-form";
import { PageHeader } from "@/components/page-header";

type SP = Promise<{
  mode?: string;
  sessionId?: string;
  position?: string;
}>;

export default async function UploadPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const mode = sp.mode === "dual" ? "dual" : "single";
  const sessionId = sp.sessionId ?? undefined;
  const position = sp.position === "1" ? 1 : sp.position === "0" ? 0 : undefined;
  const addingSecondBook = Boolean(sessionId);
  const dualFreshStart = mode === "dual" && !addingSecondBook;

  return (
    <div className="app-page">
      <PageHeader
        label="import"
        title={addingSecondBook ? "上传第 2 本书" : dualFreshStart ? "开始双书任务" : "开始新任务"}
        description={
          addingSecondBook
            ? "把第 2 本书追加到当前双书任务。上传完成后会回到工作台。"
            : dualFreshStart
              ? "两本书的章节会合并成蓝图，再生成融合文本。可以一次性上传两本，也可以只传 A、之后再补 B。"
              : "导入一份小说文本，系统会创建新的研究任务，并把清洗后的内容接入后续分析与生成流程。"
        }
      />
      {addingSecondBook || dualFreshStart ? null : <ModePicker current={mode} />}
      {dualFreshStart ? (
        <DualUploadForm />
      ) : (
        <UploadForm
          mode={mode as "single" | "dual"}
          sessionId={sessionId}
          position={position as 0 | 1 | undefined}
        />
      )}
    </div>
  );
}

function ModePicker({ current }: { current: "single" | "dual" }) {
  return (
    <div className="surface-panel flex items-center gap-1 border-b border-border px-4 py-2.5">
      <Tab href="/upload?mode=single" active={current === "single"} label="single" />
      <Tab href="/upload?mode=dual" active={current === "dual"} label="dual" />
      <p className="ml-auto pr-2 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
        {current === "dual"
          ? "// dual · 两本书融合成新文本"
          : "// single · 标准三维分析 + 一键生成"}
      </p>
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} data-active={active} className="terminal-tab">
      [ {label} ]
    </Link>
  );
}
