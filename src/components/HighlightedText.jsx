import React from 'react';

const HighlightedText = ({ text, highlight, className = '' }) => {
    if (!highlight?.trim() || !text) {
        return <span className={className}>{text}</span>;
    }

    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

    return (
        <span className={className}>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} style={{ backgroundColor: '#fef08a', color: '#111b21', padding: '0 2px', borderRadius: '2px', fontWeight: '500' }}>
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

export default HighlightedText;
