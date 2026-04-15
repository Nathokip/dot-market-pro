import { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "icon";
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
        variant === "outline" && "border bg-transparent",
        variant === "ghost" && "bg-transparent hover:bg-[#1E2438]",
        size === "sm" && "px-3 py-1.5",
        size === "md" && "px-4 py-2",
        size === "icon" && "h-8 w-8 p-0",
        className
      )}
      {...props}
    />
  );
}
