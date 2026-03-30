import React from 'react';

export interface ProductSpecification {
    id: number;
    name: string;
    value: string;
    group?: { id: number; name: string; display_name: string } | null;
}

interface ProductTechSpecsProps {
    specifications?: ProductSpecification[];
}

const ProductTechSpecs: React.FC<ProductTechSpecsProps> = ({ specifications }) => {
    if (!specifications || specifications.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="fas fa-clipboard-list fa-3x text-muted mb-3" style={{ opacity: 0.3 }} />
                <p className="text-muted">Chưa có thông số kỹ thuật cho sản phẩm này.</p>
            </div>
        );
    }

    // Grouping by group display_name
    const groupedSpecs = specifications.reduce((acc, spec) => {
        const groupName = spec.group?.display_name || 'Thông số khác';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(spec);
        return acc;
    }, {} as Record<string, typeof specifications>);

    return (
        <div className="table-responsive" style={{ padding: '8px 0' }}>
            <table className="table table-bordered table-striped" style={{ maxWidth: 800, margin: '0 auto', fontSize: '14.5px' }}>
                <tbody>
                    {Object.entries(groupedSpecs).map(([groupName, specs]) => (
                        <React.Fragment key={groupName}>
                            <tr className="table-light">
                                <th colSpan={2} className="text-uppercase py-3" style={{ fontSize: 13, color: '#ff7a00', background: '#fffcf8', letterSpacing: '0.5px' }}>
                                    <i className="fas fa-microchip me-2" />
                                    {groupName}
                                </th>
                            </tr>
                            {specs.map(spec => (
                                <tr key={spec.id}>
                                    <td style={{ width: '35%', fontWeight: 600, color: '#555', verticalAlign: 'middle', padding: '12px 16px', backgroundColor: '#fafafa' }}>{spec.name}</td>
                                    <td style={{ color: '#333', verticalAlign: 'middle', padding: '12px 16px', backgroundColor: '#fff' }}>{spec.value}</td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProductTechSpecs;
