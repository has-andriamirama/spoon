import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "bg-[#141414] border-[#222] text-[#9A8F84]",
        gold: "bg-[#C8973A]/10 border-[#C8973A]/30 text-[#C8973A]",
        green: "bg-green-500/10 border-green-500/30 text-green-400",
        red: "bg-red-500/10 border-red-500/30 text-red-400",
        yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        orange: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        gray: "bg-[#222]/50 border-[#333] text-[#5A5249]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
