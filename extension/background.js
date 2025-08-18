// background.js - LocalVault Chrome Extension Background Script

class LocalVaultBackground {
    constructor() {
        this.setupEventListeners();
        this.setupContextMenu();
    }

    setupEventListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                console.log('LocalVault Extension installed');
                this.showWelcomeNotification();
            }
        });

        // Handle messages from content script or popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Handle downloads
        chrome.downloads.onChanged.addListener((downloadDelta) => {
            if (downloadDelta.state && downloadDelta.state.current === 'complete') {
                this.showDownloadCompleteNotification();
            }
        });
    }

    setupContextMenu() {
        // Create context menu for text selection
        chrome.contextMenus.create({
            id: 'localvault-send-text',
            title: 'Send to LocalVault',
            contexts: ['selection'],
        });

        // Create context menu for images
        chrome.contextMenus.create({
            id: 'localvault-send-image',
            title: 'Send Image to LocalVault',
            contexts: ['image'],
        });

        // Handle context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'uploadText':
                    await this.uploadText(message.text);
                    sendResponse({ success: true });
                    break;

                case 'uploadImage':
                    await this.uploadImage(message.imageUrl);
                    sendResponse({ success: true });
                    break;

                case 'getSettings':
                    const settings = await this.getSettings();
                    sendResponse(settings);
                    break;

                case 'testConnection':
                    const isConnected = await this.testConnection();
                    sendResponse({ connected: isConnected });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleContextMenuClick(info, tab) {
        const settings = await this.getSettings();

        if (!settings.jwtToken || !settings.baseUrl) {
            this.show