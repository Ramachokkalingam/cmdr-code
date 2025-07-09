import { h, Component } from 'preact';
import { CmdrSettings } from '../../types/settings';

interface AITabProps {
    settings: CmdrSettings;
    onUpdateSettings: <K extends keyof CmdrSettings>(
        category: K,
        updates: Partial<CmdrSettings[K]>
    ) => void;
}

export class AITab extends Component<AITabProps> {
    render() {
        const { settings, onUpdateSettings } = this.props;
        
        return (
            <div className="settings-tab-content">
                <h3>AI Behavior</h3>
                <div className="settings-section">
                    <div className="settings-row">
                        <label>Default Model</label>
                        <select 
                            value={settings.ai.defaultModel} 
                            onChange={(e) => onUpdateSettings('ai', { defaultModel: (e.target as HTMLSelectElement).value })}
                        >
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="gpt-4">GPT-4</option>
                            <option value="claude-3">Claude 3</option>
                            <option value="llama-2">Llama 2</option>
                        </select>
                    </div>
                    <div className="settings-row">
                        <label>Response Length</label>
                        <select 
                            value={settings.ai.responseLength} 
                            onChange={(e) => onUpdateSettings('ai', { responseLength: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    </div>
                    <div className="settings-toggle">
                        <label>
                            <span>Auto Suggest Commands</span>
                            <div 
                                className={`toggle ${settings.ai.autoSuggest ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('ai', { autoSuggest: !settings.ai.autoSuggest })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Context Awareness Level</label>
                        <div className="range-input">
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={settings.ai.contextAwareness}
                                onChange={(e) => onUpdateSettings('ai', { contextAwareness: parseInt((e.target as HTMLInputElement).value) })}
                            />
                            <span>{settings.ai.contextAwareness}</span>
                        </div>
                    </div>
                </div>

                <h3>AI UI</h3>
                <div className="settings-section">
                    <div className="settings-toggle">
                        <label>
                            <span>Show Suggestions</span>
                            <div 
                                className={`toggle ${settings.ai.showSuggestions ? 'active' : ''}`} 
                                onClick={() => onUpdateSettings('ai', { showSuggestions: !settings.ai.showSuggestions })}
                            >
                                <div className="toggle-thumb"></div>
                            </div>
                        </label>
                    </div>
                    <div className="settings-row">
                        <label>Response Formatting</label>
                        <select 
                            value={settings.ai.responseFormatting} 
                            onChange={(e) => onUpdateSettings('ai', { responseFormatting: (e.target as HTMLSelectElement).value as any })}
                        >
                            <option value="plain">Plain Text</option>
                            <option value="markdown">Markdown</option>
                            <option value="rich">Rich Text</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    }
}
