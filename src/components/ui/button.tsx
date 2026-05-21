import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-[13px] font-medium tracking-[-0.005em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)] hover:bg-primary/95 hover:shadow-brass-soft",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/95",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/70 hover:text-primary hover:shadow-brass-soft",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:border-border hover:bg-accent hover:text-foreground",
        ghost: "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        terminal:
          "font-mono uppercase tracking-[0.10em] border border-border bg-transparent text-primary hover:border-primary/80 hover:bg-primary/8 hover:shadow-brass-soft",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
