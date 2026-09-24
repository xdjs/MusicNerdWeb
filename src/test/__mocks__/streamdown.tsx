// Streamdown is ESM-only; Jest maps it here (jest.config.ts). Renders the
// Markdown source as text, with any allowed `<sup>` citation markers kept as
// elements, so tests can read what a draft shows without the real parser.
import React from "react";

type Props = { children?: string; className?: string; components?: { sup?: React.ComponentType<{ children?: React.ReactNode }> } };

export function Streamdown({ children = "", className, components }: Props) {
    const Sup = components?.sup ?? ((p: { children?: React.ReactNode }) => <sup>{p.children}</sup>);
    const parts = children.split(/<sup>(.*?)<\/sup>/g);
    return (
        <div data-testid="streamdown" className={className} style={{ whiteSpace: "pre-wrap" }}>
            {parts.map((part, i) => (i % 2 === 1 ? <Sup key={i}>{part}</Sup> : <React.Fragment key={i}>{part}</React.Fragment>))}
        </div>
    );
}
