"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useMemo } from "react";

type Props = { text: string };

/** Matches $$...$$, \(...\), \[...\], [math]...[/math], or $...$ — check longer patterns first */
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

    const mathTag = remaining.match(/^\[math\]([\s\S]*?)\[\/math\]/i);
    if (mathTag) {
      result.push({ type: "latex", value: mathTag[1].trim(), displayMode: false });
      remaining = remaining.slice(mathTag[0].length);
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

    const nextDelim = remaining.search(/\$\$|\[math\]|\\\(|\\\[|\$/i);
    if (nextDelim === -1) {
      // No delimiter found - try to find and render LaTeX "islands" (e.g. \frac{3}{2}, \leq in plain text)
      result.push(...splitLatexIslands(remaining));
      break;
    }
    const before = remaining.slice(0, nextDelim);
    if (before.length > 0) {
      result.push(...splitLatexIslands(before));
    }
    remaining = remaining.slice(nextDelim);
  }

  return result.length ? result : [{ type: "text", value: text }];
}

/** Finds LaTeX commands like \frac{3}{2}, \leq, \infty in plain text and splits into text/latex parts */
function splitLatexIslands(text: string): { type: "text" | "latex"; value: string; displayMode?: boolean }[] {
  const parts: { type: "text" | "latex"; value: string; displayMode?: boolean }[] = [];
  const re = /\\(frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|[a-zA-Z]+(?:\([^)]*\))?)/g;
  let lastEnd = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      parts.push({ type: "text", value: text.slice(lastEnd, m.index) });
    }
    parts.push({ type: "latex", value: m[0], displayMode: false });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) {
    parts.push({ type: "text", value: text.slice(lastEnd) });
  }
  return parts.length ? parts : [{ type: "text", value: text }];
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
          const html = katex.renderToString(
            part.value.replace(/\\\\/g, "\\"),
            {
              throwOnError: false,
              displayMode: part.displayMode ?? false,
            }
          );
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{part.value}</span>;
        }
      })}
    </span>
  );
}
