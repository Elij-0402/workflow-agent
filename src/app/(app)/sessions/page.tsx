import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">会话历史</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          每一次完整的「上传 → 分析 → 生成」流程会保存为一个会话。
        </p>
      </div>
      {sessions && sessions.length > 0 ? (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Card key={s.id} className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription className="text-xs">
                    创建于 {formatDate(s.created_at)}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">
                  {s.status}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              还没有会话。上传第一部小说后会自动创建。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
