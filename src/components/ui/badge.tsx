import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-1 focus:ring-primary/60",
  {
    variants: {
      variant: {
        default: "border-primary/60 bg-primary/10 text-primary",
        secondary: "border-border bg-muted text-muted-foreground",
        destructive: "border-destructive/60 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        success: "border-flash/60 bg-flash/10 text-flash",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
