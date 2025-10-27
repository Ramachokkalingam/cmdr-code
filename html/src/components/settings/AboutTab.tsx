import { h, Component } from 'preact';
import { getUpdateService } from '../../services/UpdateService';

interface AboutTabProps {
    websocket?: WebSocket;
}

interface AboutTabState {
    updateStatus: 'idle' | 'checking' | 'downloading' | 'installing' | 'success' | 'error';
    updateMessage: string;
    latestVersion?: string;
}

export class AboutTab extends Component<AboutTabProps, AboutTabState> {
    constructor(props: AboutTabProps) {
        super(props);
        this.state = {
            updateStatus: 'idle',
            updateMessage: 'Check for updates from our secure cloud backend.',
        };
    }
    
    handleCheckForUpdates = () => {
        if (this.props.websocket) {
            try {
                const updateService = getUpdateService(this.props.websocket);
                this.setState({ updateStatus: 'checking', updateMessage: 'Checking for updates from cloud backend...' });
                updateService.checkForUpdates();
            } catch (error) {
                console.error('Error initializing update service:', error);
                this.setState({ 
                    updateStatus: 'error', 
                    updateMessage: 'Failed to initialize update service. Please check console for details.' 
                });
            }
        } else {
            this.setState({ 
                updateStatus: 'error', 
                updateMessage: 'No WebSocket connection available for updates.' 
            });
        }
    }
    
    render() {
        const { updateStatus, updateMessage, latestVersion } = this.state;
        
        try {
            // Get actual version from package or build info - safely access process.env
            let appVersion = '1.7.3';
            let buildDate = new Date().toISOString().split('T')[0];
            
            // Try to get environment variables safely
            try {
                if (typeof process !== 'undefined' && process.env) {
                    appVersion = process.env.APP_VERSION || appVersion;
                    buildDate = process.env.BUILD_DATE || buildDate;
                }
            } catch (envError) {
                console.log('Environment variables not available:', envError);
            }
            
            // Safe browser API access
            let platform = 'Web Browser';
            let language = 'English'; 
            let isOnline = 'Yes';
            
            if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
                platform = navigator.platform || 'Web Browser';
                language = navigator.language || 'English';
                isOnline = navigator.onLine ? 'Yes' : 'No';
            }
            
            return (
                <div className="settings-tab-content">
                    <h3>About CMDR</h3>
                    <div className="settings-section">
                        <div className="about-info">
                            <div className="app-logo">
                                <i className="fas fa-terminal"></i>
                                <h2>CMDR</h2>
                            </div>
                            <div className="app-details">
                                <p><strong>Version:</strong> {appVersion}</p>
                                <p><strong>Build Date:</strong> {buildDate}</p>
                                <p><strong>Description:</strong> A modern web-based terminal sharing platform</p>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Update Management</h4>
                            <div className="update-checker-section">
                                <div className="update-status">
                                    {updateStatus === 'idle' && !latestVersion && (
                                        <p>Updates are delivered securely through our cloud backend.</p>
                                    )}
                                    {updateStatus === 'idle' && latestVersion && (
                                        <p>🎉 {updateMessage}</p>
                                    )}
                                    {updateStatus === 'checking' && (
                                        <p>🔄 {updateMessage}</p>
                                    )}
                                    {updateStatus === 'downloading' && (
                                        <p>⬇️ Downloading update from cloud...</p>
                                    )}
                                    {updateStatus === 'installing' && (
                                        <p>⚙️ Installing update...</p>
                                    )}
                                    {updateStatus === 'success' && (
                                        <p>✅ Update completed successfully!</p>
                                    )}
                                    {updateStatus === 'error' && (
                                        <p>❌ Update failed. Please try again or contact support.</p>
                                    )}
                                </div>
                                <div className="update-actions">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={this.handleCheckForUpdates}
                                        disabled={updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'installing'}
                                    >
                                        <i className="fas fa-sync-alt"></i> Check for Updates
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>System Information</h4>
                            <div className="system-info">
                                <p><strong>Platform:</strong> {platform}</p>
                                <p><strong>Language:</strong> {language}</p>
                                <p><strong>Online:</strong> {isOnline}</p>
                                <p><strong>Update Channel:</strong> Production</p>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Support & Contact</h4>
                            <div className="app-links">
                                <a href="mailto:support@cmdr.app" target="_blank" rel="noopener noreferrer">
                                    <i className="fas fa-envelope"></i> Contact Support
                                </a>
                                <a href="https://cmdr.app/docs" target="_blank" rel="noopener noreferrer">
                                    <i className="fas fa-book"></i> Documentation
                                </a>
                                <a href="https://cmdr.app/status" target="_blank" rel="noopener noreferrer">
                                    <i className="fas fa-server"></i> Service Status
                                </a>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Legal & Licensing</h4>
                            <p>CMDR is proprietary software developed for secure terminal sharing.</p>
                            <div className="legal-links">
                                <a href="https://cmdr.app/terms" target="_blank" rel="noopener noreferrer">
                                    Terms of Service
                                </a>
                                <span> | </span>
                                <a href="https://cmdr.app/privacy" target="_blank" rel="noopener noreferrer">
                                    Privacy Policy
                                </a>
                                <span> | </span>
                                <a href="https://cmdr.app/license" target="_blank" rel="noopener noreferrer">
                                    Software License
                                </a>
                            </div>
                            <p className="text-secondary" style={{ marginTop: '10px' }}>
                                Copyright © {new Date().getFullYear()} CMDR Technologies. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            console.error('Error rendering About tab:', error);
            console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                props: this.props,
                state: this.state
            });
            return (
                <div className="settings-tab-content">
                    <h3>About CMDR</h3>
                    <div className="settings-section">
                        <p>Error loading about information. Please refresh the page.</p>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => typeof window !== 'undefined' && window.location && window.location.reload()}
                            style={{ marginTop: '10px' }}
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }
    }
}
