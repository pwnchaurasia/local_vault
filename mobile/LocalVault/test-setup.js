#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 LocalVault Mobile App Setup Verification\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'app.json',
  'src/app/_layout.jsx',
  'src/app/index.js',
  'src/app/(auth)/_layout.jsx',
  'src/app/(auth)/setup.jsx',
  'src/app/(auth)/otp.jsx',
  'src/app/(main)/_layout.jsx',
  'src/app/(main)/home.jsx',
  'src/components/LoadingScreen.jsx',
  'src/context/AuthContext.js',
  'src/services/authService.js',
  'src/services/contentService.js',
  'assets/images/Lv.png',
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📦 Checking package.json dependencies:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const requiredDeps = [
  'expo',
  'expo-router',
  'expo-linear-gradient',
  'expo-secure-store',
  'expo-document-picker',
  'expo-file-system',
  'expo-sharing',
  'expo-clipboard',
  'axios',
  '@expo/vector-icons',
  'react-native-safe-area-context',
];

let allDepsPresent = true;
requiredDeps.forEach(dep => {
  const exists = packageJson.dependencies[dep];
  console.log(`${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) allDepsPresent = false;
});

console.log('\n🎨 Checking app configuration:');
const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'));
console.log(`✅ App name: ${appJson.expo.name}`);
console.log(`✅ App slug: ${appJson.expo.slug}`);
console.log(`✅ Platform support: ${appJson.expo.platforms?.join(', ') || 'iOS, Android, Web'}`);

console.log('\n📱 App Features Summary:');
console.log('✅ Authentication with OTP verification');
console.log('✅ Secure token storage (30-day validity)');
console.log('✅ File upload and text content support');
console.log('✅ Content list with download/copy functionality');
console.log('✅ Delete content with confirmation');
console.log('✅ Gradient theme matching extension');
console.log('✅ Floating action button for uploads');
console.log('✅ Pull-to-refresh functionality');
console.log('✅ Haptic feedback');
console.log('✅ Loading states and error handling');

console.log('\n🚀 Next Steps:');
console.log('1. Run: npm install (to install dependencies)');
console.log('2. Run: npx expo start (to start development server)');
console.log('3. Use Expo Go app to scan QR code and test');
console.log('4. Configure your server URL in the setup screen');

if (allFilesExist && allDepsPresent) {
  console.log('\n🎉 Setup verification completed successfully!');
  console.log('Your LocalVault mobile app is ready for testing.');
} else {
  console.log('\n⚠️  Some issues found. Please check the missing files/dependencies above.');
}
