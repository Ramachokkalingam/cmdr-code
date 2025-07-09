import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface AccessibilityTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class AccessibilityTab extends Component<AccessibilityTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Accessibility Settings</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>High Contrast Mode</span>
                            <div 
                                className={`toggle ${settings.accessibility.highContrast ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('accessibility', { highContrast: !settings.accessibility.highContrast })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Screen Reader Support</span>
                            <div 
                                className={`toggle ${settings.accessibility.screenReaderSupport ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('accessibility', { screenReaderSupport: !settings.accessibility.screenReaderSupport })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Keyboard Only Navigation</span>
                            <div 
                                className={`toggle ${settings.accessibility.keyboardOnlyNavigation ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('accessibility', { keyboardOnlyNavigation: !settings.accessibility.keyboardOnlyNavigation })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Text Scaling</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="0.8"
                                max="2.0"
                                step="0.1"
                                value={settings.accessibility.textScaling}
                                onChange={(e) => onUpdateSettings('accessibility', { textScaling: parseFloat((e.target as HTMLInputElement).value) })}
                            />
                            <span>{(settings.accessibility.textScaling * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Announce Commands</span>
                            <div 
                                className={`toggle ${settings.accessibility.announceCommands ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('accessibility', { announceCommands: !settings.accessibility.announceCommands })}
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
