import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/user';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../api/axios';

interface AuthContextType {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    //   const storedUser = localStorage.getItem('user');
    // if (token && storedUser) {
    //   try { 
    //     const parsed: User = JSON.parse(storedUser);
    //     // Fetch lại user mới nhất từ server để kiểm tra status
    //     fetch(`http://localhost:3000/users/${parsed.id}`,{
    //       headers: {
    //         'Authorization': `Bearer ${token}`
    //       }
    //     })
    //       .then(res => res.json())
    //       .then((freshUser: User) => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Xác minh token còn hợp lệ bằng /api/auth/me
    // axiosInstance tự gắn Authorization: Bearer <token> qua interceptor
    axiosInstance.get('/auth/me')
      .then((res) => {
        // Response: { status: true, data: { user: UserResource } }
        const freshUser: User = res.data.data.user;

        if (freshUser.status === 'banned' || freshUser.status === 'inactive') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        }
      })
      //           .catch(() 
      //       // Nếu fetch lỗi (offline), dùng data local
      //       setUser(parsed);
      //     })
      //     .finally(() => setIsLoading(false));
      //   return; // setIsLoading sẽ được gọi trong .finally()
      // } catch (error) {
      //   console.error("Failed to parse user from local storage", error);
      //   localStorage.removeItem('token');
      .catch(() => {
        // Lỗi 401 (token hết hạn) → interceptor đã xóa token
        // Lỗi network → dùng data local (offline mode)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser) as User);
          } catch {
            localStorage.removeItem('user');
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Backend role name có thể là 'Admin' hoặc 'admin'
    if (userData.role?.toLowerCase() === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    // Revoke token trên server (fire-and-forget)
    axiosInstance.post('/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
