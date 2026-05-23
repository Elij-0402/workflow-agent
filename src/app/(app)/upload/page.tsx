import { UploadForm } from "@/components/upload/upload-form";
import { PageHeader } from "@/components/page-header";

export default function UploadPage() {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <PageHeader
        title="开始新任务"
        description="上传一份小说文本，直接进入分析页。"
      />
      <UploadForm />
    </div>
  );
}
