"use client";

import { Settings2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { GenerateConfig } from "@/lib/types";

import {
  OUTPUT_SCOPE_OPTIONS,
  STRATEGY_OPTIONS,
  STYLE_OPTIONS,
  VIEWPOINT_OPTIONS,
} from "./generate-meta";

export { Form };

export function QuickGenerateForm({
  form,
  disabled,
  innovation,
}: {
  form: UseFormReturn<GenerateConfig>;
  disabled: boolean;
  innovation: number;
}) {
  const strategy = form.watch("strategy");
  const outputScope = form.watch("output_scope");

  return (
    <div className="flex flex-col gap-7">
      <FormField
        control={form.control}
        name="output_scope"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-3">
            <FormLabel>{"// output scope"}</FormLabel>
            <ChoiceGrid
              options={OUTPUT_SCOPE_OPTIONS}
              value={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
            <p className="text-[13px] leading-7 text-muted-foreground">
              {OUTPUT_SCOPE_OPTIONS.find((option) => option.value === outputScope)?.description}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="strategy"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-3">
            <FormLabel>{"// strategy"}</FormLabel>
            <ChoiceGrid
              options={STRATEGY_OPTIONS}
              value={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
            <p className="text-[13px] leading-7 text-muted-foreground">
              {STRATEGY_OPTIONS.find((option) => option.value === strategy)?.description}
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="innovation"
        render={({ field }) => (
          <FormItem className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <FormLabel>{"// innovation"}</FormLabel>
              <span className="font-mono text-[13px] text-primary">{innovation} / 10</span>
            </div>
            <FormControl>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={field.value}
                disabled={disabled}
                className="w-full accent-primary"
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
            <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
              <span>safer</span>
              <span>bolder</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function AdvancedOptions({
  form,
  disabled,
}: {
  form: UseFormReturn<GenerateConfig>;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <FormField
          control={form.control}
          name="viewpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{"// viewpoint"}</FormLabel>
              <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择叙事视角" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VIEWPOINT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{"// style"}</FormLabel>
              <Select disabled={disabled} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择文风倾向" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="extra_instructions"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-primary/70" />
              <FormLabel>{"// extra instructions"}</FormLabel>
            </div>
            <FormControl>
              <Textarea
                {...field}
                disabled={disabled}
                className="min-h-[120px] resize-y"
                placeholder="例如：强化主角主动性，减少解释性旁白。"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function ChoiceGrid<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: Array<{
    value: T;
    label: string;
  }>;
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className="grid gap-2 sm:grid-cols-3"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          disabled={disabled}
          variant="outline"
          className={cn(
            "h-auto w-full justify-start rounded-[3px] px-3 py-3 text-left font-mono text-[12px] uppercase tracking-[0.06em]",
            value === option.value ? "border-primary bg-primary/10 text-primary" : "",
          )}
        >
          <span>[ {option.label} ]</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
