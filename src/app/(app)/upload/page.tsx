import { UploadForm } from "@/components/upload/upload-form";
import { PageHeader } from "@/components/page-header";

export default function UploadPage() {
  return (
    <div className="app-page">
      <PageHeader
        label="Import"
        title="开始新任务"
        description="导入一份小说文本，系统会创建新的研究任务，并把清洗后的内容接入后续分析与生成流程。"
      />
      <UploadForm />
    </div>
  );
}
