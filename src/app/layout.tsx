import type { Metadata, Viewport } from "next";
import {
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { appBackgroundColor } from "@/lib/theme";
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
  title: "NovelFusion",
  description: "多源小说智能分析与变体生成工作室",
};

export const viewport: Viewport = {
  themeColor: appBackgroundColor(),
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
        <Toaster />
      </body>
    </html>
  );
}
