import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface AdvancedTabProps {
    settings: CmdrSettings;
    importExportData: string;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
    onImportExportDataChange: (data: string) => void;
    onExportSettings: () => void;
    onImportSettings: () => void;
}

export class AdvancedTab extends Component<AdvancedTabProps> {
    render() {
        const { settings, importExportData, onUpdateSettings, onImportExportDataChange, onExportSettings, onImportSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Developer Options</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Debug Mode</span>
                            <div 
                                className={`toggle ${settings.developer.debugMode ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('developer', { debugMode: !settings.developer.debugMode })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Console Logging Level</label>
                        <select 
                            value={settings.developer.consoleLoggingLevel} 
                            onChange={(e) => onUpdateSettings('developer', { consoleLoggingLevel: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="error">Error</option>
                            <option value="warn">Warning</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                        </select>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Performance Monitoring</span>
                            <div 
                                className={`toggle ${settings.developer.performanceMonitoring ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('developer', { performanceMonitoring: !settings.developer.performanceMonitoring })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>WebSocket Inspection</span>
                            <div 
                                className={`toggle ${settings.developer.websocketInspection ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('developer', { websocketInspection: !settings.developer.websocketInspection })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                </div>

                <h3>Import/Export</h3>
                <div className="settings-section">
                    <button className="btn btn-secondary" onClick={onExportSettings}>
                        Export Settings
                    </button>
                    {importExportData && (
                        <div className="import-export-area">
                            <textarea
                                rows={10}
                                value={importExportData}
                                onChange={(e) => onImportExportDataChange((e.target as HTMLTextAreaElement).value)}
                                placeholder="Paste settings JSON here to import..."
                            />
                            <button className="btn btn-primary" onClick={onImportSettings}>
                                Import Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
