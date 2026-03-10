import CodeBlock from "../../markdown/CodeBlock";
import { labelTextClass } from "../theme";

interface CodeDisplayProps {
  code: string;
  language?: string;
  title?: string;
}

export default function CodeDisplay({ code, language, title }: CodeDisplayProps) {
  if (!code) return null;
  return (
    <div>
      {title && <p className={`mb-1 ${labelTextClass}`}>{title}</p>}
      <CodeBlock code={code} language={language} variant="monochrome" />
    </div>
  );
}
