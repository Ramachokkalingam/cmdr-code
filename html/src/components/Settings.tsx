import { h, Component } from 'preact';
import { CmdrSettings, ColorTheme, KeyboardShortcut } from '../types/settings';
import settingsService from '../services/settings';
import './settings/Settings.scss';

import {
    AppearanceTab,
    TerminalTab,
    UITab,
    KeyboardTab,
    ConnectionTab,
    PerformanceTab,
    SecurityTab,
    AITab,
    SessionTab,
    AdvancedTab,
    AccessibilityTab,
    AboutTab
} from './settings';

export interface Theme {
    name: string;
    displayName: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        border: string;
        error: string;
        success: string;
        terminalBackground: string;
        terminalForeground: string;
        terminalCursor: string;
    };
}

interface SettingsProps {
    isVisible: boolean;
    onClose: () => void;
    currentTheme: string;
    onThemeChange: (theme: Theme) => void;
    onFontSizeChange?: (fontSize: number) => void;
    onFontFamilyChange?: (fontFamily: string) => void;
    onPreferenceChange?: (key: string, value: boolean) => void;
    onShellChange?: (shellName: string) => void;
}

interface SettingsState {
    activeTab: string;
    settings: CmdrSettings;
    editingShortcut: string | null;
    customTheme: ColorTheme | null;
    importExportData: string;
    updateCheckStatus: 'idle' | 'checking' | 'success' | 'error';
    lastUpdateCheck: string | null;
}

export class Settings extends Component<SettingsProps, SettingsState> {
    private settingsUnsubscribe?: () => void;

    constructor(props: SettingsProps) {
        super(props);
        this.state = {
            activeTab: 'appearance',
            settings: settingsService.getSettings(),
            editingShortcut: null,
            customTheme: null,
            importExportData: '',
            updateCheckStatus: 'idle',
            lastUpdateCheck: null,
        };
    }

    componentDidMount() {
        // Listen for settings changes
        this.settingsUnsubscribe = settingsService.addListener((settings) => {
            this.setState({ settings });
        });
    }

    componentWillUnmount() {
        if (this.settingsUnsubscribe) {
            this.settingsUnsubscribe();
        }
    }

    updateSettings = <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => {
        const currentSettings = { ...this.state.settings };
        const currentCategorySettings = currentSettings[category] || {};
        currentSettings[category] = { ...currentCategorySettings, ...updates } as any;
        
        this.setState({ settings: currentSettings });
        
        // Update through service
        switch (category) {
            case 'font':
                settingsService.updateFontSettings(updates as any);
                break;
            case 'terminalBehavior':
                settingsService.updateTerminalBehavior(updates as any);
                break;
            case 'ui':
                settingsService.updateUISettings(updates as any);
                break;
            case 'connection':
                settingsService.updateConnectionSettings(updates as any);
                break;
            case 'performance':
                settingsService.updatePerformanceSettings(updates as any);
                break;
            case 'security':
                settingsService.updateSecuritySettings(updates as any);
                break;
            case 'ai':
                settingsService.updateAISettings(updates as any);
                break;
            case 'session':
                settingsService.updateSessionSettings(updates as any);
                break;
            case 'developer':
                settingsService.updateDeveloperSettings(updates as any);
                break;
            case 'accessibility':
                settingsService.updateAccessibilitySettings(updates as any);
                break;
        }
    };

    handleThemeChange = (theme: ColorTheme) => {
        settingsService.updateTheme(theme);
        this.props.onThemeChange({
            name: theme.name,
            displayName: theme.displayName,
            colors: theme.colors,
        });
    };

    handleShortcutEdit = (shortcutId: string) => {
        this.setState({ editingShortcut: shortcutId });
    };

    handleShortcutUpdate = (shortcutId: string, newShortcut: Partial<KeyboardShortcut>) => {
        const shortcuts = this.state.settings.keyboardShortcuts.map(shortcut => 
            shortcut.id === shortcutId ? { ...shortcut, ...newShortcut } : shortcut
        );
        settingsService.updateKeyboardShortcuts(shortcuts);
        this.setState({ editingShortcut: null });
    };

    exportSettings = () => {
        const exported = settingsService.exportSettings();
        this.setState({ importExportData: exported });
    };

    importSettings = () => {
        const success = settingsService.importSettings(this.state.importExportData);
        if (success) {
            this.setState({ 
                settings: settingsService.getSettings(),
                importExportData: '',
            });
        }
    };

    resetSettings = () => {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            settingsService.resetToDefaults();
        }
    };

    handleGitUpdate = async () => {
        try {
            console.log('Starting git update from GitHub...');
            
            // Show loading state
            this.setState({ updateCheckStatus: 'checking' });
            
            // Make a request to the backend to perform git pull
            const response = await fetch('/api/git/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'pull',
                    repository: 'origin',
                    branch: 'main'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Git update successful:', result);
                
                this.setState({ 
                    updateCheckStatus: 'success',
                    lastUpdateCheck: new Date().toISOString()
                });
                
                // Show success message
                alert('Update successful! The application will reload to apply changes.');
                
                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } else {
                const error = await response.json();
                console.error('Git update failed:', error);
                
                this.setState({ updateCheckStatus: 'error' });
                alert('Update failed: ' + (error.message || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error during git update:', error);
            this.setState({ updateCheckStatus: 'error' });
            alert('Update failed: ' + (error instanceof Error ? error.message : 'Network error'));
        }
    };

    handleGitStatus = async () => {
        try {
            console.log('Fetching git status...');
            
            const response = await fetch('/api/git/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Git status:', result);
                
                // Show git status in an alert (you could also show this in a modal)
                const statusMessage = [
                    `Current Branch: ${result.current_branch || 'Unknown'}`,
                    `Latest Commit: ${result.latest_commit || 'Unknown'}`,
                    `Status: ${result.status || 'Unknown'}`,
                    `Remote URL: ${result.remote_url || 'Unknown'}`,
                    `Checked at: ${new Date(result.timestamp).toLocaleString()}`
                ].join('\n');
                
                alert('Git Repository Status:\n\n' + statusMessage);
                
            } else {
                const error = await response.json();
                console.error('Failed to get git status:', error);
                alert('Failed to get git status: ' + (error.detail || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error getting git status:', error);
            alert('Error getting git status: ' + (error instanceof Error ? error.message : 'Network error'));
        }
    };

    renderTabNavigation = () => {
        const tabs = [
            { id: 'appearance', label: 'Appearance', icon: 'fas fa-palette' },
            { id: 'terminal', label: 'Terminal', icon: 'fas fa-terminal' },
            { id: 'ui', label: 'UI/UX', icon: 'fas fa-desktop' },
            { id: 'keyboard', label: 'Keyboard', icon: 'fas fa-keyboard' },
            { id: 'connection', label: 'Connection', icon: 'fas fa-wifi' },
            { id: 'performance', label: 'Performance', icon: 'fas fa-tachometer-alt' },
            { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
            { id: 'ai', label: 'AI Assistant', icon: 'fas fa-robot' },
            { id: 'session', label: 'Sessions', icon: 'fas fa-history' },
            { id: 'advanced', label: 'Advanced', icon: 'fas fa-cogs' },
            { id: 'accessibility', label: 'Accessibility', icon: 'fas fa-universal-access' },
            { id: 'about', label: 'About', icon: 'fas fa-info-circle' },
        ];

        return (
            <div className="settings-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${this.state.activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            console.log(`Switching to tab: ${tab.id}`);
                            this.setState({ activeTab: tab.id });
                        }}
                    >
                        <i className={tab.icon}></i>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    handleImportExportDataChange = (data: string) => {
        this.setState({ importExportData: data });
    };

    render() {
        const { isVisible, onClose } = this.props;
        const { activeTab, settings, editingShortcut, importExportData, updateCheckStatus, lastUpdateCheck } = this.state;

        if (!isVisible) return null;

        return (
            <div className="settings-overlay" onClick={onClose}>
                <div className="settings-modal enhanced" onClick={e => e.stopPropagation()}>
                    <div className="settings-header">
                        <h2>
                            <i className="fas fa-cog"></i>
                            Settings
                        </h2>
                        <div className="header-actions">
                            <button className="btn-icon" onClick={this.exportSettings} title="Export Settings">
                                <i className="fas fa-download"></i>
                            </button>
                            <button className="btn-icon" onClick={this.resetSettings} title="Reset to Defaults">
                                <i className="fas fa-undo"></i>
                            </button>
                            <button className="close-btn" onClick={onClose}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div className="settings-body">
                        {this.renderTabNavigation()}
                        
                        <div className="settings-content">
                            {activeTab === 'appearance' && (
                                <AppearanceTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                    onThemeChange={this.handleThemeChange} 
                                />
                            )}
                            
                            {activeTab === 'terminal' && (
                                <TerminalTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'ui' && (
                                <UITab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'keyboard' && (
                                <KeyboardTab 
                                    settings={settings} 
                                    editingShortcut={editingShortcut} 
                                    onShortcutEdit={this.handleShortcutEdit} 
                                    onShortcutUpdate={this.handleShortcutUpdate} 
                                />
                            )}
                            
                            {activeTab === 'connection' && (
                                <ConnectionTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'performance' && (
                                <PerformanceTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'security' && (
                                <SecurityTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'ai' && (
                                <AITab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'session' && (
                                <SessionTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'advanced' && (
                                <AdvancedTab 
                                    settings={settings} 
                                    importExportData={importExportData}
                                    onUpdateSettings={this.updateSettings} 
                                    onImportExportDataChange={this.handleImportExportDataChange}
                                    onExportSettings={this.exportSettings}
                                    onImportSettings={this.importSettings}
                                />
                            )}
                            
                            {activeTab === 'accessibility' && (
                                <AccessibilityTab 
                                    settings={settings} 
                                    onUpdateSettings={this.updateSettings} 
                                />
                            )}
                            
                            {activeTab === 'about' && (
                                <AboutTab 
                                    updateCheckStatus={updateCheckStatus} 
                                    lastUpdateCheck={lastUpdateCheck} 
                                    onGitUpdate={this.handleGitUpdate}
                                    onGitStatus={this.handleGitStatus}
                                />
                            )}
                        </div>
                    </div>

                    <div className="settings-footer">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={onClose}>
                            Save & Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
