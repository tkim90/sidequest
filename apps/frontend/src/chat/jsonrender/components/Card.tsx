import type { ReactNode } from "react";

import { captionTextClass, surfaceClass, titleClass } from "../theme";

interface CardProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function Card({ title, description, children }: CardProps) {
  return (
    <div className={`${surfaceClass} p-4`}>
      <h3 className={titleClass}>{title}</h3>
      {description && (
        <p className={`mt-1 ${captionTextClass}`}>{description}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
