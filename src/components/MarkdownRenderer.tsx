import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface Props {
  content: string;
  className?: string;
}

/** 带代码高亮的 Markdown 渲染器 */
export function MarkdownRenderer({ content, className }: Props) {
  return (
    <ReactMarkdown
      className={`prose prose-invert prose-sm max-w-none ${className ?? ""}`}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // 链接：新窗口打开
        a: ({ href, children, ...props }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-blue-300 hover:text-blue-200 underline"
            {...props}
          >
            {children}
          </a>
        ),
        // 代码块
        pre: ({ children, ...props }) => (
          <pre
            className="rounded-lg border border-ink-700/60 bg-ink-900/80 overflow-x-auto my-2 text-[12.5px]"
            {...props}
          >
            {children}
          </pre>
        ),
        // 行内代码
        code: ({ className: cls, children, ...props }) => {
          const isBlock = cls?.startsWith("language-");
          if (isBlock) {
            return (
              <code className={`${cls} px-3 py-2.5 block`} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="bg-ink-800/80 text-amber-200 rounded px-1.5 py-0.5 font-mono text-[12.5px]"
              {...props}
            >
              {children}
            </code>
          );
        },
        // 表格
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-2">
            <table
              className="w-full text-[13px] border-collapse"
              {...props}
            >
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th
            className="bg-ink-800/60 border border-ink-700/60 px-3 py-1.5 text-left text-ink-200 font-medium"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td
            className="border border-ink-700/60 px-3 py-1.5 text-ink-100"
            {...props}
          >
            {children}
          </td>
        ),
        // 列表
        ul: ({ children, ...props }) => (
          <ul className="list-disc pl-5 space-y-0.5 my-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal pl-5 space-y-0.5 my-1" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li className="text-ink-100" {...props}>
            {children}
          </li>
        ),
        // 标题
        h1: ({ children, ...props }) => (
          <h1 className="text-base font-bold text-white mt-3 mb-1.5" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-sm font-semibold text-ink-50 mt-3 mb-1" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-sm font-medium text-ink-100 mt-2 mb-0.5" {...props}>
            {children}
          </h3>
        ),
        // 引用块
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-l-2 border-ink-600 pl-3 my-1 text-ink-300 italic"
            {...props}
          >
            {children}
          </blockquote>
        ),
        // 分割线
        hr: (props) => (
          <hr className="border-ink-700/60 my-2" {...props} />
        ),
        // 段落
        p: ({ children, ...props }) => (
          <p className="mb-1.5 last:mb-0 leading-relaxed" {...props}>
            {children}
          </p>
        ),
        // strong / em
        strong: ({ children, ...props }) => (
          <strong className="font-semibold text-white" {...props}>
            {children}
          </strong>
        ),
        em: ({ children, ...props }) => (
          <em className="text-ink-100" {...props}>
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
