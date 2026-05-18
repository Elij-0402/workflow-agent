import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function UploadStubPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Construction className="h-5 w-5" />
          </div>
          <CardTitle>上传页 · Week 2 实现</CardTitle>
          <CardDescription>
            将支持 .txt 拖拽上传、客户端 GBK/UTF-8 检测、章节切分预览。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          当前版本：Week 1 仅完成认证与基础框架。
        </CardContent>
      </Card>
    </div>
  );
}
