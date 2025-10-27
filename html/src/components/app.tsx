import { h, Component } from 'preact';

import { Terminal } from './terminal';
import { AIBar } from './ai-bar';
import { Login } from './auth';
import { SessionSidebar } from './session-sidebar';
import { UpdateChecker } from './UpdateChecker';
import { Settings } from './Settings';
import { Theme } from './Settings';
import { themes } from './settings/themes';
import { authService } from '../services/firebase';
import { localSessionService } from '../services/local-session';
import settingsService from '../services/settings';

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

// Shell paths - map shell names to their typical full paths
const shellPaths = {
    'bash': '/usr/bin/bash',
    'sh': '/usr/bin/sh',
    'zsh': '/usr/bin/zsh',
    'fish': '/usr/bin/fish'
};

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const path = window.location.pathname.replace(/[/]+$/, '');
const wsUrl = [protocol, '//', window.location.host, path, '/ws', window.location.search].join('');
const tokenUrl = [window.location.protocol, '//', window.location.host, path, '/token'].join('');
// Get default shell from settings
const defaultSettings = settingsService.getSettings();
const defaultShellName = defaultSettings.terminalBehavior.defaultShell || 'bash';
// Use the full path for the shell
const defaultShell = shellPaths[defaultShellName] || defaultShellName;

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
    defaultShell: defaultShell,
} as ClientOptions;
const termOptions = {
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Consolas, Liberation Mono, Menlo, Courier, monospace',
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 5000,
    theme: {
        foreground: '#f8fafc',
        background: '#1e293b',
        cursor: '#06b6d4',
        black: '#0f172a',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
    } as ITheme,
    allowProposedApi: true,
} as ITerminalOptions;

// Make termOptions globally accessible
(window as any).termOptions = termOptions;
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
    currentTheme: string;
    settingsVisible: boolean;
    aiBarVisible: boolean;
    webSocket: WebSocket | null;
}

export class App extends Component<{}, AppState> {
    constructor() {
        super();
        this.state = {
            user: null,
            loading: true,
            activeSessionId: null,
            sidebarCollapsed: false,
            currentTheme: localStorage.getItem('cmdr-theme') || 'cmdr-dark',
            settingsVisible: false,
            aiBarVisible: false,
            webSocket: null,
        };
    }

    componentDidMount() {
        // Initialize settings service
        settingsService.initialize();
        
        // Prevent browser shortcuts from interfering with terminal
        document.addEventListener('keydown', this.handleGlobalKeyDown, true);

        // Listen for authentication state changes
        authService.onAuthStateChange(user => {
            this.setState({
                user,
                loading: false,
            });
            
            // Initialize settings service when user state changes
            this.initializeSettings();
        });

        // Apply initial theme and initialize settings
        this.applyTheme(this.state.currentTheme);
        this.initializeSettings();
    }

    initializeSettings = async () => {
        try {
            // Initialize the settings service
            await settingsService.initialize();
            
            // Load current settings
            const settings = settingsService.getSettings();
            
            // Apply settings to the UI
            if (settings.font.size !== 13) {
                this.handleFontSizeChange(settings.font.size);
            }
            
            if (settings.font.family !== 'JetBrains Mono') {
                this.handleFontFamilyChange(settings.font.family);
            }
            
            // Set default shell from settings
            if (settings.terminalBehavior.defaultShell) {
                clientOptions.defaultShell = settings.terminalBehavior.defaultShell;
            }
            
            // Listen for settings changes
            settingsService.addListener((newSettings) => {
                this.handleSettingsUpdate(newSettings);
            });
            
        } catch (error) {
            console.warn('Failed to initialize settings:', error);
        }
    };

    handleSettingsUpdate = (settings: any) => {
        // Update terminal options based on settings
        if (settings.font) {
            // Apply font changes to terminal
            const root = document.documentElement;
            root.style.setProperty('--terminal-font-size', `${settings.font.size}px`);
            const fontStack = `${settings.font.family}, 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace`;
            root.style.setProperty('--terminal-font-family', fontStack);
            
            // Update terminal options for new instances
            termOptions.fontSize = settings.font.size;
            termOptions.fontFamily = fontStack;
            
            // Update existing terminal instance if it exists
            if ((window as any).term) {
                const term = (window as any).term;
                if (term.setOption) {
                    term.setOption('fontSize', settings.font.size);
                    term.setOption('fontFamily', fontStack);
                } else {
                    term.options.fontSize = settings.font.size;
                    term.options.fontFamily = fontStack;
                }
                // Trigger a refresh to apply the changes
                if (typeof term.refresh === 'function') {
                    term.refresh();
                }
            }
        }
        
        // Apply terminal behavior settings (cursor, scrollback, etc.)
        if (settings.terminalBehavior) {
            // Update global termOptions for new terminal instances
            if (settings.terminalBehavior.cursorStyle !== undefined) {
                termOptions.cursorStyle = settings.terminalBehavior.cursorStyle;
            }
            if (settings.terminalBehavior.cursorBlink !== undefined) {
                termOptions.cursorBlink = settings.terminalBehavior.cursorBlink;
            }
            if (settings.terminalBehavior.scrollbackSize !== undefined) {
                termOptions.scrollback = settings.terminalBehavior.scrollbackSize;
            }
            if (settings.terminalBehavior.defaultShell !== undefined) {
                // Get the full shell path
                const shellPath = shellPaths[settings.terminalBehavior.defaultShell] || settings.terminalBehavior.defaultShell;
                
                // Update default shell in client options with full path
                clientOptions.defaultShell = shellPath;
                
                // Apply to current session if active
                this.handleShellChange(settings.terminalBehavior.defaultShell);
            }
            // Note: bellSound is not part of ITerminalOptions in newer xterm versions
            
            // Apply to existing terminal instance
            if ((window as any).term) {
                const term = (window as any).term;
                try {
                    if (term.setOption) {
                        if (settings.terminalBehavior.cursorStyle !== undefined) {
                            term.setOption('cursorStyle', settings.terminalBehavior.cursorStyle);
                        }
                        if (settings.terminalBehavior.cursorBlink !== undefined) {
                            term.setOption('cursorBlink', settings.terminalBehavior.cursorBlink);
                        }
                        if (settings.terminalBehavior.scrollbackSize !== undefined) {
                            term.setOption('scrollback', settings.terminalBehavior.scrollbackSize);
                        }
                    }
                    
                    // Also update options directly for compatibility
                    if (term.options) {
                        if (settings.terminalBehavior.cursorStyle !== undefined) {
                            term.options.cursorStyle = settings.terminalBehavior.cursorStyle;
                        }
                        if (settings.terminalBehavior.cursorBlink !== undefined) {
                            term.options.cursorBlink = settings.terminalBehavior.cursorBlink;
                        }
                        if (settings.terminalBehavior.scrollbackSize !== undefined) {
                            term.options.scrollback = settings.terminalBehavior.scrollbackSize;
                        }
                    }
                    
                    // Force refresh for visual changes
                    if (term.refresh) {
                        term.refresh();
                    }
                } catch (error) {
                    console.warn('Failed to apply terminal behavior settings:', error);
                }
            }
        }
        
        // Apply theme changes
        if (settings.theme) {
            // Convert settings theme to our theme format if needed
            this.applyTheme(this.state.currentTheme);
        }
    };

    loadSettings = () => {
        // Load settings from the new settings service
        const settings = settingsService.getSettings();
        
        if (settings.font.size) {
            this.handleFontSizeChange(settings.font.size);
        }
        
        if (settings.font.family) {
            this.handleFontFamilyChange(settings.font.family);
        }
        
        // Apply other settings as needed
        if (settings.ui) {
            // Handle UI settings
            if (settings.ui.aiBarAutoOpen !== undefined) {
                this.setState({ aiBarVisible: settings.ui.aiBarAutoOpen });
            }
        }
    };

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleGlobalKeyDown, true);
    }

    handleGlobalKeyDown = (event: KeyboardEvent): boolean | void => {
        // Handle Ctrl+I to toggle AI bar
        if (event.ctrlKey && !event.shiftKey && event.code === 'KeyI') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            this.toggleAIBar();
            return false;
        }

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

    handleSettingsOpen = () => {
        this.setState({ settingsVisible: true });
    };

    handleSettingsClose = () => {
        this.setState({ settingsVisible: false });
    };

    handleFontSizeChange = (fontSize: number) => {
        const root = document.documentElement;
        root.style.setProperty('--terminal-font-size', `${fontSize}px`);
        
        // Update terminal options for new instances
        termOptions.fontSize = fontSize;
        
        // Update existing terminal instance if it exists
        if ((window as any).term) {
            (window as any).term.options.fontSize = fontSize;
            // Trigger a refresh to apply the changes
            if (typeof (window as any).term.refresh === 'function') {
                (window as any).term.refresh();
            }
        }
        
        // Update settings service (prevent circular updates)
        const currentSettings = settingsService.getSettings();
        if (currentSettings.font.size !== fontSize) {
            settingsService.updateFontSettings({ size: fontSize });
        }
    };

    handleFontFamilyChange = (fontFamily: string) => {
        const root = document.documentElement;
        const fontStack = `${fontFamily}, 'Consolas', 'Liberation Mono', 'Menlo', 'Courier', monospace`;
        root.style.setProperty('--terminal-font-family', fontStack);
        
        // Update terminal options for new instances
        termOptions.fontFamily = fontStack;
        
        // Update existing terminal instance if it exists
        if ((window as any).term) {
            (window as any).term.options.fontFamily = fontStack;
            // Trigger a refresh to apply the changes
            if (typeof (window as any).term.refresh === 'function') {
                (window as any).term.refresh();
            }
        }
        
        // Update settings service (prevent circular updates)
        const currentSettings = settingsService.getSettings();
        if (currentSettings.font.family !== fontFamily) {
            settingsService.updateFontSettings({ family: fontFamily });
        }
    };

    handlePreferenceChange = (key: string, value: boolean) => {
        // Handle preference changes like animations, sounds, etc.
        const root = document.documentElement;
        
        switch (key) {
            case 'enableAnimations':
                root.style.setProperty('--animations-enabled', value ? '1' : '0');
                break;
            case 'enableSounds':
                // Could implement sound management here
                break;
            case 'autoSave':
                // Could implement auto-save management here
                break;
        }
    };

    handleThemeChange = (theme: Theme) => {
        this.setState({ currentTheme: theme.name });
        this.applyTheme(theme.name);
        localStorage.setItem('cmdr-theme', theme.name);
    };

    applyTheme = (themeId: string) => {
        const theme = themes.find(t => t.name === themeId);
        if (!theme) return;

        const root = document.documentElement;
        
        // Apply theme colors with proper CSS variable names
        root.style.setProperty('--color-primary', theme.colors.primary);
        root.style.setProperty('--color-secondary', theme.colors.secondary);
        root.style.setProperty('--color-accent', theme.colors.accent);
        root.style.setProperty('--color-background', theme.colors.background);
        root.style.setProperty('--color-surface', theme.colors.surface);
        root.style.setProperty('--color-text', theme.colors.text);
        root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--color-border', theme.colors.border);
        root.style.setProperty('--color-error', theme.colors.error);
        root.style.setProperty('--color-success', theme.colors.success);
        
        // Apply terminal colors using the direct properties
        root.style.setProperty('--terminal-background', theme.colors.terminalBackground);
        root.style.setProperty('--terminal-foreground', theme.colors.terminalForeground);
        root.style.setProperty('--terminal-cursor', theme.colors.terminalCursor);

        // Update terminal theme options for new terminal instances
        termOptions.theme = {
            foreground: theme.colors.terminalForeground,
            background: theme.colors.terminalBackground,
            cursor: theme.colors.terminalCursor,
            black: '#0f172a',
            red: theme.colors.error,
            green: theme.colors.success,
            yellow: '#f59e0b',
            blue: theme.colors.primary,
            magenta: theme.colors.secondary,
            cyan: theme.colors.accent,
            white: theme.colors.text,
            brightBlack: '#475569',
            brightRed: '#f87171',
            brightGreen: '#34d399',
            brightYellow: '#fbbf24',
            brightBlue: '#818cf8',
            brightMagenta: '#a78bfa',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff',
        } as ITheme;
    };

    toggleAIBar = () => {
        this.setState({ aiBarVisible: !this.state.aiBarVisible });
    };

    handleShellChange = async (shellName: string) => {
        console.log(`[App] Changing shell to: ${shellName}`);
        
        // Get the full shell path
        const shellPath = shellPaths[shellName] || shellName;
        
        // Update client options for future sessions
        clientOptions.defaultShell = shellPath;
        
        // Save the change to settings first
        const currentSettings = settingsService.getSettings();
        if (currentSettings.terminalBehavior.defaultShell !== shellName) {
            settingsService.updateTerminalBehavior({ defaultShell: shellName });
        }
        
        // Show notification in current terminal
        const term = (window as any).term;
        if (term && term.write) {
            const message = `\r\n\x1b[33mShell changed to: ${shellName} (${shellPath})\x1b[0m\r\n`;
            term.write(message);
            term.write(`\x1b[36mCreating new session with ${shellName}...\x1b[0m\r\n`);
        }
        
        // Force a new session creation by refreshing the terminal component
        try {
            // Try to create a new session with the new shell via API
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shell: shellPath,
                    name: `${shellName} Session`
                })
            });
            
            if (response.ok) {
                const sessionData = await response.json();
                console.log(`[App] Created new session with ${shellName}:`, sessionData);
                
                // Switch to the new session
                if (sessionData.sessionId) {
                    this.handleSessionChange(sessionData.sessionId);
                }
            } else {
                console.warn(`[App] Failed to create new session with ${shellName}`);
                // Fallback: execute shell in current session
                if (window.cmdrTerminal) {
                    window.cmdrTerminal.sendData(`exec ${shellPath}\r`);
                    if (term && term.write) {
                        term.write(`\x1b[36mFallback: executing ${shellName} in current session\x1b[0m\r\n`);
                    }
                }
            }
        } catch (error) {
            console.error(`[App] Error creating session with ${shellName}:`, error);
            // Fallback: execute shell in current session
            if (window.cmdrTerminal) {
                window.cmdrTerminal.sendData(`exec ${shellPath}\r`);
                if (term && term.write) {
                    term.write(`\x1b[36mFallback: executing ${shellName} in current session\x1b[0m\r\n`);
                }
            }
        }
    }

    // Helper method to launch a session with the selected shell
    createSessionWithShell = (shellName: string) => {
        const shellPath = shellPaths[shellName] || shellName;
        
        // Use the existing terminal if available
        if (window.cmdrTerminal) {
            // Get the full path for the shell
            const shellCommand = shellPath;
            
            // Execute the shell command with the full path
            window.cmdrTerminal.sendData(`${shellCommand}\r`);
            
            // Show a message
            const term = (window as any).term;
            if (term && term.write) {
                term.write(`\r\n\x1b[32mSwitching to ${shellName} shell...\x1b[0m\r\n`);
            }
        } else {
            console.warn('No terminal instance available to switch shells');
        }
    }

    handleWebSocketConnect = (webSocket: WebSocket) => {
        this.setState({ webSocket });
        console.log('[App] WebSocket connected for update service');
    };

    handleWebSocketDisconnect = () => {
        this.setState({ webSocket: null });
        console.log('[App] WebSocket disconnected from update service');
    };

    render() {
        const { user, loading, activeSessionId, sidebarCollapsed, currentTheme, settingsVisible, aiBarVisible } = this.state;

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
                    webSocket={this.state.webSocket}
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
                    onOpenSettings={this.handleSettingsOpen}
                />
                <div class="main-content">
                    {aiBarVisible && <AIBar onCommandGenerated={this.handleCommandGenerated} />}
                    <Terminal
                        id="terminal-container"
                        wsUrl={wsUrl}
                        tokenUrl={tokenUrl}
                        clientOptions={clientOptions}
                        termOptions={termOptions}
                        flowControl={flowControl}
                        sessionId={activeSessionId || undefined}
                        onWebSocketConnect={this.handleWebSocketConnect}
                        onWebSocketDisconnect={this.handleWebSocketDisconnect}
                    />
                </div>
                <Settings
                    isVisible={settingsVisible}
                    onClose={this.handleSettingsClose}
                    currentTheme={currentTheme}
                    onThemeChange={this.handleThemeChange}
                    onFontSizeChange={this.handleFontSizeChange}
                    onFontFamilyChange={this.handleFontFamilyChange}
                    onPreferenceChange={this.handlePreferenceChange}
                    websocket={this.state.webSocket || undefined}
                />
            </div>
        );
    }
}
