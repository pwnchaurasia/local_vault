// popup.js - LocalVault Chrome Extension

class LocalVaultExtension {
    constructor() {
        this.baseUrl = '';
        this.jwtToken = '';
        this.deviceId = '';
        this.phoneNumber = '';
        this.selectedFiles = [];
        this.access_token = ''
        this.refresh_token = ''

        this.init();
    }

    async init() {
        // Load saved data
        await this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();

        // Test connection
        await this.testConnection();

        // Determine which screen to show
        if (this.access_token && this.baseUrl) {
            await this.showMainScreen();
        } else {
            this.showSetupScreen();
        }
    }

    async clearTokensOnly() {
        try {
            await chrome.storage.local.remove([
                'jwtToken',
                'access_token',
                'refresh_token',
                'deviceId'
            ]);

            this.access_token = '';
            this.refresh_token = '';

            // Keep baseUrl and phoneNumber for easier re-login
            this.showSetupScreen();
            this.showStatus('Session expired - please login again', 'info');

            console.log('Tokens cleared, keeping server settings');
        } catch (error) {
            console.error('Clear tokens error:', error);
        }
    }


    async loadSettings() {
        const data = await chrome.storage.local.get([
            'baseUrl', 'jwtToken', 'deviceId', 'phoneNumber',
            'access_token', 'refresh_token'
        ]);

        this.baseUrl = data.baseUrl || '';
        this.jwtToken = data.jwtToken || '';
        this.deviceId = data.deviceId || '';
        this.phoneNumber = data.phoneNumber || '';
        this.access_token = data.access_token || '';
        this.refresh_token = data.refresh_token || '';
    }

    async saveSettings() {
        await chrome.storage.local.set({
            baseUrl: this.baseUrl,
            jwtToken: this.jwtToken,
            deviceId: this.deviceId,
            phoneNumber: this.phoneNumber,
            access_token: this.access_token,
            refresh_token: this.refresh_token,
        });
    }

    setupEventListeners() {
        // Setup screen
        document.getElementById('sendOtpBtn').addEventListener('click', () => this.sendOtp());

        // OTP screen
        document.getElementById('verifyOtpBtn').addEventListener('click', () => this.verifyOtp());
        document.getElementById('backToSetupBtn').addEventListener('click', () => this.showSetupScreen());

        // Main screen - tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // File upload
        document.getElementById('fileDropArea').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        const dropArea = document.getElementById('fileDropArea');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            });
        });

        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFileSelection(files);
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => this.uploadContent());

        // Files tab
        document.getElementById('refreshFilesBtn').addEventListener('click', () => this.loadFiles());

        // Settings
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // OTP input auto-focus
        document.getElementById('otpCode').addEventListener('input', (e) => {
            if (e.target.value.length === 6) {
                this.verifyOtp();
            }
        });
    }

    showSetupScreen() {
        this.hideAllScreens();
        document.getElementById('setupScreen').classList.remove('hidden');

        // Pre-fill server URL if available
        if (this.baseUrl) {
            document.getElementById('serverUrl').value = this.baseUrl;
        }
    }

    showOtpScreen() {
        this.hideAllScreens();
        document.getElementById('otpScreen').classList.remove('hidden');

        // Focus OTP input
        setTimeout(() => {
            document.getElementById('otpCode').focus();
        }, 100);
    }

    async showMainScreen() {
        this.hideAllScreens();
        document.getElementById('mainScreen').classList.remove('hidden');

        // Update settings display
        document.getElementById('currentServerUrl').value = this.baseUrl;
        document.getElementById('currentPhoneNumber').value = this.phoneNumber;
        document.getElementById('deviceId').textContent = this.deviceId.substring(0, 8) + '...';

        // Load files
        await this.loadFiles();
    }

    hideAllScreens() {
        ['setupScreen', 'otpScreen', 'mainScreen'].forEach(screenId => {
            document.getElementById(screenId).classList.add('hidden');
        });
    }

    async sendOtp() {
        const serverUrl = document.getElementById('serverUrl').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();

        if (!serverUrl || !phoneNumber) {
            this.showStatus('Please fill in all fields', 'error');
            return;
        }

        this.baseUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.phoneNumber = phoneNumber;

        try {
            this.showStatus('Registering device...', 'info');

            // Register device with your FastAPI backend
            const response = await fetch(`${this.baseUrl}/api/v1/auth/request-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    device_name: 'LocalVault Chrome Extension',
                    device_type: 'chrome',
                    phone_number: phoneNumber
                }),
            });

            if (response.ok) {
                this.showOtpScreen()
                this.showStatus('Otp sent! ', 'success');
                console.log("otp sent")
                return true
            } else {
                const error = await response.json();
                this.showStatus(error.detail || 'Registration failed', 'error');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showStatus('Connection failed. Check server URL.', 'error');
        }
    }

    async verifyOtp() {
        console.log("verifying otp")
        const otpCode = document.getElementById('otpCode').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();

        if (!otpCode || otpCode.length !== 6) {
            this.showStatus('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        try {
            this.showStatus('Creating user', 'info');

            // Register device with your FastAPI backend
            const response = await fetch(`${this.baseUrl}/api/v1/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    otp: otpCode
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('data', data)
                this.access_token = data.access_token;
                this.refresh_token = data.refresh_token;

                await this.saveSettings();

                this.showStatus('Device registered successfully!', 'success');
                setTimeout(() => {
                    this.showMainScreen();
                }, 1000);

            } else {
                const error = await response.json();
                this.showStatus(error.detail || 'Registration failed', 'error');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showStatus('Connection failed. Check server URL.', 'error');
        }



        // For now, accept any 6-digit code
        // In production, verify with your backend
        this.showStatus('OTP verified!', 'success');
//        setTimeout(() => {
//            this.showMainScreen();
//        }, 1000);
    }

    async testConnection() {

       const settings = await chrome.storage.local.get(['access_token',
       'baseUrl']);

       if (!settings.access_token || !settings.baseUrl) {
            // No tokens, go to setup
            this.showSetupScreen();
            return false;
       }

       try {
           const response = await fetch(`${this.baseUrl}/api/v1/auth/auth-validity`, {
             headers: {
                'Authorization': `Bearer ${settings.access_token}`,
                },
            });

           if (!response.ok) {
               // Token invalid, clear and go to setup
               await this.clearTokensOnly();
               this.showStatus('Session expired, please login again', 'error');
               return false;
           }

       return true;

       } catch (error) {
        document.getElementById('connectionStatus').textContent = 'Error';
       }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    }

    handleFileSelection(files) {
        this.selectedFiles = Array.from(files);

        if (this.selectedFiles.length > 0) {
            const fileInfo = document.getElementById('fileInfo');
            const fileNames = this.selectedFiles.map(f => f.name).join(', ');
            const totalSize = this.selectedFiles.reduce((sum, f) => sum + f.size, 0);

            fileInfo.innerHTML = `
                <strong>Selected:</strong> ${this.selectedFiles.length} file(s)<br>
                <strong>Files:</strong> ${fileNames}<br>
                <strong>Total size:</strong> ${this.formatFileSize(totalSize)}
            `;
            fileInfo.classList.remove('hidden');
        } else {
            document.getElementById('fileInfo').classList.add('hidden');
        }
    }

    async uploadContent() {
        const textContent = document.getElementById('textContent').value.trim();

        if (this.selectedFiles.length === 0 && !textContent) {
            this.showStatus('Please select files or enter text content', 'error');
            return;
        }

        try {
            this.showStatus('Uploading...', 'info');

            const formData = new FormData();

            // Add files
            this.selectedFiles.forEach(file => {
                formData.append('file', file);
            });

            // Add text content
            if (textContent) {
                formData.append('text_content', textContent);
            }


            const response = await fetch(`${this.baseUrl}/api/v1/content/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.access_token}`,
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                this.showStatus(`Successfully uploaded ${data.files_uploaded} item(s)!`, 'success');

                // Clear form
                this.selectedFiles = [];
                document.getElementById('fileInput').value = '';
                document.getElementById('textContent').value = '';
                document.getElementById('fileInfo').classList.add('hidden');

                // Refresh files list
                await this.loadFiles();

            } else {
                const error = await response.json();
                this.showStatus(error.detail || 'Upload failed', 'error');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showStatus('Upload failed. Check connection.', 'error');
        }
    }

    async loadFiles() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/content/list`, {
                headers: {
                    'Authorization': `Bearer ${this.access_token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data)
                this.displayFiles(data.contents);
            } else {
                this.showStatus('Failed to load files', 'error');
            }

        } catch (error) {
            console.error('Load files error:', error);
            this.showStatus('Failed to load files', 'error');
        }
    }

    displayFiles(files) {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = ''
        if (files.length === 0) {
            filesList.innerHTML = '<div style="text-align: center; opacity: 0.7; margin: 20px 0;">No files found</div>';
            return;
        }

         files.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.style.cssText = 'background: rgba(255,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 6px; cursor: pointer;';

            console.log('file.content_type', file.content_type)
            const displayName = file.content_type === 'text'
    ? file.text_content.substring(0, 60) + (file.text_content.length > 60 ? '...' : '')
    : file.original_name;

            const fileInfo = file.content_type === 'text'
            ? `Text • ${new Date(file.created_at).toLocaleDateString()}`
            : `${this.formatFileSize(parseInt(file.file_size) || 0)} • ${new Date(file.created_at).toLocaleDateString()}`;

            fileDiv.innerHTML = `
                <div style="font-weight: 500;">${displayName}</div>
                <div style="font-size: 11px; opacity: 0.7;">
                    ${fileInfo}
                </div>
            `;

            // Add click listener (not inline onclick)
            fileDiv.addEventListener('click', () => {
                 if (file.content_type === 'text') {
                    this.copyTextToClipboard(file.text_content);
                } else {
                    this.downloadFile(file.id, file.original_name);
                }
            });

            filesList.appendChild(fileDiv);
        });
    }

    // Add this new method for copying text to clipboard
    async copyTextToClipboard(textContent) {
        try {
            await navigator.clipboard.writeText(textContent);
            this.showStatus('Text copied to clipboard!', 'success');
        } catch (error) {
            console.error('Clipboard copy failed:', error);

            // Fallback method for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            this.showStatus('Text copied to clipboard!', 'success');
        }
    }

    async downloadFile(fileId, filename) {
        console.log("file", fileId)
        console.log("filename", filename)
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/content/download/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${this.access_token}`,
                },
            });

            if (response.ok) {
               // Read the response as arrayBuffer for binary files
                const arrayBuffer = await response.arrayBuffer();
                console.log('Downloaded size:', arrayBuffer.byteLength);
                // Get content type from response headers
                const contentType = response.headers.get('content-type') || 'application/octet-stream';
                console.log('Content type:', contentType);

                if (arrayBuffer.byteLength === 0) {
                    this.showStatus('File is empty', 'error');
                    return;
                }

                const blob = new Blob([arrayBuffer], { type: contentType });
                const url = URL.createObjectURL(blob);

                chrome.downloads.download({
                    url: url,
                    filename: filename,
                });

                this.showStatus(`Downloading ${filename}...`, 'success');
                setTimeout(() => URL.revokeObjectURL(url), 1000);

            } else {
                this.showStatus('Download failed', 'error');
            }

        } catch (error) {
            console.error('Download error:', error);
            this.showStatus('Download failed', 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.classList.remove('hidden');

        // Auto-hide success/info messages
        if (type !== 'error') {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        }
    }

    async logout() {
        // Clear all stored data
        await chrome.storage.local.clear();

        // Reset instance variables
        this.baseUrl = '';
        this.jwtToken = '';
        this.deviceId = '';
        this.phoneNumber = '';
        this.selectedFiles = [];

        // Show setup screen
        this.showSetupScreen();
        this.showStatus('Logged out successfully', 'info');
    }
}

// Initialize extension when popup opens
const localVault = new LocalVaultExtension();