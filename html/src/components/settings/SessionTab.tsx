import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface SessionTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class SessionTab extends Component<SessionTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Session Persistence</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Save Session State</span>
                            <div 
                                className={`toggle ${settings.session.saveSessionState ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('session', { saveSessionState: !settings.session.saveSessionState })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Auto Restore Sessions</span>
                            <div 
                                className={`toggle ${settings.session.autoRestoreSessions ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('session', { autoRestoreSessions: !settings.session.autoRestoreSessions })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Session History Limit</label>
                        <input
                            type="number"
                            value={settings.session.sessionHistoryLimit}
                            onChange={(e) => onUpdateSettings('session', { sessionHistoryLimit: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Auto Export Logs</span>
                            <div 
                                className={`toggle ${settings.session.autoExportLogs ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('session', { autoExportLogs: !settings.session.autoExportLogs })}
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
