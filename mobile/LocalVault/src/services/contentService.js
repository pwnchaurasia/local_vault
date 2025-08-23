import AuthService from './authService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

class ContentService {
  constructor() {
    this.axiosInstance = null;
  }

  // Initialize with auth service axios instance
  async initialize() {
    const config = await AuthService.getServerConfig();
    if (config.serverUrl) {
      this.axiosInstance = AuthService.axiosInstance;
    }
  }

  // Get list of content from server
  async getContentList() {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const response = await this.axiosInstance.get('/api/v1/content/list');
      
      return {
        success: true,
        data: response.data.contents || [],
        message: 'Content loaded successfully',
      };
    } catch (error) {
      console.error('Get content list error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to load content',
        data: [],
      };
    }
  }

  // Upload content (files or text)
  async uploadContent(files = [], textContent = '') {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (files.length === 0 && !textContent.trim()) {
        return {
          success: false,
          message: 'No content to upload',
        };
      }

      const formData = new FormData();

      // Add files
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(file.uri);
        if (fileInfo.exists) {
          formData.append('file', {
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream',
            name: file.name,
          });
        }
      }

      // Add text content
      if (textContent.trim()) {
        formData.append('text_content', textContent.trim());
      }

      const response = await this.axiosInstance.post('/api/v1/content/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data,
        message: `Successfully uploaded ${response.data.files_uploaded || 1} item(s)`,
      };
    } catch (error) {
      console.error('Upload content error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Upload failed',
      };
    }
  }

  // Download file
  async downloadFile(contentId, fileName) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const response = await this.axiosInstance.get(`/api/v1/content/download/${contentId}`, {
        responseType: 'arraybuffer',
      });

      // Create a temporary file
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Convert arraybuffer to base64
      const base64Data = btoa(
        new Uint8Array(response.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: response.headers['content-type'] || 'application/octet-stream',
          dialogTitle: 'Save File',
        });
      }

      return {
        success: true,
        message: 'File downloaded and shared successfully',
        fileUri,
      };
    } catch (error) {
      console.error('Download file error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Download failed',
      };
    }
  }

  // Delete content
  async deleteContent(contentId) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const response = await this.axiosInstance.delete(`/api/v1/content/${contentId}`);
      
      return {
        success: true,
        message: 'Content deleted successfully',
      };
    } catch (error) {
      console.error('Delete content error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Delete failed',
      };
    }
  }

  // Get content stats
  async getContentStats() {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const response = await this.axiosInstance.get('/api/v1/content/stats/summary');
      
      return {
        success: true,
        data: response.data,
        message: 'Stats loaded successfully',
      };
    } catch (error) {
      console.error('Get content stats error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Failed to load stats',
        data: null,
      };
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Get file icon based on type
  getFileIcon(contentType, fileName) {
    if (contentType === 'text') {
      return 'document-text-outline';
    }

    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'document-outline';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image-outline';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return 'videocam-outline';
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return 'musical-notes-outline';
      case 'zip':
      case 'rar':
      case '7z':
        return 'archive-outline';
      case 'doc':
      case 'docx':
        return 'document-text-outline';
      case 'xls':
      case 'xlsx':
        return 'grid-outline';
      case 'ppt':
      case 'pptx':
        return 'easel-outline';
      default:
        return 'document-outline';
    }
  }
}

export default new ContentService();
