"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useMemo } from "react";

type Props = { text: string };

/** Matches $$...$$, \(...\), \[...\], or $...$ — check $$ before $ */
function parseLatex(text: string): { type: "text" | "latex"; value: string; displayMode?: boolean }[] {
  if (!text || typeof text !== "string") return [{ type: "text", value: "" }];
  const result: { type: "text" | "latex"; value: string; displayMode?: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const dd = remaining.match(/^\$\$([\s\S]*?)\$\$/);
    if (dd) {
      result.push({ type: "latex", value: dd[1].trim(), displayMode: true });
      remaining = remaining.slice(dd[0].length);
      continue;
    }

    const paren = remaining.match(/^\\\(([\s\S]*?)\\\)/);
    if (paren) {
      result.push({ type: "latex", value: paren[1].trim(), displayMode: false });
      remaining = remaining.slice(paren[0].length);
      continue;
    }

    const bracket = remaining.match(/^\\\[([\s\S]*?)\\\]/);
    if (bracket) {
      result.push({ type: "latex", value: bracket[1].trim(), displayMode: true });
      remaining = remaining.slice(bracket[0].length);
      continue;
    }

    const single = remaining.match(/^\$([^$]+)\$/);
    if (single) {
      result.push({ type: "latex", value: single[1].trim(), displayMode: false });
      remaining = remaining.slice(single[0].length);
      continue;
    }

    const nextDelim = remaining.search(/\$\$|\\\(|\\\[|\$/);
    if (nextDelim === -1) {
      result.push({ type: "text", value: remaining });
      break;
    }
    result.push({ type: "text", value: remaining.slice(0, nextDelim) });
    remaining = remaining.slice(nextDelim);
  }

  return result.length ? result : [{ type: "text", value: text }];
}

/**
 * Renders text with LaTeX support. Detects $...$, $$...$$, \(...\), \[...\]
 * and renders with KaTeX. Falls back to plain text otherwise.
 */
export function LatexRenderer({ text }: Props) {
  const parts = useMemo(() => parseLatex(text), [text]);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        try {
          const html = katex.renderToString(part.value, {
            throwOnError: false,
            displayMode: part.displayMode ?? false,
          });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{part.value}</span>;
        }
      })}
    </span>
  );
}
