"use client";

import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = { content: string };

/**
 * Renders notes content with proper markdown formatting (headers, lists, bold)
 * and LaTeX math support via remark-math + rehype-katex.
 */
export function NotesContent({ content }: Props) {
  if (!content?.trim()) return <span className="text-muted-foreground">No content.</span>;

  return (
    <div className="notes-content space-y-2 text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-semibold">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
