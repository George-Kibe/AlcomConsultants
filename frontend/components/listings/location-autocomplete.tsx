"use client";

import { MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "cn";

type Suggestion = {
  kind: "county" | "area" | "neighbourhood";
  text: string;
  county: string;
  area: string;
  neighbourhood: string;
};

export type LocationChoice = {
  county?: string;
  area?: string;
  neighbourhood?: string;
  where?: string;
  q?: string;
};

/** Accessible combobox: suggests counties, areas and neighbourhoods as you type. */
export function LocationAutocomplete({
  initial,
  onChoose,
  className,
}: {
  initial: string;
  onChoose: (choice: LocationChoice) => void;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [items, setItems] = useState<Suggestion[]>([]);
  const skipFetch = useRef(true);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const q = text.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/locations/search/?q=${encodeURIComponent(q)}`,
          {
            signal: controller.signal,
          },
        );
        if (res.ok) {
          setItems(await res.json());
          setOpen(true);
          setActive(-1);
        }
      } catch {
        /* aborted or offline */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [text]);

  function choose(s: Suggestion) {
    skipFetch.current = true;
    setText(s.text);
    setOpen(false);
    onChoose({
      county: s.county,
      area: s.area || undefined,
      neighbourhood: s.neighbourhood || undefined,
      where: s.text,
      q: undefined,
    });
  }

  function submitFreeText() {
    setOpen(false);
    const q = text.trim();
    onChoose({
      county: undefined,
      area: undefined,
      neighbourhood: undefined,
      where: undefined,
      q: q || undefined,
    });
  }

  // Fewer than 2 characters: no suggestions (derived, not stored).
  const visible = text.trim().length >= 2 ? items : [];
  const listId = `${id}-list`;
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${id}-input`} className="sr-only">
        Location or keyword
      </label>
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={open && visible.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        placeholder="Area, town, county or keyword"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => visible.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (open && active >= 0 && visible[active]) choose(visible[active]);
            else submitFreeText();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="bg-background border-input focus-visible:border-ring focus-visible:ring-ring/30 h-11 w-full rounded-xl border pr-9 pl-9 text-base outline-none focus-visible:ring-3"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear location"
          onClick={() => {
            setText("");
            setItems([]);
            onChoose({
              county: undefined,
              area: undefined,
              neighbourhood: undefined,
              where: undefined,
              q: undefined,
            });
          }}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <XIcon className="size-4" />
        </button>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Location suggestions"
        hidden={!open || visible.length === 0}
        className="bg-popover absolute z-40 mt-1 w-full overflow-hidden rounded-xl border p-1 shadow-lg"
      >
        {visible.map((s, i) => (
          <li
            key={`${s.kind}-${s.county}-${s.area}-${s.neighbourhood}`}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(s)}
            className="aria-selected:bg-secondary hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
          >
            <MapPinIcon
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden
            />
            <span>{s.text}</span>
            <span className="text-muted-foreground ml-auto text-xs capitalize">
              {s.kind}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
