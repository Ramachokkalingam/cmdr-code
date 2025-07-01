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
}

export class AIBar extends Component<Props, State> {
    constructor() {
        super();
        this.state = {
            input: '',
            loading: false,
            result: '',
            error: '',
        };
    }

    @bind
    handleInputChange(event: Event) {
        const input = (event.target as HTMLInputElement).value;
        this.setState({ input });
    }

    @bind
    async handleSubmit(event: Event) {
        event.preventDefault();

        const { input } = this.state;
        if (!input.trim()) return;

        this.setState({ loading: true, error: '', result: '' });

        try {
            const response = await cloudService.askAI(input);
            this.setState({ result: response.result });
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
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.handleSubmit(event);
        }
    }

    @bind
    clearInput() {
        this.setState({ input: '', result: '', error: '' });
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
        const { input, loading, result, error } = this.state;

        return (
            <div class="ai-bar">
                <div class="ai-bar-header">
                    <div class="ai-bar-title">
                        <span class="ai-icon">🤖</span>
                        AI Command Assistant
                    </div>
                    <button class="clear-btn" onClick={this.clearInput} title="Clear">
                        ✕
                    </button>
                </div>

                <form class="ai-bar-form" onSubmit={this.handleSubmit}>
                    <div class="input-container">
                        <input
                            type="text"
                            class="ai-input"
                            placeholder="Describe what you want to do... (e.g., 'list all files', 'find large files')"
                            value={input}
                            onInput={this.handleInputChange}
                            onKeyPress={this.handleKeyPress}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            class={`submit-btn ${loading ? 'loading' : ''}`}
                            disabled={loading || !input.trim()}
                        >
                            {loading ? '⟳' : '→'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div class="ai-result error">
                        <span class="result-icon">❌</span>
                        {error}
                    </div>
                )}

                {result && (
                    <div class="ai-result success">
                        <div class="result-header">
                            <span class="result-icon">✨</span>
                            <span class="result-label">Generated command:</span>
                            <button class="use-btn" onClick={this.useCommand} title="Use this command">
                                Use
                            </button>
                        </div>
                        <code class="command-code">{result}</code>
                    </div>
                )}
            </div>
        );
    }
}
