import { useState } from "react";
import { labelTextClass, insetSurfaceClass } from "../theme";

interface TextInputProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
}

export default function TextInput({
  label,
  placeholder,
  defaultValue = "",
}: TextInputProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div
      className="flex flex-col gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {label && <label className={labelTextClass}>{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={`${insetSurfaceClass} px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary`}
      />
    </div>
  );
}
