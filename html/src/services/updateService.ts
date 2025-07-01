export interface UpdateInfo {
    version: string;
    downloadUrl: string;
    releaseNotes: string;
    mandatory: boolean;
    size: number;
    checksum?: string;
}

export interface UpdateResponse {
    updateAvailable: boolean;
    update?: UpdateInfo;
}

export class UpdateService {
    private currentVersion = "1.0.0";
    private apiBaseUrl = "/api";
    
    async checkForUpdates(): Promise<UpdateInfo | null> {
        try {
            console.debug('[UpdateService] Checking for updates...');
            
            const response = await fetch(`${this.apiBaseUrl}/version/check`, {
                headers: {
                    'Current-Version': this.currentVersion,
                    'Platform': this.getPlatform(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data: UpdateResponse = await response.json();
            console.debug('[UpdateService] Update check response:', data);
            
            return data.updateAvailable ? data.update! : null;
        } catch (error) {
            console.error('[UpdateService] Update check failed:', error);
            return null;
        }
    }

    async downloadUpdate(
        updateInfo: UpdateInfo, 
        onProgress: (progress: number) => void
    ): Promise<ArrayBuffer> {
        const response = await fetch(updateInfo.downloadUrl);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        const contentLength = parseInt(response.headers.get('content-length') || '0');
        const reader = response.body?.getReader();
        
        if (!reader) {
            throw new Error('Failed to get response reader');
        }

        const chunks: Uint8Array[] = [];
        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            if (contentLength > 0) {
                onProgress((receivedLength / contentLength) * 100);
            }
        }

        // Combine chunks into single ArrayBuffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result.buffer;
    }

    async installUpdate(updateBuffer: ArrayBuffer): Promise<void> {
        try {
            // For web applications, we need to use different strategies
            if (this.isElectronApp()) {
                await this.installElectronUpdate(updateBuffer);
            } else if (this.isPWA()) {
                await this.installPWAUpdate();
            } else {
                await this.installWebUpdate();
            }
        } catch (error) {
            console.error('Update installation failed:', error);
            throw error;
        }
    }

    private getPlatform(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        if (platform.includes('win') || userAgent.includes('windows')) {
            return 'windows';
        } else if (platform.includes('mac') || userAgent.includes('macintosh')) {
            return 'macos';
        } else if (platform.includes('linux') || userAgent.includes('linux')) {
            return 'linux';
        }
        
        return 'web';
    }

    private isElectronApp(): boolean {
        return !!(window as any).electronAPI;
    }

    private isPWA(): boolean {
        return 'serviceWorker' in navigator && window.matchMedia('(display-mode: standalone)').matches;
    }

    private async installElectronUpdate(updateBuffer: ArrayBuffer): Promise<void> {
        if (this.isElectronApp()) {
            await (window as any).electronAPI.installUpdate(updateBuffer);
        }
    }

    private async installPWAUpdate(): Promise<void> {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.update();
            window.location.reload();
        }
    }

    private async installWebUpdate(): Promise<void> {
        // For web applications, force a hard refresh to get the latest version
        window.location.reload();
    }

    compareVersions(current: string, target: string): number {
        const currentParts = current.split('.').map(Number);
        const targetParts = target.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, targetParts.length); i++) {
            const currentPart = currentParts[i] || 0;
            const targetPart = targetParts[i] || 0;
            
            if (currentPart > targetPart) return 1;
            if (currentPart < targetPart) return -1;
        }
        
        return 0;
    }

    getCurrentVersion(): string {
        return this.currentVersion;
    }
}

// Global instance
export const updateService = new UpdateService();
