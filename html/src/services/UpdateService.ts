export interface UpdateInfo {
    version: string;
    downloadUrl: string;
    downloadSize: number;
    changelog: string;
    critical: boolean;
    releaseDate?: string;
}

export interface UpdateStatus {
    status: 'checking' | 'no_update' | 'update_available' | 'downloading' | 'installing' | 'complete' | 'error';
    message: string;
    version?: string;
    progress?: number;
}

export class UpdateService {
    private webSocket: WebSocket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    constructor(webSocket: WebSocket | null = null) {
        this.webSocket = webSocket;
        this.setupWebSocketListeners();
    }

    setWebSocket(webSocket: WebSocket) {
        this.webSocket = webSocket;
        this.setupWebSocketListeners();
    }

    private setupWebSocketListeners() {
        if (!this.webSocket) return;

        this.webSocket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'update_status' || data.type === 'update_info' || data.type === 'update_progress') {
                    this.emit(data.type, data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message in UpdateService:', error);
            }
        });
    }

    // Event listener management
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    // Update operations
    checkForUpdates(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Update check timeout'));
            }, 30000); // 30 second timeout

            const handleResponse = (data: any) => {
                clearTimeout(timeout);
                this.off('update_status', handleResponse);
                
                switch (data.status) {
                    case 'update_available':
                        resolve(true);
                        break;
                    case 'no_update':
                        resolve(false);
                        break;
                    case 'error':
                        reject(new Error(data.message || 'Update check failed'));
                        break;
                }
            };

            this.on('update_status', handleResponse);

            this.webSocket.send(JSON.stringify({
                type: 'update',
                action: 'check'
            }));
        });
    }

    installUpdate(version?: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Update installation timeout'));
            }, 300000); // 5 minute timeout

            const handleResponse = (data: any) => {
                switch (data.status) {
                    case 'complete':
                        clearTimeout(timeout);
                        this.off('update_status', handleResponse);
                        resolve(true);
                        break;
                    case 'error':
                        clearTimeout(timeout);
                        this.off('update_status', handleResponse);
                        reject(new Error(data.message || 'Update installation failed'));
                        break;
                    // Don't resolve/reject for intermediate statuses
                }
            };

            this.on('update_status', handleResponse);

            this.webSocket.send(JSON.stringify({
                type: 'update',
                action: 'install',
                data: version
            }));
        });
    }

    rollbackUpdate(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Rollback timeout'));
            }, 60000); // 1 minute timeout

            const handleResponse = (data: any) => {
                clearTimeout(timeout);
                this.off('update_status', handleResponse);
                
                switch (data.status) {
                    case 'rollback_complete':
                        resolve(true);
                        break;
                    case 'error':
                        reject(new Error(data.message || 'Rollback failed'));
                        break;
                    default:
                        reject(new Error('Unexpected rollback response'));
                }
            };

            this.on('update_status', handleResponse);

            this.webSocket.send(JSON.stringify({
                type: 'update',
                action: 'rollback'
            }));
        });
    }

    // Utility methods
    formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatReleaseDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    parseChangelog(changelog: string): { sections: string[], formatted: string } {
        const sections = changelog.split(/\n#+\s+/).filter(section => section.trim());
        
        // Simple markdown-like formatting
        const formatted = changelog
            .replace(/^#+\s+(.+)$/gm, '<h3>$1</h3>')
            .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/(\n<li>.*<\/li>)+/g, (match) => '<ul>' + match + '</ul>');

        return { sections, formatted };
    }

    // Auto-update check
    startAutoUpdateCheck(intervalMinutes: number = 60) {
        const interval = setInterval(() => {
            this.checkForUpdates().catch(error => {
                console.warn('Auto update check failed:', error);
            });
        }, intervalMinutes * 60 * 1000);

        return () => clearInterval(interval);
    }

    // Manual update check with user feedback
    async checkForUpdatesWithFeedback(): Promise<{ hasUpdate: boolean, updateInfo?: UpdateInfo }> {
        try {
            console.log('Checking for updates...');
            
            const hasUpdate = await this.checkForUpdates();
            
            if (hasUpdate) {
                console.log('Update available!');
                return { hasUpdate: true };
            } else {
                console.log('No updates available');
                return { hasUpdate: false };
            }
        } catch (error) {
            console.error('Update check failed:', error);
            throw error;
        }
    }

    // Get current version (could be expanded to fetch from server)
    getCurrentVersion(): string {
        // This could be injected from build process or fetched from server
        return (window as any).CMDR_VERSION || '1.0.0';
    }

    // Check if we're running in development mode
    isDevelopmentMode(): boolean {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    // Get platform information
    getPlatform(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('windows')) return 'windows';
        if (userAgent.includes('mac')) return 'macos';
        if (userAgent.includes('linux')) return 'linux';
        
        return 'web'; // Fallback for web version
    }

    destroy() {
        this.listeners.clear();
        this.webSocket = null;
    }
}

// Singleton instance
let updateServiceInstance: UpdateService | null = null;

export const getUpdateService = (webSocket?: WebSocket): UpdateService => {
    if (!updateServiceInstance) {
        updateServiceInstance = new UpdateService(webSocket);
    } else if (webSocket) {
        updateServiceInstance.setWebSocket(webSocket);
    }
    
    return updateServiceInstance;
};

export const destroyUpdateService = () => {
    if (updateServiceInstance) {
        updateServiceInstance.destroy();
        updateServiceInstance = null;
    }
};
