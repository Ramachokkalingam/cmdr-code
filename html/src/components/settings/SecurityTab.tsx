import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface SecurityTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class SecurityTab extends Component<SecurityTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Authentication</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Remember Credentials</span>
                            <div 
                                className={`toggle ${settings.security.rememberCredentials ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('security', { rememberCredentials: !settings.security.rememberCredentials })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Session Timeout (seconds)</label>
                        <input
                            type="number"
                            value={settings.security.sessionTimeout}
                            onChange={(e) => onUpdateSettings('security', { sessionTimeout: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Two-Factor Authentication</span>
                            <div 
                                className={`toggle ${settings.security.twoFactorEnabled ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('security', { twoFactorEnabled: !settings.security.twoFactorEnabled })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                </div>

                <h3>Privacy</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Clear History on Exit</span>
                            <div 
                                className={`toggle ${settings.security.clearHistoryOnExit ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('security', { clearHistoryOnExit: !settings.security.clearHistoryOnExit })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Disable Command Logging</span>
                            <div 
                                className={`toggle ${settings.security.disableCommandLogging ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('security', { disableCommandLogging: !settings.security.disableCommandLogging })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Incognito Mode</span>
                            <div 
                                className={`toggle ${settings.security.incognitoMode ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('security', { incognitoMode: !settings.security.incognitoMode })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}
