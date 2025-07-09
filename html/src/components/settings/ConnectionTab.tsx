import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface ConnectionTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class ConnectionTab extends Component<ConnectionTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Connection Settings</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Auto Reconnect</span>
                            <div 
                                className={`toggle ${settings.connection.autoReconnect ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('connection', { autoReconnect: !settings.connection.autoReconnect })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Reconnect Interval (ms)</label>
                        <input
                            type="number"
                            value={settings.connection.reconnectInterval}
                            onChange={(e) => onUpdateSettings('connection', { reconnectInterval: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                    <div className="settings-row">
                        <label>Connection Timeout (ms)</label>
                        <input
                            type="number"
                            value={settings.connection.connectionTimeout}
                            onChange={(e) => onUpdateSettings('connection', { connectionTimeout: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                    <div className="settings-row">
                        <label>WebSocket Ping Interval (s)</label>
                        <input
                            type="number"
                            value={settings.connection.websocketPingInterval}
                            onChange={(e) => onUpdateSettings('connection', { websocketPingInterval: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                </div>
            </div>
        );
    }
}
