import * as React from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

/**
 * Label + hint + control + error stack. Use as the canonical form-row container
 * across brief-editor, upload-form, generate-form-fields, settings, etc.
 */
export function FormField({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mono-label-sm flex items-center gap-1.5 text-foreground/85"
        >
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="text-[11.5px] leading-5 text-muted-foreground/80">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[11.5px] leading-5 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
