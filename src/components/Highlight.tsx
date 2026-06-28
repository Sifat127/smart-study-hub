import { useMemo } from "react";

/**
 * Wrap occurrences of `query` inside `text` with <mark> so users can
 * scan matches at a glance. Case-insensitive, safe against regex special
 * characters, returns plain text when there is no query.
 */
export default function Highlight({
  text,
  query,
  className = "",
}: {
  text: string | null | undefined;
  query: string;
  className?: string;
}) {
  const parts = useMemo(() => {
    const t = text ?? "";
    const q = query.trim();
    if (!q) return [{ value: t, match: false }];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    return t.split(re).map((value) => ({
      value,
      match: value.toLowerCase() === q.toLowerCase(),
    }));
  }, [text, query]);

  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className={
              "bg-accent/25 text-foreground rounded-[0.25em] px-0.5 -mx-0.5 " +
              className
            }
          >
            {p.value}
          </mark>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}
