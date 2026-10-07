import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-glass-bd bg-[rgba(5,9,26,0.5)] px-3 py-2 text-sm text-[#f0f4ff] font-body",
          "placeholder:text-silver/50",
          "transition-all duration-300",
          "focus:outline-none focus:border-blue-accent focus:shadow-[0_0_0_3px_rgba(77,127,255,0.12)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
