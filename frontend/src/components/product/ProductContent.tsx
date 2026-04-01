import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface ProductContentProps {
    content?: string;
}

const ProductContent: React.FC<ProductContentProps> = ({ content }) => {
    return (
        <div data-color-mode="light" style={{ padding: '8px 0' }}>
            {content ? (
                <MDEditor.Markdown source={content} />
            ) : (
                <p className="text-muted">Chưa có nội dung chi tiết.</p>
            )}
        </div>
    );
};

export default ProductContent;
