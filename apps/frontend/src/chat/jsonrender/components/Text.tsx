import { bodyTextClass, captionTextClass, labelTextClass } from "../theme";

interface TextProps {
  content: string;
  variant?: "body" | "caption" | "label";
}

const variantClasses: Record<string, string> = {
  body: bodyTextClass,
  caption: captionTextClass,
  label: labelTextClass,
};

export default function Text({ content, variant = "body" }: TextProps) {
  return <p className={variantClasses[variant] ?? variantClasses.body}>{content}</p>;
}
