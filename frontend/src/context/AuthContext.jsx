import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize session or default to reporter for demo evaluation
  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await authApi.getCurrentUser();
      if (res.data && res.data.user) {
        setCurrentUser(res.data.user);
      }
      const demoRes = await authApi.getDemoUsers();
      if (demoRes.data && demoRes.data.demo_users) {
        setDemoUsers(demoRes.data.demo_users);
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginAsDemoUser = async (userObj) => {
    try {
      const password = userObj.default_password || 'doctor123';
      const res = await authApi.login(userObj.email, password);
      if (res.data && res.data.user) {
        setCurrentUser(res.data.user);
        return { success: true, user: res.data.user };
      }
    } catch (err) {
      console.error('Demo login failed, setting state locally:', err);
      // Fallback state switch
      setCurrentUser(userObj);
      return { success: true, user: userObj };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, demoUsers, loginAsDemoUser, logout, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
