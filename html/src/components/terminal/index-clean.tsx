import { bind } from 'decko';
import { Component, h } from 'preact';
import { Xterm, XtermOptions } from './xterm';

import '@xterm/xterm/css/xterm.css';

interface Props extends XtermOptions {
    id: string;
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
    }

    async componentDidMount() {
        await this.xterm.refreshToken();
        this.xterm.open(this.container);
        this.xterm.connect();

        // Set global reference for AI commands
        (window as Window & { cmdrTerminal?: unknown }).cmdrTerminal = this.xterm;
    }

    componentWillUnmount() {
        this.xterm.dispose();
        (window as Window & { cmdrTerminal?: unknown }).cmdrTerminal = null;
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
