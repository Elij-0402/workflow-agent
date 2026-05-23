"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CheckCircle2
            className="h-4 w-4 text-flash"
            strokeWidth={1.75}
            aria-hidden
          />
        ),
        error: (
          <AlertCircle
            className="h-4 w-4 text-destructive"
            strokeWidth={1.75}
            aria-hidden
          />
        ),
        warning: (
          <AlertTriangle
            className="h-4 w-4 text-brass-soft"
            strokeWidth={1.75}
            aria-hidden
          />
        ),
        info: (
          <Info
            className="h-4 w-4 text-chart-4"
            strokeWidth={1.75}
            aria-hidden
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:rounded-[3px] group-[.toaster]:shadow-brass-soft group-[.toaster]:font-sans group-[.toaster]:text-[13px] group-[.toaster]:items-start group-[.toaster]:gap-3",
          icon: "group-[.toast]:mt-0.5",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:text-[12px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-[2px] group-[.toast]:font-mono group-[.toast]:uppercase group-[.toast]:tracking-[0.08em] group-[.toast]:text-[11px]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-[2px]",
          success:
            "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-flash",
          error:
            "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-destructive",
          info: "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-chart-4",
          warning:
            "group-[.toaster]:border-l-[4px] group-[.toaster]:border-l-brass-soft",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
