import Link from "next/link";

import { UploadForm } from "@/components/upload/upload-form";
import { PageHeader } from "@/components/page-header";

type SP = Promise<{
  mode?: string;
  sessionId?: string;
  position?: string;
}>;

export default async function UploadPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "dual" ? "dual" : "single";
  const sessionId = sp.sessionId ?? undefined;
  const position =
    sp.position === "1" ? 1 : sp.position === "0" ? 0 : undefined;
  const addingSecondBook = Boolean(sessionId);

  return (
    <div className="app-page">
      <PageHeader
        label="Import"
        title={addingSecondBook ? "上传第 2 本书" : "开始新任务"}
        description={
          addingSecondBook
            ? "把第 2 本书追加到当前双书任务。上传完成后会回到工作台。"
            : "导入一份小说文本，系统会创建新的研究任务，并把清洗后的内容接入后续分析与生成流程。"
        }
      />
      {addingSecondBook ? null : <ModePicker current={mode} />}
      <UploadForm
        mode={mode as "single" | "dual"}
        sessionId={sessionId}
        position={position as 0 | 1 | undefined}
      />
    </div>
  );
}

function ModePicker({ current }: { current: "single" | "dual" }) {
  return (
    <div className="surface-panel mb-3 flex gap-2 p-2 text-[12px]">
      <Tab href="/upload?mode=single" active={current === "single"} label="单书任务" />
      <Tab href="/upload?mode=dual" active={current === "dual"} label="双书对照" />
      <p className="ml-auto self-center pr-2 text-muted-foreground">
        {current === "dual" ? "首次上传会创建空双书任务，到工作台再追加第 2 本。" : "标准三维分析 + 一键生成。"}
      </p>
    </div>
  );
}

function Tab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-[6px] bg-accent px-3 py-1 text-foreground"
          : "px-3 py-1 text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
