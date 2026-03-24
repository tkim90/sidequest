import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-all duration-200 disabled:cursor-default disabled:border-border disabled:bg-muted disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-sm border border-primary bg-primary text-xs uppercase tracking-[0.16em] text-primary-foreground hover:-translate-y-0.5 hover:bg-accent",
        secondary:
          "rounded-sm border border-border bg-paper-sheet text-xs uppercase tracking-[0.16em] text-foreground hover:-translate-y-0.5 hover:bg-secondary",
        ghost:
          "rounded-lg text-muted-foreground hover:bg-paper-sheet hover:text-foreground",
        destructive:
          "rounded-sm border border-destructive bg-destructive text-xs uppercase tracking-[0.16em] text-destructive-foreground hover:-translate-y-0.5 hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4 py-2.5",
        sm: "px-3 py-1.5 text-xs",
        lg: "px-6 py-3",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & ButtonVariantProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonVariantProps };
