const ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/studio", title: "创作台" },
  { prefix: "/compare", title: "对比" },
  { prefix: "/library", title: "资料库" },
  { prefix: "/settings", title: "设置" },
  { prefix: "/upload", title: "导入参考书" },
  { prefix: "/create", title: "创建项目" },
];

export function resolveShellTitle(pathname: string): string {
  if (pathname === "/sessions") {
    return "项目";
  }

  if (pathname.includes("/workbench")) {
    return "工作台";
  }

  for (const { prefix, title } of ROUTE_TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  if (pathname.startsWith("/sessions/")) {
    return "项目";
  }

  return "工作台";
}

export function shouldShowSessionsNextHint(pathname: string): boolean {
  return pathname === "/sessions" || pathname === "/";
}
