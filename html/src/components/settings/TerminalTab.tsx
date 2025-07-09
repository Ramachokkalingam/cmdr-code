import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface TerminalTabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class TerminalTab extends Component<TerminalTabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Cursor Settings</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Cursor Style</label>
                        <select 
                            value={settings.terminalBehavior.cursorStyle} 
                            onChange={(e) => onUpdateSettings('terminalBehavior', { cursorStyle: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="block">Block</option>
                            <option value="underline">Underline</option>
                            <option value="bar">Bar</option>
                        </select>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Cursor Blink</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.cursorBlink ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { cursorBlink: !settings.terminalBehavior.cursorBlink })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                </div>

                <h3>Terminal Behavior</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Default Shell</label>
                        <select 
                            value={settings.terminalBehavior.defaultShell || 'bash'} 
                            onChange={(e) => onUpdateSettings('terminalBehavior', { defaultShell: (e.target as HTMLSelectElement).value })}
                        >
                            <option value="bash">Bash (/usr/bin/bash)</option>
                            <option value="sh">Sh (/usr/bin/sh)</option>
                            <option value="zsh">Zsh (/usr/bin/zsh)</option>
                            <option value="fish">Fish (/usr/bin/fish)</option>
                        </select>
                        {/* <small className="settings-hint">
                            Changes will create a new session with the selected shell
                        </small>
                        <small className="settings-hint warning">
                            Note: Use full path (e.g., /usr/bin/bash) to avoid "execvp failed" errors
                        </small> */}
                    </div>
                    <div className="settings-row">
                        <label>Scrollback Buffer Size</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="100"
                                max="10000"
                                step="100"
                                value={settings.terminalBehavior.scrollbackSize}
                                onChange={(e) => onUpdateSettings('terminalBehavior', { scrollbackSize: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.terminalBehavior.scrollbackSize} lines</span>
                        </div>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Bell Sound</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.bellSound ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { bellSound: !settings.terminalBehavior.bellSound })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Copy on Selection</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.copyOnSelection ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { copyOnSelection: !settings.terminalBehavior.copyOnSelection })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Paste on Right Click</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.pasteOnRightClick ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { pasteOnRightClick: !settings.terminalBehavior.pasteOnRightClick })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Word Wrap</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.wordWrap ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { wordWrap: !settings.terminalBehavior.wordWrap })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Tab Completion</span>
                            <div 
                                className={`toggle ${settings.terminalBehavior.tabCompletion ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('terminalBehavior', { tabCompletion: !settings.terminalBehavior.tabCompletion })}
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
