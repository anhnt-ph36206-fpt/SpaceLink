import React from 'react';
import MDEditor from '@uiw/react-md-editor';

interface ProductDescriptionProps {
    description?: string;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ description }) => {
    return (
        <div data-color-mode="light" style={{ padding: '8px 0' }}>
            {description ? (
                <MDEditor.Markdown source={description} />
            ) : (
                <p className="text-muted">Chưa có mô tả.</p>
            )}
        </div>
    );
};

export default ProductDescription;
