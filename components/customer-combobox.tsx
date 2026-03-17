"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function CustomerCombobox({
  value,
  onChange,
  suggestions,
  placeholder = "Customer…",
  className,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((name) => (
            <li
              key={name}
              onMouseDown={(e) => { e.preventDefault(); onChange(name); setOpen(false); }}
              className={cn(
                "flex items-center gap-2 cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-muted",
                value === name && "bg-primary/5 text-primary font-medium"
              )}
            >
              <User className="size-3.5 shrink-0 text-muted-foreground" />
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
