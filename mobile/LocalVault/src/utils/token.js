import * as SecureStore from 'expo-secure-store';

export const getAccessToken = async () => {
  return await SecureStore.getItemAsync('access_token');
};

export const getRefreshToken = async () => {
  return await SecureStore.getItemAsync('refresh_token');
};

export const setToken = async (payload) => {
  await SecureStore.setItemAsync('access_token', payload.access_token);
  await SecureStore.setItemAsync('refresh_token', payload.refresh_token);
};

export const removeToken = async () => {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};
