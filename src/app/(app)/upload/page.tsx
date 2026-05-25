import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DualUploadForm } from "@/components/upload/dual-upload-form";
import { UploadForm } from "@/components/upload/upload-form";
import { resolveUploadRoute } from "@/lib/upload/route";

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
  const sessionId = sp.sessionId ?? undefined;
  const position =
    sp.position === "1" ? 1 : sp.position === "0" ? 0 : undefined;
  const route = resolveUploadRoute({ mode: sp.mode, sessionId });

  if (route.kind === "selector") {
    redirect("/create");
  }

  const addingSecondBook = route.kind === "supplement";
  const showDual = route.kind === "dual" || addingSecondBook;

  return (
    <div className="app-page">
      <PageHeader
        label="import"
        title={
          addingSecondBook
            ? "补充参考书 2"
            : showDual
              ? "新建双书项目"
              : "进入兼容旧流程"
        }
        description={
          addingSecondBook
            ? "把第 2 本参考小说补充到当前任务。上传完成后会回到蓝图工作台。"
            : showDual
              ? "导入两本参考书，上传完成后进入双书蓝图工作台，完成分析、蓝图确认与生成。"
              : "这是保留给单书任务的兼容入口。导入一本文本后，会进入旧版分析与生成流程。"
        }
      />
      {addingSecondBook ? (
        <UploadForm
          mode="dual"
          sessionId={sessionId}
          position={position as 0 | 1 | undefined}
        />
      ) : showDual ? (
        <DualUploadForm />
      ) : (
        <UploadForm mode="single" />
      )}
    </div>
  );
}
