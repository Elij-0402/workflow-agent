import { UploadForm } from "@/components/upload/upload-form";
import { DualUploadForm } from "@/components/upload/dual-upload-form";
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
  const sessionId = sp.sessionId ?? undefined;
  const position =
    sp.position === "1" ? 1 : sp.position === "0" ? 0 : undefined;
  const addingSecondBook = Boolean(sessionId);

  return (
    <div className="app-page">
      <PageHeader
        label="import"
        title={addingSecondBook ? "补充第 2 本小说" : "新建任务"}
        description={
          addingSecondBook
            ? "把第 2 本小说追加到当前任务。上传完成后会回到任务流程页。"
            : "一次上传两本小说，然后顺着完成分析、对比和生成。书 B 可留空，稍后补传。"
        }
      />
      {addingSecondBook ? (
        <UploadForm
          mode="dual"
          sessionId={sessionId}
          position={position as 0 | 1 | undefined}
        />
      ) : (
        <DualUploadForm />
      )}
    </div>
  );
}
