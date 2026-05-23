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
        description="冷色暗底、靛蓝主色与 Instrument Serif 标题；token 与 globals.css 一致，作为后续页面的视觉与交互锚点。"
      />
      <DesignSystemClient />
    </div>
  );
}
