import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '@/src/services/authService';

export default function SetupScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!serverUrl.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = serverUrl.trim().replace(/\/$/, '');
      const cleanPhone = phoneNumber.trim();

      // Store server URL and phone for OTP verification
      await AuthService.setServerConfig(cleanUrl, cleanPhone);

      // Send OTP request
      // const response = await AuthService.requestOTP(cleanPhone);
      router.push('/(auth)/otp');
      
      // if (response.success) {
      //   router.push('/(auth)/otp');
      // } else {
      //   Alert.alert('Error', response.message || 'Failed to send OTP');
      // }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Connection failed. Please check your server URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1f2225', '#2a2f33']} style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#df9a57', '#e6a866']}
                style={styles.logoGradient}
              >
                <Ionicons name="lock-closed" size={32} color="#fff" />
              </LinearGradient>
              {/* <Text style={styles.logoText}>LV</Text> */}
            </View>
            <Text style={styles.title}>LocalVault</Text>
            <Text style={styles.subtitle}>Secure file sync between devices</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="server-outline" size={20} color="#df9a57" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="https://your-server.com"
                placeholderTextColor="#999"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#df9a57" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="(e.g., +1234567890)"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Connecting...' : 'Next'}
              </Text>
              {!isLoading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Make sure your LocalVault server is running and accessible
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
  },
  button: {
    backgroundColor: '#df9a57',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#df9a57',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
