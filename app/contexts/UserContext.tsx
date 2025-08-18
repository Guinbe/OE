import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsLoading(false);
        
        // Admin credentials
        if (email === 'admin@gmail.com' && password === 'admin1234') {
          const adminUser: User = {
            id: '1',
            email: 'admin@gmail.com',
            role: 'admin',
            name: 'Administrateur',
          };
          setUser(adminUser);
          resolve(true);
        }
        // Regular user credentials (for demo purposes)
        else if (email.includes('@') && password.length >= 4) {
          const regularUser: User = {
            id: '2',
            email: email,
            role: 'user',
            name: email.split('@')[0],
          };
          setUser(regularUser);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1500);
    });
  };

  const logout = () => {
    setUser(null);
    router.replace('/login');
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};