import { PageHeader } from "@/components/page-header";

import { DesignSystemClient } from "./design-system-client";

export const metadata = {
  title: "设计系统",
};

export default function DesignSystemPage() {
  return (
    <div className="app-page">
      <PageHeader
        label="design system"
        title="Linear 风格指南"
        description="保留 NovelFusion 的暖色暗调与 Serif 标题，去除 Atelier Terminal 装饰，作为后续所有页面的视觉与交互锚点。"
      />
      <DesignSystemClient />
    </div>
  );
}
