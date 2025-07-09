import { bind } from 'decko';
import { Component, h } from 'preact';
import { cloudService } from '../../services/cloud';
import './ai-bar.scss';

interface Props {
    onCommandGenerated: (command: string) => void;
}

interface State {
    input: string;
    loading: boolean;
    result: string;
    error: string;
    suggestions: string[];
    showSuggestions: boolean;
    history: string[];
    historyIndex: number;
    isExpanded: boolean;
}

export class AIBar extends Component<Props, State> {
    constructor() {
        super();
        this.state = {
            input: '',
            loading: false,
            result: '',
            error: '',
            suggestions: [
                'list all files in current directory',
                'find files larger than 100MB',
                'show running processes',
                'check disk usage',
                'find files modified today',
                'kill process by name',
                'create a new directory',
                'compress files into archive',
                'search for text in files',
                'show system information'
            ],
            showSuggestions: false,
            history: [],
            historyIndex: -1,
            isExpanded: true,
        };
    }

    @bind
    handleInputChange(event: Event) {
        const input = (event.target as HTMLInputElement).value;
        this.setState({ 
            input,
            showSuggestions: input.length > 0,
            error: '' // Clear error when user starts typing
        });
    }

    @bind
    handleInputFocus() {
        this.setState({ showSuggestions: this.state.input.length > 0 });
    }

    @bind
    handleInputBlur() {
        // Delay hiding suggestions to allow clicking on them
        setTimeout(() => {
            this.setState({ showSuggestions: false });
        }, 200);
    }

    @bind
    async handleSubmit(event: Event) {
        event.preventDefault();

        const { input, history } = this.state;
        if (!input.trim()) return;

        this.setState({ loading: true, error: '', result: '', showSuggestions: false });

        try {
            const response = await cloudService.askAI(input);
            
            // Add to history if not already present
            const newHistory = history.includes(input) 
                ? history 
                : [input, ...history].slice(0, 10); // Keep last 10 items
            
            this.setState({ 
                result: response.result,
                history: newHistory,
                historyIndex: -1
            });
            
            // Pass the command to parent component
            this.props.onCommandGenerated(response.result);
        } catch (error) {
            this.setState({
                error: `Failed to get AI response: ${(error as Error).message}`,
            });
        } finally {
            this.setState({ loading: false });
        }
    }

    @bind
    handleKeyPress(event: KeyboardEvent) {
        const { history, historyIndex, showSuggestions } = this.state;
        
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSubmit(event);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (history.length > 0) {
                const newIndex = Math.min(historyIndex + 1, history.length - 1);
                this.setState({
                    historyIndex: newIndex,
                    input: history[newIndex] || '',
                    showSuggestions: false
                });
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                this.setState({
                    historyIndex: newIndex,
                    input: history[newIndex] || '',
                    showSuggestions: false
                });
            } else if (historyIndex === 0) {
                this.setState({
                    historyIndex: -1,
                    input: '',
                    showSuggestions: false
                });
            }
        } else if (event.key === 'Escape') {
            this.setState({ showSuggestions: false });
        }
    }

    @bind
    clearInput() {
        this.setState({ 
            input: '', 
            result: '', 
            error: '', 
            showSuggestions: false,
            historyIndex: -1
        });
    }

    @bind
    toggleExpanded() {
        this.setState({ isExpanded: !this.state.isExpanded });
    }

    @bind
    useSuggestion(suggestion: string) {
        this.setState({ 
            input: suggestion, 
            showSuggestions: false,
            historyIndex: -1
        });
    }

    @bind
    copyCommand() {
        const { result } = this.state;
        if (result) {
            navigator.clipboard.writeText(result).then(() => {
                // Could show a toast notification here
                console.log('Command copied to clipboard');
            });
        }
    }

    @bind
    useCommand() {
        const { result } = this.state;
        if (result) {
            this.props.onCommandGenerated(result);
            this.clearInput();
        }
    }

    render() {
        const { input, loading, result, error, suggestions, showSuggestions, history, isExpanded } = this.state;
        
        // Filter suggestions based on input
        const filteredSuggestions = suggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 5);

        return (
            <div class={`ai-bar ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div class="ai-bar-header">
                    <div class="ai-bar-title">
                        <span class="ai-icon">🤖</span>
                        AI Command Assistant
                        <span class="ai-status">{loading ? '⟳' : '✨'}</span>
                    </div>
                    <div class="header-actions">
                        <button 
                            class="toggle-btn" 
                            onClick={this.toggleExpanded} 
                            title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? '⌄' : '⌃'}
                        </button>
                        <button class="clear-btn" onClick={this.clearInput} title="Clear">
                            ✕
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div class="ai-bar-content">
                        <form class="ai-bar-form" onSubmit={this.handleSubmit}>
                            <div class="input-container">
                                <div class="input-wrapper">
                                    <input
                                        type="text"
                                        class="ai-input"
                                        placeholder="Describe what you want to do... (e.g., 'list all files', 'find large files')"
                                        value={input}
                                        onInput={this.handleInputChange}
                                        onFocus={this.handleInputFocus}
                                        onBlur={this.handleInputBlur}
                                        onKeyDown={this.handleKeyPress}
                                        disabled={loading}
                                        autocomplete="off"
                                    />
                                    
                                    {showSuggestions && (filteredSuggestions.length > 0 || history.length > 0) && (
                                        <div class="suggestions-dropdown">
                                            {filteredSuggestions.length > 0 && (
                                                <div class="suggestions-section">
                                                    <div class="suggestions-header">Suggestions</div>
                                                    {filteredSuggestions.map((suggestion, index) => (
                                                        <div 
                                                            key={index}
                                                            class="suggestion-item"
                                                            onClick={() => this.useSuggestion(suggestion)}
                                                        >
                                                            💡 {suggestion}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {history.length > 0 && (
                                                <div class="suggestions-section">
                                                    <div class="suggestions-header">Recent</div>
                                                    {history.slice(0, 3).map((item, index) => (
                                                        <div 
                                                            key={index}
                                                            class="suggestion-item history-item"
                                                            onClick={() => this.useSuggestion(item)}
                                                        >
                                                            🕒 {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <button
                                    type="submit"
                                    class={`submit-btn ${loading ? 'loading' : ''}`}
                                    disabled={loading || !input.trim()}
                                    title="Generate command"
                                >
                                    {loading ? '⟳' : '→'}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div class="ai-result error">
                                <div class="result-header">
                                    <span class="result-icon">❌</span>
                                    <span class="result-label">Error</span>
                                </div>
                                <div class="error-message">{error}</div>
                            </div>
                        )}

                        {result && (
                            <div class="ai-result success">
                                <div class="result-header">
                                    <span class="result-icon">✨</span>
                                    <span class="result-label">Generated command:</span>
                                    <div class="result-actions">
                                        <button 
                                            class="copy-btn" 
                                            onClick={this.copyCommand} 
                                            title="Copy to clipboard"
                                        >
                                            📋
                                        </button>
                                        <button 
                                            class="use-btn" 
                                            onClick={this.useCommand} 
                                            title="Use this command"
                                        >
                                            Use
                                        </button>
                                    </div>
                                </div>
                                <code class="command-code">{result}</code>
                            </div>
                        )}

                        <div class="ai-bar-footer">
                            <div class="tips">
                                <span class="tip">💡 Tip: Use ↑/↓ arrows for history, Tab for suggestions</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
