import {
  primaryButtonClass,
  secondaryButtonClass,
  outlineButtonClass,
  destructiveButtonClass,
} from "../theme";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: primaryButtonClass,
  secondary: secondaryButtonClass,
  outline: outlineButtonClass,
  destructive: destructiveButtonClass,
};

export default function Button({
  label,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <button
        disabled={disabled}
        className={`${variantClasses[variant] ?? variantClasses.primary} active:scale-95`}
      >
        {label}
      </button>
    </div>
  );
}
