"use client";

import {
  cloneElement,
  Fragment,
  isValidElement,
} from "react";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { LatexRenderer } from "@/components/LatexRenderer";

/** Walk markdown-rendered React nodes and render string leaves with LatexRenderer ($...$, etc.). */
function mapMdLeaves(node: ReactNode): ReactNode {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "string") return <LatexRenderer text={node} />;
  if (typeof node === "number") return <LatexRenderer text={String(node)} />;
  if (Array.isArray(node)) {
    return node.map((child, i) => <Fragment key={i}>{mapMdLeaves(child)}</Fragment>);
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const ch = el.props.children;
    if (ch !== undefined && ch !== null) {
      return cloneElement(el, { children: mapMdLeaves(ch) });
    }
    return el;
  }
  return node;
}

function MarkdownLeafWithLatex({ children }: { children?: ReactNode }) {
  return <>{mapMdLeaves(children)}</>;
}

function noteMarkdownComponents(): Components {
  return {
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border/90 bg-background/90 dark:border-gold/25 dark:bg-muted/40">
        <table className="w-full min-w-[min(100%,36rem)] border-collapse border border-border text-sm dark:border-gold/20">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-border dark:border-gold/25">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="even:bg-muted/30 dark:even:bg-muted/20">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-3 py-2 text-left text-sm font-semibold text-gold dark:border-gold/25 dark:bg-muted/70">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-3 py-2 dark:border-gold/15">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </td>
    ),
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="mb-3 text-xl font-bold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 text-lg font-bold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 text-base font-semibold text-primary">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </h3>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-inside list-disc space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-inside list-decimal space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-4 border-gold/40 pl-4 italic text-muted-foreground">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-gold underline underline-offset-2 hover:text-gold/90"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </strong>
    ),
    em: ({ children }) => (
      <em>
        <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
      </em>
    ),
    hr: () => <hr className="my-6 border-border dark:border-gold/20" />,
    code: (props) => {
      const { inline, className, children, node: _node, ...rest } = props as ComponentPropsWithoutRef<"code"> & {
        inline?: boolean;
        node?: unknown;
      };
      if (inline) {
        return (
          <code
            className={`rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] dark:bg-muted/60 ${className ?? ""}`}
            {...rest}
          >
            <MarkdownLeafWithLatex>{children}</MarkdownLeafWithLatex>
          </code>
        );
      }
      return (
        <code className={`block font-mono text-sm ${className ?? ""}`} {...rest}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-muted/70 p-3 text-xs dark:border-gold/20 dark:bg-muted/50">
        {children}
      </pre>
    ),
  };
}

export function NoteMarkdown({ content }: { content: string }) {
  if (!content?.trim()) return null;
  return (
    <div className="note-markdown max-w-none text-sm leading-relaxed text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={noteMarkdownComponents()}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
