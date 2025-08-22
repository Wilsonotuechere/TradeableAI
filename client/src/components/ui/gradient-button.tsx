import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GradientButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function GradientButton({ 
  children, 
  className, 
  onClick, 
  disabled = false 
}: GradientButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "gradient-button px-6 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}
