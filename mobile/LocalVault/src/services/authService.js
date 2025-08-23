import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

class AuthService {
  constructor() {
    this.baseURL = '';
    this.phoneNumber = '';
    this.axiosInstance = null;
  }

  // Initialize axios instance with base URL
  initializeAxios(baseURL) {
    this.baseURL = baseURL;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshAccessToken();
              if (response.success) {
                originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
                return this.axiosInstance(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Store server configuration
  async setServerConfig(baseURL, phoneNumber) {
    this.baseURL = baseURL;
    this.phoneNumber = phoneNumber;
    
    await SecureStore.setItemAsync('server_url', baseURL);
    await SecureStore.setItemAsync('phone_number', phoneNumber);
    
    this.initializeAxios(baseURL);
  }

  // Get stored server configuration
  async getServerConfig() {
    try {
      const serverUrl = await SecureStore.getItemAsync('server_url');
      const phoneNumber = await SecureStore.getItemAsync('phone_number');
      
      if (serverUrl) {
        this.baseURL = serverUrl;
        this.phoneNumber = phoneNumber || '';
        this.initializeAxios(serverUrl);
      }
      
      return { serverUrl, phoneNumber };
    } catch (error) {
      console.error('Error getting server config:', error);
      return { serverUrl: null, phoneNumber: null };
    }
  }

  // Request OTP
  async requestOTP(phoneNumber) {
    try {
      if (!this.axiosInstance) {
        throw new Error('Server not configured');
      }

      const response = await this.axiosInstance.post('/api/v1/auth/request-otp', {
        device_name: 'LocalVault Mobile App',
        device_type: 'mobile',
        phone_number: phoneNumber,
      });

      return {
        success: true,
        data: response.data,
        message: 'OTP sent successfully',
      };
    } catch (error) {
      console.error('Request OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to send OTP',
      };
    }
  }

  // Verify OTP
  async verifyOTP(otp) {
    try {
      if (!this.axiosInstance || !this.phoneNumber) {
        throw new Error('Server not configured or phone number missing');
      }

      const response = await this.axiosInstance.post('/api/v1/auth/verify-otp', {
        phone_number: this.phoneNumber,
        otp: otp,
      });

      if (response.data.access_token && response.data.refresh_token) {
        await this.storeTokens(response.data.access_token, response.data.refresh_token);
        
        return {
          success: true,
          data: response.data,
          message: 'OTP verified successfully',
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'OTP verification failed',
      };
    }
  }

  // Resend OTP
  async resendOTP() {
    try {
      if (!this.phoneNumber) {
        throw new Error('Phone number not available');
      }
      
      return await this.requestOTP(this.phoneNumber);
    } catch (error) {
      console.error('Resend OTP error:', error);
      return {
        success: false,
        message: 'Failed to resend OTP',
      };
    }
  }

  // Store tokens securely
  async storeTokens(accessToken, refreshToken) {
    try {
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      
      // Store token timestamp for expiry tracking
      const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
      await SecureStore.setItemAsync('token_expiry', expiryTime.toString());
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  // Get access token
  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync('access_token');
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get refresh token
  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync('refresh_token');
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      const accessToken = await this.getAccessToken();
      const serverConfig = await this.getServerConfig();
      
      if (!accessToken || !serverConfig.serverUrl) {
        return false;
      }

      // Check token expiry
      const expiryTime = await SecureStore.getItemAsync('token_expiry');
      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        await this.clearTokens();
        return false;
      }

      // Verify token with server
      try {
        const response = await this.axiosInstance.get('/api/v1/auth/auth-validity');
        return response.status === 200;
      } catch (error) {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshResult = await this.refreshAccessToken();
          return refreshResult.success;
        }
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${this.baseURL}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });

      if (response.data.access_token) {
        await this.storeTokens(response.data.access_token, refreshToken);
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.clearTokens();
      return {
        success: false,
        message: 'Token refresh failed',
      };
    }
  }

  // Get current user (placeholder for future implementation)
  async getCurrentUser() {
    try {
      if (!this.axiosInstance) {
        await this.getServerConfig();
      }

      const response = await this.axiosInstance.get('/api/v1/auth/me');
      return {
        status: 200,
        data: { user: response.data },
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        status: error.response?.status || 500,
        message: error.response?.data?.detail || 'Failed to get user info',
      };
    }
  }

  // Clear all tokens and logout
  async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('token_expiry');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Logout
  async logout() {
    try {
      // Optionally call logout endpoint on server
      if (this.axiosInstance) {
        try {
          await this.axiosInstance.post('/api/v1/auth/logout');
        } catch (error) {
          console.error('Server logout error:', error);
          // Continue with local logout even if server call fails
        }
      }

      // Clear all stored data
      await this.clearTokens();
      await SecureStore.deleteItemAsync('server_url');
      await SecureStore.deleteItemAsync('phone_number');
      
      // Reset instance variables
      this.baseURL = '';
      this.phoneNumber = '';
      this.axiosInstance = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}

export default new AuthService();
