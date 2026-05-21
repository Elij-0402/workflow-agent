"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:rounded-[3px] group-[.toaster]:shadow-brass-soft group-[.toaster]:font-sans group-[.toaster]:text-[13px]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[12px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-[2px] group-[.toast]:font-mono group-[.toast]:uppercase group-[.toast]:tracking-[0.08em] group-[.toast]:text-[11px]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-[2px]",
          success: "group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-flash",
          error: "group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-destructive",
          info: "group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-primary",
          warning: "group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
