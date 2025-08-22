import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card",
        hover && "hover:border-electric/40 transition-all duration-300 hover:-translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}
