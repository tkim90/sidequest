interface BadgeProps {
  text: string;
  variant?: "default" | "success" | "warning" | "error";
}

const variantClasses: Record<string, string> = {
  default: "border-border bg-secondary text-secondary-foreground",
  success: "border-success/20 bg-success text-success-foreground",
  warning: "border-warning/30 bg-warning text-warning-foreground",
  error: "border-destructive/20 bg-destructive text-destructive-foreground",
};

export default function Badge({ text, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant] ?? variantClasses.default}`}
    >
      {text}
    </span>
  );
}
