import { CmdrSettings, defaultSettings, ColorTheme, KeyboardShortcut } from '../types/settings';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

class SettingsService {
    private static instance: SettingsService;
    private settings: CmdrSettings;
    private listeners: ((settings: CmdrSettings) => void)[] = [];
    private baseUrl: string;
    private isOnline: boolean = navigator.onLine;

    private constructor() {
        this.baseUrl = process.env.NODE_ENV === 'production' 
            ? '/api/settings' 
            : 'http://localhost:8000/api/settings';
        
        this.settings = this.loadLocalSettings();
        this.setupNetworkListeners();
    }

    static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    private setupNetworkListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithBackend();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    private async getAuthToken(): Promise<string | null> {
        return localStorage.getItem('auth-token');
    }

    private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        try {
            const token = await this.getAuthToken();
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            console.error('Settings API call failed:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    async loadFromBackend(): Promise<boolean> {
        if (!this.isOnline) {
            console.log('Offline: using local settings');
            return false;
        }

        const response = await this.apiCall<CmdrSettings>('/');
        
        if (response.data) {
            this.settings = this.mergeWithDefaults(response.data);
            this.saveLocalSettings();
            this.notifyListeners();
            return true;
        } else {
            console.warn('Failed to load settings from backend:', response.error);
            return false;
        }
    }

    async saveToBackend(): Promise<boolean> {
        if (!this.isOnline) {
            console.log('Offline: settings will sync when online');
            return false;
        }

        const response = await this.apiCall<any>('/', {
            method: 'PUT',
            body: JSON.stringify({ settings_data: this.settings }),
        });

        if (response.error) {
            console.error('Failed to save settings to backend:', response.error);
            return false;
        }

        return true;
    }

    async syncWithBackend(): Promise<void> {
        if (!this.isOnline) return;

        try {
            const loaded = await this.loadFromBackend();
            if (!loaded) {
                await this.saveToBackend();
            }
        } catch (error) {
            console.error('Settings sync failed:', error);
        }
    }

    private loadLocalSettings(): CmdrSettings {
        try {
            const stored = localStorage.getItem('cmdr-settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                return this.mergeWithDefaults(parsed);
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
        return { ...defaultSettings };
    }

    private mergeWithDefaults(stored: Partial<CmdrSettings>): CmdrSettings {
        return {
            ...defaultSettings,
            ...stored,
            font: { ...defaultSettings.font, ...stored.font },
            theme: { ...defaultSettings.theme, ...stored.theme },
            terminalBehavior: { ...defaultSettings.terminalBehavior, ...stored.terminalBehavior },
            ui: { ...defaultSettings.ui, ...stored.ui },
            keyboardShortcuts: stored.keyboardShortcuts || defaultSettings.keyboardShortcuts,
            connection: { ...defaultSettings.connection, ...stored.connection },
            performance: { ...defaultSettings.performance, ...stored.performance },
            security: { ...defaultSettings.security, ...stored.security },
            ai: { ...defaultSettings.ai, ...stored.ai },
            session: { ...defaultSettings.session, ...stored.session },
            developer: { ...defaultSettings.developer, ...stored.developer },
            accessibility: { ...defaultSettings.accessibility, ...stored.accessibility },
        };
    }

    private saveLocalSettings(): void {
        try {
            localStorage.setItem('cmdr-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }

    private saveSettings(): void {
        this.saveLocalSettings();
        
        if (this.isOnline) {
            this.saveToBackend().catch(error => {
                console.warn('Failed to sync settings to backend:', error);
            });
        }
        
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.settings);
            } catch (error) {
                console.error('Error in settings listener:', error);
            }
        });
    }

    async initialize(): Promise<void> {
        try {
            this.applySettingsToDOM();
            const loaded = await this.loadFromBackend();
            
            if (!loaded) {
                console.log('Using local settings, will sync when online');
            }
            
            this.applySettingsToDOM();
        } catch (error) {
            console.warn('Settings initialization failed:', error);
        }
    }

    getSettings(): CmdrSettings {
        return { ...this.settings };
    }

    updateSettings(updates: Partial<CmdrSettings>): void {
        this.settings = { ...this.settings, ...updates };
        this.saveSettings();
        this.applySettingsToDOM();
    }

    updateFontSettings(fontSettings: Partial<typeof defaultSettings.font>): void {
        this.settings.font = { ...this.settings.font, ...fontSettings };
        this.saveSettings();
        this.applySettingsToDOM();
    }

    updateTheme(theme: ColorTheme): void {
        this.settings.theme = theme;
        this.saveSettings();
        this.applySettingsToDOM();
    }

    updateTerminalBehavior(behavior: Partial<typeof defaultSettings.terminalBehavior>): void {
        this.settings.terminalBehavior = { ...this.settings.terminalBehavior, ...behavior };
        this.saveSettings();
        this.applySettingsToDOM();
    }

    updateUISettings(ui: Partial<typeof defaultSettings.ui>): void {
        this.settings.ui = { ...this.settings.ui, ...ui };
        this.saveSettings();
        this.applySettingsToDOM();
    }

    updateKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
        this.settings.keyboardShortcuts = shortcuts;
        this.saveSettings();
    }

    updateConnectionSettings(connection: Partial<typeof defaultSettings.connection>): void {
        this.settings.connection = { ...this.settings.connection, ...connection };
        this.saveSettings();
    }

    updatePerformanceSettings(performance: Partial<typeof defaultSettings.performance>): void {
        this.settings.performance = { ...this.settings.performance, ...performance };
        this.saveSettings();
    }

    updateSecuritySettings(security: Partial<typeof defaultSettings.security>): void {
        this.settings.security = { ...this.settings.security, ...security };
        this.saveSettings();
    }

    updateAISettings(ai: Partial<typeof defaultSettings.ai>): void {
        this.settings.ai = { ...this.settings.ai, ...ai };
        this.saveSettings();
    }

    updateSessionSettings(session: Partial<typeof defaultSettings.session>): void {
        this.settings.session = { ...this.settings.session, ...session };
        this.saveSettings();
    }

    updateDeveloperSettings(developer: Partial<typeof defaultSettings.developer>): void {
        this.settings.developer = { ...this.settings.developer, ...developer };
        this.saveSettings();
    }

    updateAccessibilitySettings(accessibility: Partial<typeof defaultSettings.accessibility>): void {
        this.settings.accessibility = { ...this.settings.accessibility, ...accessibility };
        this.saveSettings();
    }

    private applySettingsToDOM(): void {
        const root = document.documentElement;
        
        Object.entries(this.settings.theme.colors).forEach(([key, value]) => {
            const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        });
        
        if (this.settings.theme.opacity !== undefined) {
            root.style.setProperty('--theme-opacity', this.settings.theme.opacity.toString());
        }
        
        root.style.setProperty('--font-family', this.settings.font.family);
        root.style.setProperty('--font-size', `${this.settings.font.size}px`);
        root.style.setProperty('--font-weight', this.settings.font.weight);
        root.style.setProperty('--line-height', this.settings.font.lineHeight.toString());
        
        const terminalElements = document.querySelectorAll('.terminal, .xterm-screen, .xterm');
        terminalElements.forEach(element => {
            if (element instanceof HTMLElement) {
                element.style.fontFamily = this.settings.font.family;
                element.style.fontSize = `${this.settings.font.size}px`;
                element.style.fontWeight = this.settings.font.weight;
                element.style.lineHeight = this.settings.font.lineHeight.toString();
            }
        });
        
        const canvasElements = document.querySelectorAll('.xterm canvas');
        canvasElements.forEach(canvas => {
            if (canvas instanceof HTMLCanvasElement) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.font = `${this.settings.font.weight} ${this.settings.font.size}px ${this.settings.font.family}`;
                }
            }
        });

        // Apply terminal behavior settings to existing terminal instance
        if ((window as any).term) {
            const term = (window as any).term;
            
            console.log('Applying terminal behavior settings to existing terminal:', this.settings.terminalBehavior);
            
            try {
                // Use options property for immediate updates (this is the most reliable way)
                if (term.options) {
                    term.options.cursorStyle = this.settings.terminalBehavior.cursorStyle;
                    term.options.cursorBlink = this.settings.terminalBehavior.cursorBlink;
                    term.options.scrollback = this.settings.terminalBehavior.scrollbackSize;
                    
                    console.log('Updated terminal options:', {
                        cursorStyle: term.options.cursorStyle,
                        cursorBlink: term.options.cursorBlink,
                        scrollback: term.options.scrollback
                    });
                }
                
                // Force a complete refresh to apply visual changes
                if (term.refresh) {
                    term.refresh(0, term.rows - 1);
                }
                
                // Also trigger a resize to force re-rendering
                if (term.resize && term.cols && term.rows) {
                    setTimeout(() => {
                        term.resize(term.cols, term.rows);
                    }, 10);
                }
                
                // Handle custom terminal behavior features that need event handlers
                this.setupTerminalBehaviorHandlers(term);
                
                console.log('Terminal settings applied successfully');
            } catch (error) {
                console.warn('Failed to apply terminal settings:', error);
            }
        } else {
            console.log('No terminal instance found, settings will be applied on next terminal creation');
        }
    }
    
    private setupTerminalBehaviorHandlers(term: any): void {
        // Handle copyOnSelection
        if (this.settings.terminalBehavior.copyOnSelection) {
            if (!term._copyOnSelectionHandler) {
                term._copyOnSelectionHandler = () => {
                    if (term.hasSelection()) {
                        const selection = term.getSelection();
                        if (selection && navigator.clipboard) {
                            navigator.clipboard.writeText(selection).catch(err => 
                                console.warn('Failed to copy selection to clipboard:', err)
                            );
                        }
                    }
                };
                term.onSelectionChange?.(term._copyOnSelectionHandler);
            }
        } else if (term._copyOnSelectionHandler) {
            // Remove handler if copyOnSelection is disabled
            // Note: xterm.js doesn't provide easy way to remove specific listeners
            term._copyOnSelectionHandler = null;
        }
        
        // Handle pasteOnRightClick - this would need to be implemented at the DOM level
        const terminalElement = term.element;
        if (terminalElement) {
            if (this.settings.terminalBehavior.pasteOnRightClick) {
                if (!terminalElement._pasteHandler) {
                    terminalElement._pasteHandler = (e: MouseEvent) => {
                        if (e.button === 2) { // Right click
                            e.preventDefault();
                            if (navigator.clipboard) {
                                navigator.clipboard.readText().then(text => {
                                    if (text) {
                                        term.paste(text);
                                    }
                                }).catch(err => 
                                    console.warn('Failed to read clipboard for paste:', err)
                                );
                            }
                        }
                    };
                    terminalElement.addEventListener('mouseup', terminalElement._pasteHandler);
                }
            } else if (terminalElement._pasteHandler) {
                terminalElement.removeEventListener('mouseup', terminalElement._pasteHandler);
                terminalElement._pasteHandler = null;
            }
        }
        
        console.log('Terminal behavior handlers updated:', {
            copyOnSelection: this.settings.terminalBehavior.copyOnSelection,
            pasteOnRightClick: this.settings.terminalBehavior.pasteOnRightClick
        });
        
        // Also update global termOptions for new terminal instances
        if ((window as any).termOptions) {
            const termOptions = (window as any).termOptions;
            termOptions.cursorStyle = this.settings.terminalBehavior.cursorStyle;
            termOptions.cursorBlink = this.settings.terminalBehavior.cursorBlink;
            termOptions.scrollback = this.settings.terminalBehavior.scrollbackSize;
            
            console.log('Updated global termOptions:', {
                cursorStyle: termOptions.cursorStyle,
                cursorBlink: termOptions.cursorBlink,
                scrollback: termOptions.scrollback
            });
        }

        console.log('Applied settings:', {
            font: this.settings.font,
            terminalBehavior: this.settings.terminalBehavior
        });
    }

    getAvailableThemes(): ColorTheme[] {
        return [
            defaultSettings.theme,
            {
                name: 'light',
                displayName: 'Light Theme',
                colors: {
                    primary: '#0066cc',
                    secondary: '#6c757d',
                    accent: '#ffc107',
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    text: '#000000',
                    textSecondary: '#6c757d',
                    border: '#dee2e6',
                    error: '#dc3545',
                    success: '#28a745',
                    terminalBackground: '#ffffff',
                    terminalForeground: '#000000',
                    terminalCursor: '#000000',
                    terminalSelection: '#b3d4fc',
                    terminalBrightBlack: '#666666',
                    terminalBrightRed: '#cd3131',
                    terminalBrightGreen: '#00bc00',
                    terminalBrightYellow: '#949800',
                    terminalBrightBlue: '#0451a5',
                    terminalBrightMagenta: '#bc05bc',
                    terminalBrightCyan: '#0598bc',
                    terminalBrightWhite: '#555555'
                },
                opacity: 1.0
            }
        ];
    }

    addListener(callback: (settings: CmdrSettings) => void): () => void {
        this.listeners.push(callback);
        
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    async resetToDefaults(): Promise<void> {
        this.settings = { ...defaultSettings };
        this.saveSettings();
        this.applySettingsToDOM();
    }

    exportSettings(): string {
        return JSON.stringify(this.settings, null, 2);
    }

    importSettings(settingsJson: string): boolean {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = this.mergeWithDefaults(imported);
            this.saveSettings();
            this.applySettingsToDOM();
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }
}

const settingsService = SettingsService.getInstance();
export default settingsService;
