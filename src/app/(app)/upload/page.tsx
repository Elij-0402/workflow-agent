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
        title={addingSecondBook ? "补充参考书 2" : "创建双书融合任务"}
        description={
          addingSecondBook
            ? "把第 2 本参考小说补充到当前任务。上传完成后会回到蓝图工作台。"
            : "导入两本参考小说，系统会分析、整合情节与创意，然后带你进入蓝图工作台继续生成衍生小说。"
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
