import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface PerformanceTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class PerformanceTab extends Component<PerformanceTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Performance Settings</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Rendering Optimization</label>
                        <select 
                            value={settings.performance.renderingOptimization} 
                            onChange={(e) => onUpdateSettings('performance', { renderingOptimization: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="performance">Performance</option>
                            <option value="balanced">Balanced</option>
                            <option value="quality">Quality</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>Buffer Size (bytes)</label>
                        <input
                            type="number"
                            value={settings.performance.bufferSize}
                            onChange={(e) => onUpdateSettings('performance', { bufferSize: parseInt((e.target as HTMLInputElement).value) })}
                        />
                    </div>
                    <div className="settings-row">
                        <label>Frame Rate Limit (fps)</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="30"
                                max="120"
                                value={settings.performance.frameRateLimit}
                                onChange={(e) => onUpdateSettings('performance', { frameRateLimit: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.performance.frameRateLimit} fps</span>
                        </div>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Enable WebGL</span>
                            <div 
                                className={`toggle ${settings.performance.enableWebGL ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('performance', { enableWebGL: !settings.performance.enableWebGL })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Enable Canvas</span>
                            <div 
                                className={`toggle ${settings.performance.enableCanvas ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('performance', { enableCanvas: !settings.performance.enableCanvas })}
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
