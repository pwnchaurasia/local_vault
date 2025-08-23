import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/context/AuthContext';
import ContentService from '@/src/services/contentService';
import LoadingScreen from '@/src/components/LoadingScreen';

export default function HomeScreen() {
  const [content, setContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fabAnimation] = useState(new Animated.Value(0));

  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadContent();
    
    // Animate FAB entrance
    Animated.spring(fabAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const loadContent = async () => {
    try {
      const response = await ContentService.getContentList();
      if (response.success) {
        setContent(response.data);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Load content error:', error);
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadContent();
  }, []);

  const handleItemPress = async (item) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (item.content_type === 'text') {
      // Copy text to clipboard
      await Clipboard.setStringAsync(item.text_content);
      Alert.alert('Success', 'Text copied to clipboard!');
    } else {
      // Download file
      try {
        const response = await ContentService.downloadFile(item.id, item.original_name);
        if (response.success) {
          Alert.alert('Success', response.message);
        } else {
          Alert.alert('Error', response.message);
        }
      } catch (error) {
        console.error('Download error:', error);
        Alert.alert('Error', 'Failed to download file');
      }
    }
  };

  const handleDeleteItem = async (item) => {
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${item.content_type === 'text' ? item.title : item.original_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ContentService.deleteContent(item.id);
              if (response.success) {
                setContent(prev => prev.filter(c => c.id !== item.id));
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', response.message);
              } else {
                Alert.alert('Error', response.message);
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete content');
            }
          },
        },
      ]
    );
  };

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setSelectedFiles(result.assets);
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Failed to pick files');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 && !textContent.trim()) {
      Alert.alert('Error', 'Please select files or enter text content');
      return;
    }

    setIsUploading(true);
    try {
      const response = await ContentService.uploadContent(selectedFiles, textContent);
      
      if (response.success) {
        Alert.alert('Success', response.message);
        setShowUploadModal(false);
        setSelectedFiles([]);
        setTextContent('');
        loadContent(); // Refresh the list
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const renderContentItem = ({ item }) => {
    const isText = item.content_type === 'text';
    const displayName = isText 
      ? (item.title?.substring(0, 60) + (item.title?.length > 60 ? '...' : ''))
      : item.original_name;
    
    const fileInfo = isText
      ? `Text • ${new Date(item.created_at).toLocaleDateString()}`
      : `${ContentService.formatFileSize(parseInt(item.file_size) || 0)} • ${new Date(item.created_at).toLocaleDateString()}`;

    const iconName = ContentService.getFileIcon(item.content_type, item.original_name);

    return (
      <TouchableOpacity
        style={styles.contentItem}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contentItemContent}>
          <View style={styles.contentItemLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={24} color="#667eea" />
            </View>
            <View style={styles.contentItemInfo}>
              <Text style={styles.contentItemName} numberOfLines={2}>
                {displayName}
              </Text>
              <Text style={styles.contentItemDetails}>
                {fileInfo}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#ff4757" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={64} color="rgba(255,255,255,0.5)" />
      <Text style={styles.emptyStateText}>No content found</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap the + button to upload files or add text
      </Text>
    </View>
  );

  if (isLoading) {
    return <LoadingScreen message="Loading your content..." />;
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>LocalVault</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content List */}
      <View style={styles.contentContainer}>
        <FlatList
          data={content}
          renderItem={renderContentItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#667eea"
              colors={['#667eea']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={content.length === 0 ? styles.emptyListContainer : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [
              {
                scale: fabAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowUploadModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.modalGradient}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                onPress={() => setShowUploadModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Upload Content</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <View style={styles.modalContent}>
              {/* File Selection */}
              <TouchableOpacity style={styles.filePickerButton} onPress={handlePickFiles}>
                <Ionicons name="document-attach-outline" size={24} color="#667eea" />
                <Text style={styles.filePickerText}>
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Select Files'
                  }
                </Text>
              </TouchableOpacity>

              {selectedFiles.length > 0 && (
                <View style={styles.selectedFilesContainer}>
                  {selectedFiles.map((file, index) => (
                    <View key={index} style={styles.selectedFile}>
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.selectedFileSize}>
                        {ContentService.formatFileSize(file.size)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Text Input */}
              <View style={styles.textInputContainer}>
                <Text style={styles.textInputLabel}>Or enter text content:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your text here..."
                  placeholderTextColor="#999"
                  value={textContent}
                  onChangeText={setTextContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Upload Button */}
              <TouchableOpacity
                style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={isUploading}
              >
                <Text style={styles.uploadButtonText}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Text>
                {!isUploading && <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  contentItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentItemInfo: {
    flex: 1,
  },
  contentItemName: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
    marginBottom: 4,
  },
  contentItemDetails: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filePickerText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
    marginLeft: 12,
  },
  selectedFilesContainer: {
    marginBottom: 16,
  },
  selectedFile: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  selectedFileName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
    marginBottom: 4,
  },
  selectedFileSize: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#666',
  },
  textInputContainer: {
    marginBottom: 24,
  },
  textInputLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
    minHeight: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginRight: 8,
  },
});
