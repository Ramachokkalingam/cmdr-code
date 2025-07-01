export interface LocalSession {
    id: string;
    name: string;
    command: string;
    working_dir: string;
    created_at: number;
    last_used: number;
    is_active: boolean;
    is_archived?: boolean;
}

export interface LocalTab {
    id: string;
    name: string;
    current_directory: string;
    last_access: string;
    is_active: boolean;
    created_at?: string;
}

class LocalSessionService {
    private baseUrl = window.location.origin;

    async getSessions(): Promise<LocalSession[]> {
        const response = await fetch(`${this.baseUrl}/api/sessions`);
        if (!response.ok) {
            throw new Error(`Failed to fetch sessions: ${response.statusText}`);
        }
        return response.json();
    }

    async getTabs(): Promise<LocalTab[]> {
        const sessions = await this.getSessions();
        return sessions.map(session => ({
            id: session.id,
            name: session.name,
            current_directory: session.working_dir,
            last_access: new Date(session.last_used * 1000).toISOString(),
            is_active: session.is_active,
            created_at: new Date(session.created_at * 1000).toISOString(),
        }));
    }

    async createTab(options: { name: string; current_directory: string }): Promise<LocalTab> {
        const response = await fetch(`${this.baseUrl}/api/sessions/create`, {
            method: 'GET', // Using GET for simplicity based on current backend implementation
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create session: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // If name was provided, rename the session
        if (options.name !== 'New Session') {
            await this.updateTabName(result.session_id, options.name);
        }
        
        // Return the session in Tab format
        return {
            id: result.session_id,
            name: options.name,
            current_directory: options.current_directory,
            last_access: new Date().toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
        };
    }

    async updateTabName(sessionId: string, name: string): Promise<void> {
        // Use the URL-based rename endpoint we implemented
        const encodedName = encodeURIComponent(name);
        const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/rename/${encodedName}`, {
            method: 'GET',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to rename session: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
    }

    async closeTab(sessionId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/delete`, {
            method: 'GET',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete session: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }
    }

    async checkHealth(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/sessions/test/health`);
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`);
        }
    }

    // Placeholder methods to match cloud service interface
    async setCurrentSession(sessionId: string): Promise<void> {
        // For local sessions, this is handled by the frontend state
        console.log('Setting current session:', sessionId);
    }

    async setActiveTab(sessionId: string): Promise<void> {
        // For local sessions, this is handled by the frontend state
        console.log('Setting active tab:', sessionId);
    }
}

export const localSessionService = new LocalSessionService();
