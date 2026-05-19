import { UploadForm } from "@/components/upload/upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="max-w-2xl space-y-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          上传小说
        </p>
        <h1 className="text-[26px] font-medium tracking-tight sm:text-[30px]">
          新建分析任务
        </h1>
        <p className="text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          上传 `.txt` 小说后，原始文件会先直传私有存储，系统再识别编码、清洗文本并写入章节元数据，然后进入三维度分析详情页。
        </p>
      </div>

      <div className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
        本轮分析固定基于前约 8 万字符，用于快速验证分析质量。原始文件与清洗后文本都会保留，方便后续升级更深的章节级分析。
      </div>

      <UploadForm />
    </div>
  );
}
