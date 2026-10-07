import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-ui font-semibold uppercase tracking-wider transition-all",
  {
    variants: {
      variant: {
        default:
          "border border-blue-accent/40 bg-blue-accent/10 text-blue-accent",
        cyan:
          "border border-cyan/40 bg-cyan/10 text-cyan",
        silver:
          "border border-silver/30 bg-silver/10 text-silver",
        green:
          "border border-status-green/40 bg-status-green/10 text-status-green",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
