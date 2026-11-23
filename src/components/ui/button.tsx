"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "md-press inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 disabled:pointer-events-none disabled:opacity-45 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-slate-800/90 text-white shadow-sm shadow-slate-900/20 backdrop-blur hover:bg-slate-700 border border-white/10",
        outline:
          "border border-slate-300/80 bg-white/70 text-slate-700 backdrop-blur hover:bg-white hover:text-slate-900",
        ghost: "text-slate-600 hover:bg-white/70 hover:text-slate-900",
        subtle:
          "bg-white/60 border border-white/70 text-slate-700 backdrop-blur hover:bg-white/85",
        destructive:
          "bg-red-600/10 border border-red-500/30 text-red-600 hover:bg-red-600/20",
        danger: "bg-red-600 text-white hover:bg-red-600",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-8 w-8",
        iconSm: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
