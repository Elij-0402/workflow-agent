"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { GenerateConfig } from "@/lib/types";

import { AdvancedOptions, QuickGenerateForm } from "./generate-form-fields";

type GenerateFormProps = {
  form: UseFormReturn<GenerateConfig>;
  pending: boolean;
  disabled: boolean;
  innovation: number;
  variantCount: number;
  footerNote: string;
  submitLabel: string;
  pendingLabel?: string;
  advancedToggleClassName?: string;
  onSubmit: (values: GenerateConfig) => void | Promise<void>;
  footer?: ReactNode;
};

export function GenerateForm({
  form,
  pending,
  disabled,
  innovation,
  variantCount,
  footerNote,
  submitLabel,
  pendingLabel = "生成中…",
  advancedToggleClassName = "inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground",
  onSubmit,
  footer,
}: GenerateFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-7"
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
      >
        <QuickGenerateForm form={form} disabled={pending || disabled} innovation={innovation} />

        <div className="border-t border-dashed border-border/60 pt-5">
          <button
            type="button"
            className={advancedToggleClassName}
            onClick={() => setShowAdvanced((current) => !current)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            高级设置
          </button>

          {showAdvanced ? (
            <div className="mt-5">
              <AdvancedOptions form={form} disabled={pending || disabled} />
            </div>
          ) : null}
        </div>

        {footer ?? (
          <div className="flex flex-col gap-3 border-t border-dashed border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">{footerNote}</p>
            <Button type="submit" disabled={pending || disabled}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {pendingLabel}
                </>
              ) : (
                <>
                  <Sparkles />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
