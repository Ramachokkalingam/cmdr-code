import { bind } from 'decko';
import { Component, h } from 'preact';
import { Xterm, XtermOptions } from './xterm';

import '@xterm/xterm/css/xterm.css';

interface Props extends XtermOptions {
    id: string;
    sessionId?: string;
}

interface State {
    modal: boolean;
}

export class Terminal extends Component<Props, State> {
    private container: HTMLElement;
    private xterm: Xterm;

    constructor(props: Props) {
        super(props);
        this.state = { modal: false };
        this.xterm = new Xterm(props, this.showModal);
        
        // Set initial session ID if provided
        if (props.sessionId) {
            this.xterm.setCurrentSessionId(props.sessionId);
        }
    }

    async componentDidMount() {
        await this.xterm.refreshToken();
        this.xterm.open(this.container);
        this.xterm.connect();

        // Set global reference for AI commands
        (window as unknown as { [key: string]: unknown }).cmdrTerminal = this.xterm;
    }

    componentDidUpdate(prevProps: Props) {
        // Handle session change
        if (prevProps.sessionId !== this.props.sessionId && this.props.sessionId) {
            console.log(`[Terminal] Session changed from ${prevProps.sessionId} to ${this.props.sessionId}`);
            this.xterm.switchToSession(this.props.sessionId);
        }
    }

    componentWillUnmount() {
        this.xterm.dispose();
        (window as unknown as { [key: string]: unknown }).cmdrTerminal = null;
    }

    render({ id }: Props, { modal }: State) {
        return (
            <div id={id} ref={c => (this.container = c as HTMLElement)}>
                {modal && (
                    <div className="modal">
                        <div className="modal-background" />
                        <div className="modal-content">
                            <div className="box">
                                <label className="file-label">
                                    <input onChange={this.sendFile} className="file-input" type="file" multiple />
                                    <span className="file-cta">Choose files…</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    @bind
    showModal() {
        this.setState({ modal: true });
    }

    @bind
    sendFile(event: Event) {
        this.setState({ modal: false });
        const files = (event.target as HTMLInputElement).files;
        if (files) this.xterm.sendFile(files);
    }
}
