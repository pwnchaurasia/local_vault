# LocalVault Mobile App

A production-level React Native mobile application for LocalVault - secure local file sharing and content management system.

## 🚀 Features

### Authentication & Security
- **OTP-based Authentication**: Secure phone number verification
- **Token Management**: 30-day token validity with automatic refresh
- **Secure Storage**: Uses Expo SecureStore for sensitive data
- **Server Configuration**: Flexible server URL configuration

### Content Management
- **File Upload**: Support for multiple file types with drag & drop
- **Text Content**: Create and store text snippets
- **Content List**: View all uploaded content with metadata
- **Download & Share**: Download files and share via system share sheet
- **Copy to Clipboard**: One-tap text copying
- **Delete Content**: Secure content deletion with confirmation

### User Experience
- **Gradient Theme**: Beautiful gradient design matching the Chrome extension
- **Haptic Feedback**: Tactile feedback for better user interaction
- **Pull-to-Refresh**: Refresh content list with pull gesture
- **Loading States**: Comprehensive loading indicators
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Optimized for various screen sizes

### Technical Features
- **Modular Architecture**: Clean, maintainable code structure
- **Production Ready**: Error boundaries, proper state management
- **Offline Support**: Graceful handling of network issues
- **Auto-retry**: Automatic token refresh and request retry

## 📱 Screenshots

The app features a beautiful gradient theme (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`) consistent with the Chrome extension.

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Storage**: Expo SecureStore
- **UI Components**: React Native with custom styling
- **Icons**: Expo Vector Icons (Ionicons)
- **Fonts**: Poppins font family

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile/LocalVault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**
   - Install Expo Go app on your mobile device
   - Scan the QR code from the terminal
   - Or press `i` for iOS simulator, `a` for Android emulator

## 🔧 Configuration

### Server Setup
1. Open the app
2. Enter your LocalVault server URL (e.g., `https://your-server.com`)
3. Enter your phone number
4. Complete OTP verification

### API Endpoints
The app connects to these LocalVault API endpoints:
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `GET /api/v1/auth/auth-validity` - Check token validity
- `GET /api/v1/content/list` - Get content list
- `POST /api/v1/content/upload` - Upload content
- `GET /api/v1/content/download/{id}` - Download content
- `DELETE /api/v1/content/{id}` - Delete content

## 📁 Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── _layout.jsx        # Root layout
│   ├── index.js           # Entry point
│   ├── (auth)/            # Authentication screens
│   │   ├── _layout.jsx
│   │   ├── setup.jsx      # Server setup & phone input
│   │   └── otp.jsx        # OTP verification
│   └── (main)/            # Main app screens
│       ├── _layout.jsx
│       └── home.jsx       # Content list & management
├── components/            # Reusable components
│   └── LoadingScreen.jsx
├── context/              # React Context providers
│   └── AuthContext.js    # Authentication state
├── services/             # API services
│   ├── authService.js    # Authentication API calls
│   └── contentService.js # Content management API calls
└── utils/                # Utility functions
    └── token.js          # Token management utilities
```

## 🔐 Security Features

- **Secure Token Storage**: All tokens stored in device keychain/keystore
- **Automatic Token Refresh**: Seamless token renewal
- **Request Interceptors**: Automatic auth header injection
- **Error Handling**: Proper logout on auth failures
- **Input Validation**: Client-side validation for all inputs

## 🎨 Design System

### Colors
- Primary Gradient: `#667eea` to `#764ba2`
- Background: `#f8f9fa`
- Text Primary: `#333`
- Text Secondary: `#666`
- Error: `#ff4757`
- Success: `#2ed573`

### Typography
- **Font Family**: Poppins
- **Weights**: Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700)

### Components
- **Cards**: Rounded corners (12px), subtle shadows
- **Buttons**: Gradient backgrounds, haptic feedback
- **Inputs**: Clean design with icons
- **Modal**: Full-screen with gradient header

## 🧪 Testing

Run the setup verification:
```bash
node test-setup.js
```

This will check:
- All required files exist
- Dependencies are installed
- App configuration is correct
- Feature completeness

## 🚀 Deployment

### Development Build
```bash
npx expo build:android
npx expo build:ios
```

### Production Build
```bash
eas build --platform android
eas build --platform ios
```

### App Store Submission
1. Configure app.json with proper metadata
2. Add app icons and splash screens
3. Build production version
4. Submit to respective app stores

## 🔄 API Integration

The app seamlessly integrates with the LocalVault backend:

### Authentication Flow
1. User enters server URL and phone number
2. App requests OTP from server
3. User enters OTP for verification
4. Server returns access and refresh tokens
5. Tokens stored securely on device

### Content Operations
- **Upload**: Supports both files and text content
- **List**: Fetches all user content with metadata
- **Download**: Streams files and saves to device
- **Delete**: Removes content from server

## 🛡 Error Handling

- **Network Errors**: Graceful fallback with retry options
- **Authentication Errors**: Automatic logout and re-authentication
- **Validation Errors**: User-friendly error messages
- **Server Errors**: Proper error display and logging

## 📱 Platform Support

- **iOS**: Full support with native features
- **Android**: Complete Android integration
- **Web**: Basic web support for development

## 🔧 Development

### Adding New Features
1. Create new screens in `src/app/`
2. Add API calls to appropriate service
3. Update navigation if needed
4. Add proper error handling
5. Test on both platforms

### Code Style
- Use functional components with hooks
- Follow React Native best practices
- Implement proper TypeScript (optional)
- Add comprehensive error boundaries

## 📄 License

This project is part of the LocalVault ecosystem. Please refer to the main repository for licensing information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and support:
1. Check the GitHub issues
2. Review the API documentation
3. Test with the Chrome extension for comparison
4. Contact the development team

---

**LocalVault Mobile** - Secure, fast, and beautiful file sharing on the go! 🚀
