import { useState, type ReactNode } from "react";

interface TabDef {
  label: string;
  id: string;
}

interface TabsProps {
  tabs: TabDef[];
  children?: ReactNode[];
}

export default function Tabs({ tabs, children }: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!tabs || tabs.length === 0) return null;
  const childArray = children ?? [];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="flex border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={tab.id ?? i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
              i === activeIndex
                ? "border-b-2 border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {childArray[activeIndex] ?? null}
      </div>
    </div>
  );
}
