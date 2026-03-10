interface AlertProps {
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning" | "error";
}

const variantStyles: Record<string, { container: string; title: string; desc: string }> = {
  info: {
    container: "border border-primary/25 border-l-4 bg-secondary text-card-foreground",
    title: "text-sm font-semibold text-foreground",
    desc: "mt-1 text-xs text-muted-foreground",
  },
  success: {
    container: "border border-success/25 border-l-4 bg-success/10 text-card-foreground",
    title: "text-sm font-semibold text-success",
    desc: "mt-1 text-xs text-muted-foreground",
  },
  warning: {
    container: "border border-warning/30 border-l-4 bg-warning/15 text-card-foreground",
    title: "text-sm font-semibold text-warning-foreground",
    desc: "mt-1 text-xs text-muted-foreground",
  },
  error: {
    container: "border border-destructive/25 border-l-4 bg-destructive/10 text-card-foreground",
    title: "text-sm font-semibold text-destructive",
    desc: "mt-1 text-xs text-muted-foreground",
  },
};

export default function Alert({ title, description, variant = "info" }: AlertProps) {
  const styles = variantStyles[variant] ?? variantStyles.info;
  return (
    <div className={`rounded-lg p-4 ${styles.container}`}>
      <p className={styles.title}>{title}</p>
      {description && (
        <p className={styles.desc}>{description}</p>
      )}
    </div>
  );
}
