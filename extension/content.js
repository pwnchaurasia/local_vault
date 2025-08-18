// content.js - LocalVault Chrome Extension Content Script

class LocalVaultContent {
    constructor() {
        this.setupKeyboardShortcuts();
        this.setupQuickActions();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + V - Quick upload selected text
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.uploadSelectedText();
            }

            // Ctrl/Cmd + Shift + U - Show upload dialog
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
                e.preventDefault();
                this.showQuickUploadDialog();
            }
        });
    }

    setupQuickActions() {
        // Add floating action button for quick access
        this.createFloatingButton();
    }

    createFloatingButton() {
        // Only add button if it doesn't exist
        if (document.getElementById('localvault-fab')) return;

        const fab = document.createElement('div');
        fab.id = 'localvault-fab';
        fab.innerHTML = '🔐';
        fab.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            font-size: 20px;
            opacity: 0.8;
        `;

        fab.addEventListener('mouseenter', () => {
            fab.style.opacity = '1';
            fab.style.transform = 'scale(1.1)';
        });

        fab.addEventListener('mouseleave', () => {
            fab.style.opacity = '0.8';
            fab.style.transform = 'scale(1)';
        });

        fab.addEventListener('click', () => {
            this.showQuickUploadDialog();
        });

        document.body.appendChild(fab);

        // Hide FAB after 10 seconds of no activity
        let hideTimeout = setTimeout(() => {
            fab.style.display = 'none';
        }, 10000);

        // Show FAB on mouse movement
        document.addEventListener('mousemove', () => {
            fab.style.display = 'flex';
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                fab.style.display = 'none';
            }, 10000);
        });
    }

    async uploadSelectedText() {
        const selectedText = window.getSelection().toString().trim();

        if (!selectedText) {
            this.showToast('No text selected');
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'uploadText',
                text: selectedText
            });

            if (response.success) {
                this.showToast('Text uploaded to LocalVault!');
            } else {
                this.showToast('Upload failed: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            this.showToast('Upload failed: ' + error.message);
        }
    }

    showQuickUploadDialog() {
        // Remove existing dialog if present
        const existing = document.getElementById('localvault-dialog');
        if (existing) {
            existing.remove();
        }

        const dialog = document.createElement('div');
        dialog.id = 'localvault-dialog';
        dialog.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    width: 400px;
                    max-width: 90vw;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                ">
                    <h3 style="
                        margin: 0 0 20px 0;
                        color: #333;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">🔐 LocalVault Quick Upload</h3>

                    <textarea id="localvault-quick-text" placeholder="Paste or type your text here..." style="
                        width: 100%;
                        height: 100px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        padding: 12px;
                        font-family: inherit;
                        font-size: 14px;
                        resize: vertical;
                        box-sizing: border-box;
                    "></textarea>

                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 20px;
                    ">
                        <button id="localvault-upload-btn" style="
                            flex: 1;
                            padding: 12px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Upload</button>

                        <button id="localvault-cancel-btn" style="
                            flex: 1;
                            padding: 12px;
                            background: #f5f5f5;
                            color: #666;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Cancel</button>
                    </div>

                    <div style="
                        margin-top: 15px;
                        font-size: 12px;
                        color: #999;
                        text-align: center;
                    ">
                        Shortcut: Ctrl+Shift+V (selected text) | Ctrl+Shift+U (dialog)
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Auto-fill with selected text
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            document.getElementById('localvault-quick-text').value = selectedText;
        }

        // Focus textarea
        document.getElementById('localvault-quick-text').focus();

        // Event listeners
        document.getElementById('localvault-upload-btn').addEventListener('click', async () => {
            const text = document.getElementById('localvault-quick-text').value.trim();
            if (!text) {
                alert('Please enter some text');
                return;
            }

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'uploadText',
                    text: text
                });

                if (response.success) {
                    this.showToast('Text uploaded successfully!');
                    dialog.remove();
                } else {
                    alert('Upload failed: ' + (response.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Upload failed: ' + error.message);
            }
        });

        document.getElementById('localvault-cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });

        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }

    showToast(message) {
        // Remove existing toast
        const existing = document.getElementById('localvault-toast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'localvault-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    toast.remove();
                    style.remove();
                }, 300);
            }
        }, 3000);
    }

    // Handle paste events to detect clipboard content
    handlePaste(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        const items = clipboardData.items;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                // Handle image paste
                const file = item.getAsFile();
                this.uploadClipboardImage(file);
                break;
            }
        }
    }

    async uploadClipboardImage(file) {
        try {
            const formData = new FormData();
            formData.append('file', file, 'clipboard-image.png');

            const settings = await chrome.runtime.sendMessage({ action: 'getSettings' });

            if (!settings.jwtToken || !settings.baseUrl) {
                this.showToast('Please setup LocalVault first');
                return;
            }

            const response = await fetch(`${settings.baseUrl}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${settings.jwtToken}`,
                },
                body: formData,
            });

            if (response.ok) {
                this.showToast('Clipboard image uploaded!');
            } else {
                this.showToast('Image upload failed');
            }
        } catch (error) {
            this.showToast('Upload error: ' + error.message);
        }
    }
}

// Initialize content script only if not already initialized
if (!window.localVaultContent) {
    window.localVaultContent = new LocalVaultContent();

    // Listen for paste events
    document.addEventListener('paste', (e) => {
        window.localVaultContent.handlePaste(e);
    });
}