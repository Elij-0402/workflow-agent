import type { Metadata, Viewport } from "next";
import {
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
  preload: true,
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

const zhSerif = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-zh-serif",
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

const zhSans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-zh-sans",
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "NovelFusion · Atelier",
  description: "多源小说智能分析与变体生成工作室",
};

export const viewport: Viewport = {
  themeColor: "#0E0F0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`dark ${display.variable} ${sans.variable} ${mono.variable} ${zhSerif.variable} ${zhSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster
          richColors
          position="top-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast:
                "border border-border bg-card text-foreground rounded-[3px] font-mono text-[12px]",
              title: "font-sans text-[13px]",
              description: "font-sans text-[12px] text-muted-foreground",
              success: "border-l-[3px] border-l-flash",
              error: "border-l-[3px] border-l-destructive",
              info: "border-l-[3px] border-l-primary",
            },
          }}
        />
      </body>
    </html>
  );
}
