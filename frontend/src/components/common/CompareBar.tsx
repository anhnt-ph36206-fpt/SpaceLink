import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';

const CompareBar: React.FC = () => {
    const { compareList, removeFromCompare, clearCompare } = useCompare();
    const navigate = useNavigate();

    if (compareList.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1050,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderTop: '2px solid #0d6efd',
                boxShadow: '0 -4px 24px rgba(13,110,253,0.25)',
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}
        >
            {/* Icon */}
            <div style={{ color: '#0d6efd', fontSize: 22, flexShrink: 0 }}>
                <i className="fas fa-balance-scale" />
            </div>

            {/* Label */}
            <span style={{ color: '#adb5bd', fontSize: 13, flexShrink: 0, fontWeight: 600 }}>
                So sánh ({compareList.length}/4):
            </span>

            {/* Products */}
            <div style={{ display: 'flex', gap: 12, flex: 1, overflow: 'hidden' }}>
                {compareList.map(product => (
                    <div
                        key={product.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(255,255,255,0.07)',
                            borderRadius: 10,
                            padding: '6px 10px',
                            minWidth: 0,
                            maxWidth: 200,
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <img
                            src={product.image || ''}
                            alt={product.name}
                            style={{
                                width: 38,
                                height: 38,
                                objectFit: 'contain',
                                borderRadius: 6,
                                background: '#fff',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                            }}
                        >
                            {product.name}
                        </span>
                        <button
                            onClick={() => removeFromCompare(product.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6c757d',
                                cursor: 'pointer',
                                padding: '0 4px',
                                fontSize: 14,
                                flexShrink: 0,
                                lineHeight: 1,
                            }}
                            title="Xóa khỏi so sánh"
                        >
                            ✕
                        </button>
                    </div>
                ))}

                {/* Placeholder slots */}
                {Array.from({ length: 4 - compareList.length }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        style={{
                            width: 160,
                            height: 54,
                            borderRadius: 10,
                            border: '1px dashed rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: 12,
                            flexShrink: 0,
                        }}
                    >
                        + Thêm sản phẩm
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button
                    onClick={clearCompare}
                    className="btn btn-sm btn-outline-secondary"
                    style={{ borderRadius: 8, color: '#adb5bd', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                    Xóa tất cả
                </button>
                <button
                    onClick={() => navigate('/compare')}
                    className="btn btn-sm btn-primary"
                    style={{ borderRadius: 8, fontWeight: 700, padding: '6px 20px' }}
                    disabled={compareList.length < 2}
                >
                    <i className="fas fa-balance-scale me-1" />
                    So sánh ngay
                </button>
            </div>
        </div>
    );
};

export default CompareBar;
