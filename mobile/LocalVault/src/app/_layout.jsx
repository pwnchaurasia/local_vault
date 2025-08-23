import { Stack } from "expo-router";
import React, { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/src/context/AuthContext';
import LoadingScreen from '@/src/components/LoadingScreen';

import {
  Poppins_600SemiBold,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  useFonts,
} from '@expo-google-fonts/poppins';

export default function RootLayout() {
    const [loaded, error] = useFonts({
        SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
        Poppins_600SemiBold,
        Poppins_300Light,
        Poppins_700Bold,
        Poppins_400Regular,
        Poppins_500Medium,
    });

    // Show loading screen while fonts are loading
  if (!loaded && !error) {
    return <LoadingScreen />;
  }

  return (
      <SafeAreaProvider>
          <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(main)" />
              </Stack>
          </AuthProvider>
      </SafeAreaProvider>
      );
}
