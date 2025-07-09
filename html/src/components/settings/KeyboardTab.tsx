import { h, Component } from 'preact';
import { CmdrSettings, KeyboardShortcut } from '../../types/settings';

interface KeyboardTabProps {
    settings: CmdrSettings;
    editingShortcut: string | null;
    onShortcutEdit: (shortcutId: string) => void;
    onShortcutUpdate: (shortcutId: string, newShortcut: Partial<KeyboardShortcut>) => void;
}

export class KeyboardTab extends Component<KeyboardTabProps> {
    render() {
        const { settings, editingShortcut, onShortcutEdit, onShortcutUpdate } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>Keyboard Shortcuts</h3>
                <div className="shortcuts-list">
                    {settings.keyboardShortcuts.map(shortcut => (
                        <div key={shortcut.id} className="shortcut-item">
                            <div className="shortcut-info">
                                <strong>{shortcut.name}</strong>
                                <p>{shortcut.description}</p>
                            </div>
                            <div className="shortcut-key">
                                {shortcut.modifiers.ctrl && <span className="key">Ctrl</span>}
                                {shortcut.modifiers.shift && <span className="key">Shift</span>}
                                {shortcut.modifiers.alt && <span className="key">Alt</span>}
                                {shortcut.modifiers.meta && <span className="key">Meta</span>}
                                <span className="key">{shortcut.key}</span>
                            </div>
                            <div className="shortcut-actions">
                                <button onClick={() => onShortcutEdit(shortcut.id)}>
                                    <i className="fas fa-edit"></i>
                                </button>
                                <div 
                                    className={`toggle ${shortcut.enabled ? 'active' : ''}`} 
                                    onClick={() => onShortcutUpdate(shortcut.id, { enabled: !shortcut.enabled })}
                                >
                                    <div className="toggle-thumb"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
