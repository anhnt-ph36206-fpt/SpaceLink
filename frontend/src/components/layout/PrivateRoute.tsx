import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Đang tải...</div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
