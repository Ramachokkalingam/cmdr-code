import { h, Component } from 'preact';

import { Terminal } from './terminal';
import { AIBar } from './ai-bar';
import { Login } from './auth';
import { SessionSidebar } from './session-sidebar';
import { UpdateChecker } from './UpdateChecker';
import { authService } from '../services/firebase';
import { localSessionService } from '../services/local-session';

import type { ITerminalOptions, ITheme } from '@xterm/xterm';
import type { ClientOptions, FlowControl } from './terminal/xterm';
import type { User } from 'firebase/auth';

// Global interface for terminal access
declare global {
    interface Window {
        cmdrTerminal: {
            sendData: (data: string) => void;
        } | null;
    }
}

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const path = window.location.pathname.replace(/[/]+$/, '');
const wsUrl = [protocol, '//', window.location.host, path, '/ws', window.location.search].join('');
const tokenUrl = [window.location.protocol, '//', window.location.host, path, '/token'].join('');
const clientOptions = {
    rendererType: 'webgl',
    disableLeaveAlert: false,
    disableResizeOverlay: false,
    enableZmodem: false,
    enableTrzsz: false,
    enableSixel: false,
    closeOnDisconnect: false,
    isWindows: false,
    unicodeVersion: '11',
} as ClientOptions;
const termOptions = {
    fontSize: 13,
    fontFamily: 'Consolas,Liberation Mono,Menlo,Courier,monospace',
    theme: {
        foreground: '#d2d2d2',
        background: '#2b2b2b',
        cursor: '#adadad',
        black: '#000000',
        red: '#d81e00',
        green: '#5ea702',
        yellow: '#cfae00',
        blue: '#427ab3',
        magenta: '#89658e',
        cyan: '#00a7aa',
        white: '#dbded8',
        brightBlack: '#686a66',
        brightRed: '#f54235',
        brightGreen: '#99e343',
        brightYellow: '#fdeb61',
        brightBlue: '#84b0d8',
        brightMagenta: '#bc94b7',
        brightCyan: '#37e6e8',
        brightWhite: '#f1f1f0',
    } as ITheme,
    allowProposedApi: true,
} as ITerminalOptions;
const flowControl = {
    limit: 100000,
    highWater: 10,
    lowWater: 4,
} as FlowControl;

interface AppState {
    user: User | null;
    loading: boolean;
    activeSessionId: string | null;
    sidebarCollapsed: boolean;
}

export class App extends Component<{}, AppState> {
    constructor() {
        super();
        this.state = {
            user: null,
            loading: true,
            activeSessionId: null,
            sidebarCollapsed: false,
        };
    }

    componentDidMount() {
        // Prevent browser shortcuts from interfering with terminal
        document.addEventListener('keydown', this.handleGlobalKeyDown, true);

        // Listen for authentication state changes
        authService.onAuthStateChange(user => {
            this.setState({
                user,
                loading: false,
            });
        });
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    }

    handleGlobalKeyDown = (event: KeyboardEvent): boolean | void => {
        // Common terminal shortcuts that browsers intercept
        if (event.ctrlKey && event.shiftKey) {
            switch (event.code) {
                case 'KeyC': // Copy
                case 'KeyV': // Paste
                case 'KeyX': // Cut
                case 'KeyA': // Select All
                case 'KeyF': // Find
                case 'KeyI': // Dev Tools
                case 'KeyJ': // Console
                case 'KeyK': // Clear Console
                case 'KeyR': // Hard Refresh
                case 'KeyT': // Reopen Tab
                case 'KeyN': // New Incognito
                case 'KeyW': {
                    // Close Window
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    // Focus the terminal if it exists
                    const xtermElement = document.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
                    if (xtermElement) {
                        xtermElement.focus();
                        // Create a new keyboard event for the terminal
                        const terminalEvent = new KeyboardEvent('keydown', {
                            key: event.key,
                            code: event.code,
                            ctrlKey: event.ctrlKey,
                            shiftKey: event.shiftKey,
                            altKey: event.altKey,
                            metaKey: event.metaKey,
                            bubbles: true,
                            cancelable: true,
                        });
                        xtermElement.dispatchEvent(terminalEvent);
                    }
                    return false;
                }
            }
        }

        // Also handle F12 (Dev Tools)
        if (event.key === 'F12') {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    };

    handleCommandGenerated = (command: string) => {
        if (window.cmdrTerminal) {
            window.cmdrTerminal.sendData(command + '\r');
        }
    };

    handleAuthSuccess = () => {
        // Auth state will be handled by the listener
        console.log('Authentication successful');
    };

    handleSignOut = () => {
        this.setState({ user: null, activeSessionId: null });
    };

    handleSessionChange = (sessionId: string) => {
        console.log(`[App] Switching to session: ${sessionId}`);
        this.setState({ activeSessionId: sessionId });
        
        // Update local session service current session
        localSessionService.setCurrentSession(sessionId);
        
        // Mark the session as active in the backend
        localSessionService.setActiveTab(sessionId).catch(err => {
            console.warn('Failed to set active tab:', err);
        });
    };

    handleSidebarToggle = () => {
        this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed });
    };

    render() {
        const { user, loading, activeSessionId, sidebarCollapsed } = this.state;

        if (loading) {
            return (
                <div class="app-loading">
                    <div class="loading-spinner">Loading...</div>
                </div>
            );
        }

        if (!user) {
            return <Login onAuthSuccess={this.handleAuthSuccess} />;
        }

        return (
            <div class={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <UpdateChecker 
                    disabled={process.env.NODE_ENV === 'development'}
                    checkInterval={3600000} // 1 hour
                />
                <SessionSidebar
                    user={user}
                    activeSessionId={activeSessionId}
                    collapsed={sidebarCollapsed}
                    onSessionChange={this.handleSessionChange}
                    onSignOut={this.handleSignOut}
                    onToggleSidebar={this.handleSidebarToggle}
                />
                <div class="main-content">
                    <AIBar onCommandGenerated={this.handleCommandGenerated} />
                    <Terminal
                        id="terminal-container"
                        wsUrl={wsUrl}
                        tokenUrl={tokenUrl}
                        clientOptions={clientOptions}
                        termOptions={termOptions}
                        flowControl={flowControl}
                        sessionId={activeSessionId || undefined}
                    />
                </div>
            </div>
        );
    }
}
