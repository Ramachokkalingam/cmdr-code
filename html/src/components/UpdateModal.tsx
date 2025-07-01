import { h, FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';
import { UpdateInfo, updateService } from '../services/updateService';
import './UpdateModal.scss';

interface UpdateModalProps {
    updateInfo: UpdateInfo;
    onClose: () => void;
    onSkip: () => void;
}

export const UpdateModal: FunctionalComponent<UpdateModalProps> = ({ 
    updateInfo, 
    onClose, 
    onSkip 
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isInstalling, setIsInstalling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInstall = async () => {
        try {
            setError(null);
            setIsDownloading(true);
            setDownloadProgress(0);
            
            // Download update
            const updateBuffer = await updateService.downloadUpdate(
                updateInfo, 
                setDownloadProgress
            );
            
            setIsDownloading(false);
            setIsInstalling(true);
            
            // Install update
            await updateService.installUpdate(updateBuffer);
            
        } catch (error) {
            console.error('Update failed:', error);
            setError(error instanceof Error ? error.message : 'Update failed');
            setIsDownloading(false);
            setIsInstalling(false);
        }
    };

    const handleSkip = () => {
        if (!updateInfo.mandatory) {
            onSkip();
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="update-modal-overlay">
            <div className="update-modal">
                <div className="modal-header">
                    <h2>
                        {updateInfo.mandatory ? 'Required Update' : 'Update Available'}
                    </h2>
                    {!updateInfo.mandatory && !isDownloading && !isInstalling && (
                        <button 
                            className="close-btn" 
                            onClick={onClose}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="modal-content">
                    <div className="version-info">
                        <p>
                            <strong>New Version:</strong> {updateInfo.version}
                        </p>
                        <p>
                            <strong>Current Version:</strong> {updateService.getCurrentVersion()}
                        </p>
                        <p>
                            <strong>Download Size:</strong> {formatFileSize(updateInfo.size)}
                        </p>
                    </div>

                    {updateInfo.releaseNotes && (
                        <div className="release-notes">
                            <h3>What's New:</h3>
                            <div className="notes-content">
                                {updateInfo.releaseNotes.split('\n').map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <p>❌ {error}</p>
                        </div>
                    )}

                    {isDownloading && (
                        <div className="download-progress">
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                                <span className="progress-text">
                                    {Math.round(downloadProgress)}%
                                </span>
                            </div>
                            <p>Downloading update...</p>
                        </div>
                    )}

                    {isInstalling && (
                        <div className="installing">
                            <div className="spinner"></div>
                            <p>Installing update... Application will restart shortly.</p>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button 
                        onClick={handleInstall}
                        disabled={isDownloading || isInstalling}
                        className="install-btn primary"
                    >
                        {isDownloading ? 'Downloading...' : 
                         isInstalling ? 'Installing...' : 'Install Update'}
                    </button>
                    
                    {!updateInfo.mandatory && (
                        <button 
                            onClick={handleSkip}
                            disabled={isDownloading || isInstalling}
                            className="skip-btn secondary"
                        >
                            {updateInfo.mandatory ? 'Update Required' : 'Skip'}
                        </button>
                    )}
                </div>

                {updateInfo.mandatory && (
                    <div className="mandatory-notice">
                        <p>⚠️ This update is required to continue using the application.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpdateModal;
