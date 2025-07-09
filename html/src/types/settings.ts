export interface FontSettings {
    family: string;
    size: number;
    weight: 'normal' | 'bold';
    lineHeight: number;
}

export interface ColorTheme {
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
        terminalSelection: string;
        terminalBrightBlack: string;
        terminalBrightRed: string;
        terminalBrightGreen: string;
        terminalBrightYellow: string;
        terminalBrightBlue: string;
        terminalBrightMagenta: string;
        terminalBrightCyan: string;
        terminalBrightWhite: string;
    };
    opacity?: number;
}

export interface TerminalBehaviorSettings {
    scrollbackSize: number;
    bellSound: boolean;
    copyOnSelection: boolean;
    pasteOnRightClick: boolean;
    wordWrap: boolean;
    tabCompletion: boolean;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    defaultShell?: string;
}

export interface UISettings {
    showSessionSidebar: boolean;
    aiBarAutoOpen: boolean;
    aiBarPosition: 'top' | 'bottom' | 'side';
    terminalPadding: number;
    terminalMargins: number;
    fullScreenMode: boolean;
}

export interface KeyboardShortcut {
    id: string;
    name: string;
    description: string;
    key: string;
    modifiers: {
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        meta?: boolean;
    };
    enabled: boolean;
}

export interface ConnectionSettings {
    autoReconnect: boolean;
    reconnectInterval: number;
    connectionTimeout: number;
    websocketPingInterval: number;
}

export interface PerformanceSettings {
    renderingOptimization: 'performance' | 'quality' | 'balanced';
    bufferSize: number;
    frameRateLimit: number;
    enableWebGL: boolean;
    enableCanvas: boolean;
}

export interface SecuritySettings {
    rememberCredentials: boolean;
    sessionTimeout: number;
    twoFactorEnabled: boolean;
    clearHistoryOnExit: boolean;
    disableCommandLogging: boolean;
    incognitoMode: boolean;
}

export interface AISettings {
    defaultModel: string;
    responseLength: 'short' | 'medium' | 'long';
    autoSuggest: boolean;
    contextAwareness: number;
    showSuggestions: boolean;
    responseFormatting: 'plain' | 'markdown' | 'rich';
}

export interface SessionSettings {
    saveSessionState: boolean;
    autoRestoreSessions: boolean;
    sessionHistoryLimit: number;
    autoExportLogs: boolean;
}

export interface DeveloperSettings {
    debugMode: boolean;
    consoleLoggingLevel: 'error' | 'warn' | 'info' | 'debug';
    performanceMonitoring: boolean;
    websocketInspection: boolean;
}

export interface AccessibilitySettings {
    highContrast: boolean;
    screenReaderSupport: boolean;
    keyboardOnlyNavigation: boolean;
    textScaling: number;
    announceCommands: boolean;
}

export interface AboutSettings {
    version: string;
    buildDate: string;
    commitHash: string;
    updateChannel: 'stable' | 'beta' | 'dev';
    autoUpdate: boolean;
    checkForUpdatesOnStartup: boolean;
    lastUpdateCheck: string;
    releaseNotes: string;
}

export interface CmdrSettings {
    version: string;
    font: FontSettings;
    theme: ColorTheme;
    terminalBehavior: TerminalBehaviorSettings;
    ui: UISettings;
    keyboardShortcuts: KeyboardShortcut[];
    connection: ConnectionSettings;
    performance: PerformanceSettings;
    security: SecuritySettings;
    ai: AISettings;
    session: SessionSettings;
    developer: DeveloperSettings;
    accessibility: AccessibilitySettings;
    about: AboutSettings;
}

export const defaultSettings: CmdrSettings = {
    version: '1.0.0',
    font: {
        family: 'JetBrains Mono',
        size: 13,
        weight: 'normal',
        lineHeight: 1.2,
    },
    theme: {
        name: 'cmdr-dark',
        displayName: 'CMDR Dark',
        colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#06b6d4',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            border: '#475569',
            error: '#ef4444',
            success: '#22c55e',
            terminalBackground: '#1e293b',
            terminalForeground: '#f8fafc',
            terminalCursor: '#06b6d4',
            terminalSelection: '#374151',
            terminalBrightBlack: '#475569',
            terminalBrightRed: '#f87171',
            terminalBrightGreen: '#4ade80',
            terminalBrightYellow: '#fbbf24',
            terminalBrightBlue: '#60a5fa',
            terminalBrightMagenta: '#a78bfa',
            terminalBrightCyan: '#22d3ee',
            terminalBrightWhite: '#ffffff',
        },
        opacity: 0.95,
    },
    terminalBehavior: {
        scrollbackSize: 1000,
        bellSound: true,
        copyOnSelection: true,
        pasteOnRightClick: true,
        wordWrap: false,
        tabCompletion: true,
        cursorStyle: 'block',
        defaultShell: 'bash',
        cursorBlink: true,
    },
    ui: {
        showSessionSidebar: true,
        aiBarAutoOpen: false,
        aiBarPosition: 'top',
        terminalPadding: 8,
        terminalMargins: 0,
        fullScreenMode: false,
    },
    keyboardShortcuts: [
        {
            id: 'toggle-ai-bar',
            name: 'Toggle AI Bar',
            description: 'Show/hide the AI command assistant',
            key: 'I',
            modifiers: { ctrl: true },
            enabled: true,
        },
        {
            id: 'toggle-sidebar',
            name: 'Toggle Sidebar',
            description: 'Show/hide the session sidebar',
            key: 'B',
            modifiers: { ctrl: true },
            enabled: true,
        },
        {
            id: 'new-session',
            name: 'New Session',
            description: 'Create a new terminal session',
            key: 'T',
            modifiers: { ctrl: true },
            enabled: true,
        },
        {
            id: 'copy',
            name: 'Copy',
            description: 'Copy selected text',
            key: 'C',
            modifiers: { ctrl: true },
            enabled: true,
        },
        {
            id: 'paste',
            name: 'Paste',
            description: 'Paste text from clipboard',
            key: 'V',
            modifiers: { ctrl: true },
            enabled: true,
        },
    ],
    connection: {
        autoReconnect: true,
        reconnectInterval: 3000,
        connectionTimeout: 10000,
        websocketPingInterval: 30000,
    },
    performance: {
        renderingOptimization: 'balanced',
        bufferSize: 4096,
        frameRateLimit: 60,
        enableWebGL: true,
        enableCanvas: true,
    },
    security: {
        rememberCredentials: false,
        sessionTimeout: 3600,
        twoFactorEnabled: false,
        clearHistoryOnExit: false,
        disableCommandLogging: false,
        incognitoMode: false,
    },
    ai: {
        defaultModel: 'gpt-3.5-turbo',
        responseLength: 'medium',
        autoSuggest: true,
        contextAwareness: 3,
        showSuggestions: true,
        responseFormatting: 'markdown',
    },
    session: {
        saveSessionState: true,
        autoRestoreSessions: true,
        sessionHistoryLimit: 50,
        autoExportLogs: false,
    },
    developer: {
        debugMode: false,
        consoleLoggingLevel: 'warn',
        performanceMonitoring: false,
        websocketInspection: false,
    },
    accessibility: {
        highContrast: false,
        screenReaderSupport: false,
        keyboardOnlyNavigation: false,
        textScaling: 1.0,
        announceCommands: false,
    },
    about: {
        version: '1.0.0',
        buildDate: '2025-01-01',
        commitHash: 'dev-build',
        updateChannel: 'stable',
        autoUpdate: true,
        checkForUpdatesOnStartup: true,
        lastUpdateCheck: '',
        releaseNotes: '',
    },
};

export const predefinedThemes: ColorTheme[] = [
    // Dark themes
    {
        name: 'cmdr-dark',
        displayName: 'CMDR Dark',
        colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            accent: '#06b6d4',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            border: '#475569',
            error: '#ef4444',
            success: '#22c55e',
            terminalBackground: '#1e293b',
            terminalForeground: '#f8fafc',
            terminalCursor: '#06b6d4',
            terminalSelection: '#374151',
            terminalBrightBlack: '#475569',
            terminalBrightRed: '#f87171',
            terminalBrightGreen: '#4ade80',
            terminalBrightYellow: '#fbbf24',
            terminalBrightBlue: '#60a5fa',
            terminalBrightMagenta: '#a78bfa',
            terminalBrightCyan: '#22d3ee',
            terminalBrightWhite: '#ffffff',
        },
        opacity: 0.95,
    },
    {
        name: 'solarized-dark',
        displayName: 'Solarized Dark',
        colors: {
            primary: '#268bd2',
            secondary: '#2aa198',
            accent: '#859900',
            background: '#002b36',
            surface: '#073642',
            text: '#839496',
            textSecondary: '#657b83',
            border: '#586e75',
            error: '#dc322f',
            success: '#859900',
            terminalBackground: '#002b36',
            terminalForeground: '#839496',
            terminalCursor: '#93a1a1',
            terminalSelection: '#073642',
            terminalBrightBlack: '#002b36',
            terminalBrightRed: '#cb4b16',
            terminalBrightGreen: '#586e75',
            terminalBrightYellow: '#657b83',
            terminalBrightBlue: '#839496',
            terminalBrightMagenta: '#6c71c4',
            terminalBrightCyan: '#93a1a1',
            terminalBrightWhite: '#fdf6e3',
        },
        opacity: 1.0,
    },
    {
        name: 'monokai',
        displayName: 'Monokai',
        colors: {
            primary: '#f92672',
            secondary: '#66d9ef',
            accent: '#a6e22e',
            background: '#272822',
            surface: '#383830',
            text: '#f8f8f2',
            textSecondary: '#75715e',
            border: '#49483e',
            error: '#f92672',
            success: '#a6e22e',
            terminalBackground: '#272822',
            terminalForeground: '#f8f8f2',
            terminalCursor: '#f8f8f0',
            terminalSelection: '#49483e',
            terminalBrightBlack: '#272822',
            terminalBrightRed: '#f92672',
            terminalBrightGreen: '#a6e22e',
            terminalBrightYellow: '#f4bf75',
            terminalBrightBlue: '#66d9ef',
            terminalBrightMagenta: '#ae81ff',
            terminalBrightCyan: '#a1efe4',
            terminalBrightWhite: '#f8f8f2',
        },
        opacity: 1.0,
    },
    // Light themes
    {
        name: 'cmdr-light',
        displayName: 'CMDR Light',
        colors: {
            primary: '#4338ca',
            secondary: '#7c3aed',
            accent: '#0891b2',
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#1e293b',
            textSecondary: '#475569',
            border: '#e2e8f0',
            error: '#dc2626',
            success: '#16a34a',
            terminalBackground: '#ffffff',
            terminalForeground: '#1e293b',
            terminalCursor: '#0891b2',
            terminalSelection: '#e2e8f0',
            terminalBrightBlack: '#64748b',
            terminalBrightRed: '#dc2626',
            terminalBrightGreen: '#16a34a',
            terminalBrightYellow: '#d97706',
            terminalBrightBlue: '#2563eb',
            terminalBrightMagenta: '#9333ea',
            terminalBrightCyan: '#0891b2',
            terminalBrightWhite: '#1e293b',
        },
        opacity: 1.0,
    },
    {
        name: 'solarized-light',
        displayName: 'Solarized Light',
        colors: {
            primary: '#268bd2',
            secondary: '#2aa198',
            accent: '#859900',
            background: '#fdf6e3',
            surface: '#eee8d5',
            text: '#657b83',
            textSecondary: '#839496',
            border: '#93a1a1',
            error: '#dc322f',
            success: '#859900',
            terminalBackground: '#fdf6e3',
            terminalForeground: '#657b83',
            terminalCursor: '#586e75',
            terminalSelection: '#eee8d5',
            terminalBrightBlack: '#073642',
            terminalBrightRed: '#dc322f',
            terminalBrightGreen: '#859900',
            terminalBrightYellow: '#b58900',
            terminalBrightBlue: '#268bd2',
            terminalBrightMagenta: '#d33682',
            terminalBrightCyan: '#2aa198',
            terminalBrightWhite: '#fdf6e3',
        },
        opacity: 1.0,
    },
];

export const predefinedFonts = [
    'JetBrains Mono',
    'Fira Code',
    'Source Code Pro',
    'Monaco',
    'Consolas',
    'Ubuntu Mono',
    'Cascadia Code',
    'Inconsolata',
    'Roboto Mono',
    'Courier New',
    'SF Mono',
    'Menlo',
];
