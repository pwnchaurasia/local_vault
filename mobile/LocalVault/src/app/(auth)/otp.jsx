import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import AuthService from '@/src/services/authService';

export default function OTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [currIndex, setCurrIndex] = useState(0);
  const router = useRouter();
  const { login } = useAuth();
  const inputRefs = useRef([]);
  const [isBackspaceAction, setIsBackspaceAction] = useState(false);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setCurrIndex(index);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyOTP(newOtp.join(''));
    }
    setIsBackspaceAction(false);
  };

 const handleKeyPress = (e, index) => {
  if (e.nativeEvent.key === 'Backspace') {
    setIsBackspaceAction(true);
    const newOtp = [...otp];
    
    if (otp[index]) {
      // Clear current field if it has a value
      newOtp[index] = '';
      setOtp(newOtp);
    } else if (index > 0) {
      // Move to previous field and clear it if current field is empty
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  }
};
  const handleVerifyOTP = async (otpCode = null) => {
    const otpString = otpCode || otp.join('');
    
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.verifyOTP(otpString);
      
      if (response.success) {
        // Login successful, update auth context
        await login(response.data);
        router.replace('/(main)/home');
      } else {
        Alert.alert('Error', response.message || 'Invalid OTP');
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };


  const handleGoBack = () => {
    router.back();
  };

  return (
    <LinearGradient colors={['#1f2225', '#2a2f33']} style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="mail-outline" size={64} color="#fff" style={styles.icon} />
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to your phone
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus={false}
                autoFocus={index === 0}
                onFocus={() => {
                  if (!isBackspaceAction && otp[index]) {
                    const newOtp = [...otp];
                    newOtp[index] = '';
                    setOtp(newOtp);
                  }
                  setIsBackspaceAction(false); 
                }}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={() => handleVerifyOTP()}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Verify & Connect'}
            </Text>
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Find setup code in your deployment env</Text>
            {/* <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend || isLoading}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendButtonText,
                (!canResend || isLoading) && styles.resendButtonTextDisabled
              ]}>
                {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity> */}
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    textAlignVertical: 'center',
    paddingTop: 0, // Remove default padding
    paddingBottom: 0,
  },
  otpInputFilled: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#df9a57',
  },
  button: {
    backgroundColor: '#df9a57',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    textDecorationLine: 'underline',
  },
  resendButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'none',
  },
});
