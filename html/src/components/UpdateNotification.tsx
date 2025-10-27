import { h, Component } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { UpdateInfo, UpdateStatus, getUpdateService } from '../services/UpdateService';
import './UpdateNotification.css';

interface UpdateNotificationProps {
    webSocket: WebSocket | null;
    onUpdateStart?: () => void;
    onUpdateComplete?: (success: boolean) => void;
}

export const UpdateNotification = ({
    webSocket,
    onUpdateStart,
    onUpdateComplete
}: UpdateNotificationProps) => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [updateProgress, setUpdateProgress] = useState<UpdateStatus | null>(null);
    const [showNotification, setShowNotification] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (!webSocket) return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'update_status':
                        handleUpdateStatus(data);
                        break;
                    case 'update_info':
                        handleUpdateInfo(data);
                        break;
                    case 'update_progress':
                        handleUpdateProgress(data);
                        break;
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        webSocket.addEventListener('message', handleMessage);

        // Check for updates on component mount
        setTimeout(() => {
            checkForUpdates();
        }, 5000); // Wait 5 seconds after startup

        return () => {
            webSocket.removeEventListener('message', handleMessage);
        };
    }, [webSocket]);

    const handleUpdateStatus = (data: any) => {
        switch (data.status) {
            case 'update_available':
                if (!isDismissed) {
                    setShowNotification(true);
                }
                break;
            case 'no_update':
                console.log('No updates available');
                break;
            case 'downloading':
                setUpdateProgress({
                    status: 'downloading',
                    progress: 0,
                    message: data.message || 'Downloading update...'
                });
                break;
            case 'installing':
                setUpdateProgress({
                    status: 'installing',
                    progress: 90,
                    message: data.message || 'Installing update...'
                });
                break;
            case 'complete':
                setUpdateProgress({
                    status: 'complete',
                    progress: 100,
                    message: data.message || 'Update completed successfully!'
                });
                setIsInstalling(false);
                onUpdateComplete?.(true);
                setTimeout(() => {
                    setShowNotification(false);
                    setUpdateProgress(null);
                }, 3000);
                break;
            case 'error':
                setUpdateProgress({
                    status: 'error',
                    progress: 0,
                    message: data.message || 'Update failed'
                });
                setIsInstalling(false);
                onUpdateComplete?.(false);
                break;
        }
    };

    const handleUpdateInfo = (data: any) => {
        setUpdateInfo({
            version: data.version,
            downloadUrl: data.downloadUrl,
            downloadSize: data.downloadSize || 0,
            changelog: data.changelog || '',
            critical: data.critical || false
        });
    };

    const handleUpdateProgress = (data: any) => {
        setUpdateProgress({
            status: 'downloading',
            progress: data.progress || 0,
            message: data.message || 'Downloading...'
        });
    };

    const checkForUpdates = () => {
        if (!webSocket || webSocket.readyState !== WebSocket.OPEN) return;

        webSocket.send(JSON.stringify({
            type: 'update',
            action: 'check'
        }));
    };

    const installUpdate = () => {
        if (!webSocket || !updateInfo || isInstalling) return;

        setIsInstalling(true);
        setUpdateProgress({
            status: 'downloading',
            progress: 0,
            message: 'Starting download...'
        });

        onUpdateStart?.();

        webSocket.send(JSON.stringify({
            type: 'update',
            action: 'install',
            data: updateInfo.version
        }));
    };

    const dismissNotification = () => {
        setIsDismissed(true);
        setShowNotification(false);
    };

    const formatFileSize = (bytes: number): string => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (!showNotification && !updateProgress) {
        return null;
    }

    // Show progress modal if update is in progress
    if (updateProgress) {
        return (
            <div className="update-modal-overlay">
                <div className="update-modal">
                    <div className="update-modal-header">
                        <h3>
                            {updateProgress.status === 'complete' ? '✅' : 
                             updateProgress.status === 'error' ? '❌' : '⏳'} 
                            {' '}
                            {updateProgress.status === 'downloading' ? 'Downloading Update' :
                             updateProgress.status === 'installing' ? 'Installing Update' :
                             updateProgress.status === 'complete' ? 'Update Complete' :
                             updateProgress.status === 'error' ? 'Update Failed' : 'Updating'}
                        </h3>
                    </div>
                    
                    <div className="update-modal-content">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ 
                                    width: `${updateProgress.progress || 0}%`,
                                    backgroundColor: updateProgress.status === 'error' ? '#dc3545' : 
                                                   updateProgress.status === 'complete' ? '#28a745' : '#007bff'
                                }}
                            />
                        </div>
                        <p className="progress-text">{updateProgress.message}</p>
                        {updateProgress.progress && updateProgress.progress > 0 && updateProgress.progress < 100 && (
                            <p className="progress-percentage">{updateProgress.progress || 0}%</p>
                        )}
                    </div>

                    {updateProgress.status === 'error' && (
                        <div className="update-modal-actions">
                            <button 
                                onClick={() => setUpdateProgress(null)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                            <button 
                                onClick={installUpdate}
                                className="btn btn-primary"
                                disabled={isInstalling}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show update notification
    return (
        <div className="update-notification">
            <div className="update-notification-content">
                <div className="update-header">
                    <h4>
                        🚀 Update Available
                        {updateInfo?.critical && (
                            <span className="critical-badge">Critical</span>
                        )}
                    </h4>
                    <button 
                        className="close-btn"
                        onClick={dismissNotification}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                
                {updateInfo && (
                    <div className="update-details">
                        <p><strong>Version:</strong> {updateInfo.version}</p>
                        {updateInfo.downloadSize > 0 && (
                            <p><strong>Size:</strong> {formatFileSize(updateInfo.downloadSize)}</p>
                        )}
                        
                        {updateInfo.changelog && (
                            <details className="changelog">
                                <summary>What's New</summary>
                                <div className="changelog-content">
                                    <pre>{updateInfo.changelog}</pre>
                                </div>
                            </details>
                        )}
                    </div>
                )}
                
                <div className="update-actions">
                    <button 
                        onClick={dismissNotification}
                        className="btn btn-secondary"
                    >
                        Later
                    </button>
                    <button 
                        onClick={installUpdate}
                        className={`btn ${updateInfo?.critical ? 'btn-danger' : 'btn-primary'}`}
                        disabled={isInstalling}
                    >
                        {updateInfo?.critical ? 'Install Now' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
};
