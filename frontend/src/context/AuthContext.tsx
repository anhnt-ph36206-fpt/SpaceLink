import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/user';
import { useNavigate } from 'react-router-dom';

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
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed: User = JSON.parse(storedUser);
        // Fetch lại user mới nhất từ server để kiểm tra status
        fetch(`http://localhost:3000/users/${parsed.id}`)
          .then(res => res.json())
          .then((freshUser: User) => {
            if (freshUser.status === 'banned' || freshUser.status === 'inactive') {
              // Tài khoản bị cấm/khóa → xóa session
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            } else {
              // Cập nhật thông tin mới nhất
              localStorage.setItem('user', JSON.stringify(freshUser));
              setUser(freshUser);
            }
          })
          .catch(() => {
            // Nếu fetch lỗi (offline), dùng data local
            setUser(parsed);
          })
          .finally(() => setIsLoading(false));
        return; // setIsLoading sẽ được gọi trong .finally()
      } catch (error) {
        console.error("Failed to parse user from local storage", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    if (userData.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
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
