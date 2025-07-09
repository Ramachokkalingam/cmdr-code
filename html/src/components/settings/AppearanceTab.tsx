import { h, Component } from 'preact';
import { CmdrSettings, ColorTheme, predefinedThemes, predefinedFonts } from '../../types/settings';

interface AppearanceTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
    onThemeChange: (theme: ColorTheme) => void;
}

export class AppearanceTab extends Component<AppearanceTabProps> {
    render() {
        const { settings, onUpdateSettings, onThemeChange } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Font Settings</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Font Family</label>
                        <select 
                            value={settings.font.family} 
                            onChange={(e) => onUpdateSettings('font', { family: (e.target as HTMLSelectElement).value })}
                        >
                            {predefinedFonts.map(font => (
                                <option key={font} value={font}>{font}</option>
                            ))}
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>Font Size</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="8"
                                max="32"
                                value={settings.font.size}
                                onChange={(e) => onUpdateSettings('font', { size: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.font.size}px</span>
                        </div>
                    </div>
                    <div className="settings-row">
                        <label>Font Weight</label>
                        <select 
                            value={settings.font.weight} 
                            onChange={(e) => onUpdateSettings('font', { weight: (e.target as HTMLSelectElement).value as 'normal' | 'bold' })}
                        >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>Line Height</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="1"
                                max="2"
                                step="0.1"
                                value={settings.font.lineHeight}
                                onChange={(e) => onUpdateSettings('font', { lineHeight: parseFloat((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.font.lineHeight}</span>
                        </div>
                    </div>
                </div>

                <h3>Color Themes</h3>
                <div className="theme-grid">
                    {predefinedThemes.map(theme => (
                        <div
                            key={theme.name}
                            className={`theme-card ${settings.theme.name === theme.name ? 'active' : ''}`}
                            onClick={() => onThemeChange(theme)}
                        >
                            <div className="theme-preview">
                                <div 
                                    className="theme-color" 
                                    style={{ backgroundColor: theme.colors.accent }}
                                ></div>
                            </div>
                            <span className="theme-name">{theme.displayName}</span>
                            {settings.theme.name === theme.name && (
                                <i className="fas fa-check theme-check"></i>
                            )}
                        </div>
                    ))}
                </div>

                <h3>Theme Customization</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Background Opacity</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={settings.theme.opacity || 1}
                                onChange={(e) => {
                                    const opacity = parseFloat((e.target as HTMLInputElement).value);
                                    const updatedTheme = { ...settings.theme, opacity };
                                    onThemeChange(updatedTheme);
                                }}
                            />
                            <span>{((settings.theme.opacity || 1) * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
