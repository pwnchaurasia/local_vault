import React, { createContext, useContext, useEffect, useState } from 'react';
import AuthService from '@/src/services/authService';
import { removeToken } from '@/src/utils/token';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);

  /**
   * Login user and set authentication state
   * @param {Object} userData - User data from authentication
   */
  const login = async (userData) => {
    try {
      setUser(userData);
      setIsAuthenticated(true);

      // Optionally fetch fresh user data
      if (!userData) {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Login state update failed:', error);
      // Still set authenticated state even if user fetch fails
      setIsAuthenticated(true);
    }
  };

  /**
   * Logout user and clear all authentication state
   */
  const logout = async () => {
    try {
      setIsLoading(true);

      // Call logout service (handles backend logout and token cleanup)
      await AuthService.logout();

      // Clear local state
      setUser(null);
      setIsAuthenticated(false);

      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);

      // Still clear local state even if service call fails
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Initialize auth service with stored config
        await AuthService.getServerConfig();
        
        const isValid = await AuthService.isAuthenticated();

        if (isMounted) {
          console.log('AuthContext: Authentication status:', isValid);
          setIsAuthenticated(isValid);

          if (isValid) {
            // If authenticated, try to get user info (optional)
            try {
              const response = await AuthService.getCurrentUser();

              if(response.status === 200) {
                const currentUser = response.data?.user;
                console.log('Current User:', currentUser);
                setUser(currentUser);

                const profileComplete = currentUser?.is_profile_complete ? currentUser.is_profile_complete : true;
                setIsProfileComplete(profileComplete);
              } else {
                // User info not available, but still authenticated
                setIsProfileComplete(true);
              }

            } catch (error) {
              console.error('AuthContext: Failed to get user profile:', error);
              // If we can't get profile, assume it's complete for now
              setIsProfileComplete(true);
            }
          } else {
            // Clear user data if not authenticated
            setUser(null);
            setIsProfileComplete(true); // Reset to default
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('AuthContext: Auth check failed:', error);
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          console.log("AuthContext: Setting loading to false");
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext: Manual auth status check...');
      setIsLoading(true);

      // Check if user is authenticated (this will handle token validation)
      const isValid = await AuthService.isAuthenticated();

      console.log('AuthContext: Manual check - Authentication status:', isValid);
      setIsAuthenticated(isValid);

      if (!isValid) {
        // Clear user data if not authenticated
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Manual auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      console.log("AuthContext: Manual check - Setting loading to false");
      setIsLoading(false);
    }
  };

  /**
   * Update profile completion status
   * @param {boolean} isComplete - Profile completion status
   */
  const updateProfileCompletion = (isComplete) => {
    setIsProfileComplete(isComplete);
  };



  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, isProfileComplete, login, logout, checkAuthStatus, updateProfileCompletion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
