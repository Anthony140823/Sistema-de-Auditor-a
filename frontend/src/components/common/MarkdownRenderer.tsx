import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="ai-markdown-content">
            <ReactMarkdown
                components={{
                    h1: ({ children }) => (
                        <h1 className="ai-md-h1">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="ai-md-h2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="ai-md-h3">{children}</h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="ai-md-h4">{children}</h4>
                    ),
                    p: ({ children }) => (
                        <p className="ai-md-p">{children}</p>
                    ),
                    strong: ({ children }) => (
                        <strong className="ai-md-strong">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="ai-md-em">{children}</em>
                    ),
                    ul: ({ children }) => (
                        <ul className="ai-md-ul">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="ai-md-ol">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="ai-md-li">{children}</li>
                    ),
                    hr: () => (
                        <hr className="ai-md-hr" />
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="ai-md-blockquote">{children}</blockquote>
                    ),
                    code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                            <code className="ai-md-code-inline">{children}</code>
                        ) : (
                            <code className="ai-md-code-block">{children}</code>
                        );
                    },
                    pre: ({ children }) => (
                        <pre className="ai-md-pre">{children}</pre>
                    ),
                    table: ({ children }) => (
                        <div className="ai-md-table-wrapper">
                            <table className="ai-md-table">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="ai-md-thead">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="ai-md-tbody">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="ai-md-tr">{children}</tr>
                    ),
                    th: ({ children }) => (
                        <th className="ai-md-th">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="ai-md-td">{children}</td>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
