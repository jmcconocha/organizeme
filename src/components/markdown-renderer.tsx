import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

import { cn } from "@/lib/utils"

import "highlight.js/styles/github-dark.css"

export interface MarkdownRendererProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The markdown content to render */
  content: string
}

/**
 * MarkdownRenderer component for displaying formatted Markdown content.
 *
 * Features:
 * - Full GitHub Flavored Markdown (GFM) support via remark-gfm
 * - Syntax highlighting for code blocks via rehype-highlight
 * - Tailwind Typography prose classes for beautiful styling
 * - Links open in new tab with security attributes
 * - Support for headings, lists, tables, images, and more
 * - Dark mode compatible
 *
 * @example
 * ```tsx
 * <MarkdownRenderer content={readmeContent} />
 *
 * // With custom className
 * <MarkdownRenderer content={markdown} className="max-w-4xl" />
 * ```
 */
const MarkdownRenderer = React.forwardRef<HTMLDivElement, MarkdownRendererProps>(
  ({ className, content, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "prose prose-slate dark:prose-invert max-w-none",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
          "prose-img:rounded-lg prose-img:shadow-md",
          "prose-table:border-collapse prose-table:border prose-table:border-border",
          "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2",
          "prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2",
          className
        )}
        {...props}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }
)

MarkdownRenderer.displayName = "MarkdownRenderer"

export { MarkdownRenderer }
