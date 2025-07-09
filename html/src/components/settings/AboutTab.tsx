import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface AboutTabProps {
    updateCheckStatus: 'idle' | 'checking' | 'success' | 'error';
    lastUpdateCheck: string | null;
    onGitUpdate: () => void;
    onGitStatus: () => void;
}

export class AboutTab extends Component<AboutTabProps> {
    render() {
        const { updateCheckStatus, lastUpdateCheck, onGitUpdate, onGitStatus } = this.props;
        
        try {
            const appVersion = '1.0.0';
            const buildDate = '2025-07-08';
            const currentYear = 2025;
            
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
                                    {updateCheckStatus === 'idle' && (
                                        <p>Pull latest changes from GitHub repository.</p>
                                    )}
                                    {updateCheckStatus === 'checking' && (
                                        <p>🔄 Updating from GitHub...</p>
                                    )}
                                    {updateCheckStatus === 'success' && (
                                        <p>✅ Update successful!</p>
                                    )}
                                    {updateCheckStatus === 'error' && (
                                        <p>❌ Update failed. Please try again.</p>
                                    )}
                                    {lastUpdateCheck && (
                                        <p>Last checked: {new Date(lastUpdateCheck).toLocaleString()}</p>
                                    )}
                                </div>
                                <div className="update-actions">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={onGitUpdate}
                                        disabled={updateCheckStatus === 'checking'}
                                    >
                                        <i className="fas fa-download"></i> Update from GitHub
                                    </button>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={onGitStatus}
                                        style={{ marginLeft: '10px' }}
                                    >
                                        <i className="fas fa-info-circle"></i> Git Status
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>System Information</h4>
                            <div className="system-info">
                                <p><strong>Platform:</strong> Web Browser</p>
                                <p><strong>Language:</strong> English</p>
                                <p><strong>Online:</strong> Yes</p>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>Links</h4>
                            <div className="app-links">
                                <a href="https://github.com/yourusername/cmdr" target="_blank" rel="noopener noreferrer">
                                    <i className="fab fa-github"></i> Source Code
                                </a>
                                <a href="https://github.com/yourusername/cmdr/issues" target="_blank" rel="noopener noreferrer">
                                    <i className="fas fa-bug"></i> Report Issues
                                </a>
                                <a href="https://github.com/yourusername/cmdr/blob/main/README.md" target="_blank" rel="noopener noreferrer">
                                    <i className="fas fa-book"></i> Documentation
                                </a>
                            </div>
                        </div>
                        
                        <div className="settings-section">
                            <h4>License</h4>
                            <p>CMDR is open source software released under the MIT License.</p>
                            <p className="text-secondary">
                                Copyright © {currentYear} CMDR Contributors. All rights reserved.
                            </p>
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            console.error('Error rendering About tab:', error);
            return (
                <div className="settings-tab-content">
                    <h3>About CMDR</h3>
                    <div className="settings-section">
                        <p>Error loading about information.</p>
                    </div>
                </div>
            );
        }
    }
}
