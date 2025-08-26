import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <LinearGradient
      colors={['#1f2225', '#2a2f33']}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 16,
  },
});

export default LoadingScreen;
