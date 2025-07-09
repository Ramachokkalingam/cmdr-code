import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface UITabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class UITab extends Component<UITabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Layout Options</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Show Session Sidebar by Default</span>
                            <div 
                                className={`toggle ${settings.ui.showSessionSidebar ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('ui', { showSessionSidebar: !settings.ui.showSessionSidebar })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>AI Bar Auto Open</span>
                            <div 
                                className={`toggle ${settings.ui.aiBarAutoOpen ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('ui', { aiBarAutoOpen: !settings.ui.aiBarAutoOpen })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>AI Bar Position</label>
                        <select 
                            value={settings.ui.aiBarPosition} 
                            onChange={(e) => onUpdateSettings('ui', { aiBarPosition: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="side">Side</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>Terminal Padding</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="0"
                                max="32"
                                value={settings.ui.terminalPadding}
                                onChange={(e) => onUpdateSettings('ui', { terminalPadding: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.ui.terminalPadding}px</span>
                        </div>
                    </div>
                    <div className="settings-row">
                        <label>Terminal Margins</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="0"
                                max="32"
                                value={settings.ui.terminalMargins}
                                onChange={(e) => onUpdateSettings('ui', { terminalMargins: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.ui.terminalMargins}px</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
