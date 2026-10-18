"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { Suggestion } from "@/app/api/search/suggest/route";

const GROUPS: { kind: Suggestion["kind"]; label: string }[] = [
  { kind: "product", label: "Products" },
  { kind: "category", label: "Categories" },
  { kind: "brand", label: "Brands" },
];

/**
 * Header search with suggestions: an ARIA 1.2 combobox over a plain GET
 * form, so Enter still searches without JavaScript (PRD CAT-3).
 */
export function SearchBox({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Uncontrolled, so words typed before the page finished loading stay in
  // the box; pick them up once React runs.
  useEffect(() => {
    const typed = input.current?.value ?? "";
    if (typed) setQuery(typed);
  }, []);

  // Debounced fetch; a newer keystroke cancels the older request.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(q)}`,
          {
            signal: controller.signal,
          }
        );
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setItems(data.suggestions);
        setActive(-1);
        setOpen(true);
      } catch {
        // Aborted or offline: keep the plain search working.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Too short to search: show nothing, without clearing state in the effect.
  const shown = query.trim().length >= 2 ? items : [];
  const expanded = open && shown.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;

  function go(item: Suggestion) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <form
      ref={box}
      role="search"
      action="/search"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      className={`rounded-pill border-input bg-card focus-within:outline-ring relative flex h-12 items-center gap-2.5 border px-[18px] focus-within:outline-2 focus-within:outline-offset-2 ${className}`}
    >
      <MagnifyingGlassIcon
        size={22}
        className="text-muted-foreground shrink-0"
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        Search groceries
      </label>
      <input
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && active >= 0 ? optionId(active) : undefined
        }
        placeholder="Search groceries and brands"
        autoComplete="off"
        ref={input}
        defaultValue=""
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "ArrowDown" && shown.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % shown.length);
          } else if (e.key === "ArrowUp" && shown.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? shown.length - 1 : a - 1));
          } else if (e.key === "Enter" && expanded && active >= 0) {
            e.preventDefault();
            go(shown[active]);
          }
        }}
        className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none"
      />
      <div
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!expanded}
        className="rounded-card border-border bg-popover shadow-float absolute inset-x-0 top-[calc(100%+8px)] max-h-[70vh] overflow-y-auto border p-2"
      >
        {GROUPS.map(({ kind, label }) => {
          const group = shown
            .map((item, i) => ({ item, i }))
            .filter(({ item }) => item.kind === kind);
          if (group.length === 0) return null;
          return (
            <div key={kind} role="group" aria-label={label}>
              <p
                aria-hidden
                className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-bold"
              >
                {label}
              </p>
              {group.map(({ item, i }) => (
                <div
                  key={item.href + i}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(item)}
                  className={`rounded-field flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 ${i === active ? "bg-muted" : "hover:bg-muted"}`}
                >
                  <span className="line-clamp-1">{item.label}</span>
                  {item.detail && (
                    <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                      {item.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </form>
  );
}
