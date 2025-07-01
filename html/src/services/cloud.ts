// Cloud backend service for CMDR AI
import { authService } from './firebase';

// Use local CMDR server for session management instead of remote cloud
const CLOUD_API_BASE = 'http://localhost:8000/api';
const LOCAL_API_BASE = window.location.origin + '/api';

export interface AIRequest {
    prompt: string;
}

export interface AIResponse {
    result: string;
}

export interface Tab {
    id: string;
    name: string;
    current_directory: string;
    last_access: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
}

export interface CreateTabRequest {
    name?: string;
    current_directory?: string;
    environment_vars?: Record<string, string>;
}

interface SessionResponse {
    id: string;
    name: string;
    command: string;
    working_dir: string;
    created_at: number;
    last_used: number;
    is_active: boolean;
}

export interface TerminalCommand {
    command: string;
    session_id: string;
}

class CloudService {
    private baseUrl: string;
    private useLocal: boolean = true; // Default to local session management

    constructor() {
        this.baseUrl = this.useLocal ? LOCAL_API_BASE : CLOUD_API_BASE;
    }

    // Check if we should use local session management
    private async shouldUseLocal(): Promise<boolean> {
        try {
            console.log('🔍 Testing local API at:', `${LOCAL_API_BASE}/sessions`);
            // Try to reach local session endpoint
            const response = await fetch(`${LOCAL_API_BASE}/sessions`, {
                method: 'GET',
            });
            console.log('✅ Local API response:', response.ok, response.status);
            return response.ok;
        } catch (error) {
            console.error('❌ Local API failed:', error);
            return false;
        }
    }

    // Switch to local API if available
    private async ensureLocalAPI(): Promise<void> {
        if (!this.useLocal && (await this.shouldUseLocal())) {
            this.useLocal = true;
            this.baseUrl = LOCAL_API_BASE;
            console.log('Switched to local session management');
        }
    }

    // AI Assistant
    async askAI(prompt: string): Promise<AIResponse> {
        try {
            console.log('🤖 Making AI request to:', `${CLOUD_API_BASE}/ai/ask`);
            console.log('🤖 Request payload:', { prompt });
            
            // Always use cloud API for AI requests
            const response = await fetch(`${CLOUD_API_BASE}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            console.log('🤖 Response status:', response.status, response.statusText);
            console.log('🤖 Response ok:', response.ok);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                console.error('🤖 Response error data:', errorData);
                throw new Error(errorData.detail || 'Failed to get AI response');
            }

            const result = await response.json();
            console.log('🤖 Response data:', result);
            return result;
        } catch (error) {
            console.error('🤖 AI request failed:', error);
            console.error('🤖 Error type:', error instanceof Error ? error.constructor.name : typeof error);
            console.error('🤖 Error message:', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    // Health check
    async checkHealth(): Promise<{ status: string }> {
        try {
            console.log('Checking health at:', `${this.baseUrl}/sessions/test/health`);
            const response = await fetch(`${this.baseUrl}/sessions/test/health`, {
                method: 'GET',
            });

            console.log('Health check response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('Health check failed:', response.status, errorText);
                throw new Error(`Health check failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Health check response:', data);
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    // Tab Management (uses local session API first, fallback to cloud)
    async getTabs(): Promise<Tab[]> {
        try {
            await this.ensureLocalAPI();

            if (this.useLocal) {
                console.log('🚀 Getting sessions from local API...');
                console.log('🚀 Local API URL:', `${LOCAL_API_BASE}/sessions`);
                const response = await fetch(`${LOCAL_API_BASE}/sessions`, {
                    method: 'GET',
                });

                console.log('🚀 Sessions response:', response.ok, response.status);
                if (response.ok) {
                    const sessions = await response.json();
                    console.log('🚀 Local sessions response:', sessions);

                    // Convert session format to Tab format
                    return sessions.map((session: SessionResponse) => ({
                        id: session.id,
                        name: session.name || 'Unnamed Session',
                        current_directory: session.working_dir || '~',
                        last_access: new Date(session.last_used * 1000).toISOString(),
                        is_active: session.is_active || false,
                        created_at: new Date(session.created_at * 1000).toISOString(),
                    }));
                }
            }

            // Fallback to cloud API
            console.log('Falling back to cloud API...');
            const token = await authService.getIdToken();
            const response = await fetch(`${CLOUD_API_BASE}/sessions/tabs`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get tabs: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get tabs:', error);

            // Return a default session as fallback
            return [
                {
                    id: 'local-default',
                    name: 'Terminal Session',
                    current_directory: '~',
                    last_access: new Date().toISOString(),
                    is_active: true,
                    created_at: new Date().toISOString(),
                },
            ];
        }
    }

    async createTab(tabData: CreateTabRequest): Promise<Tab> {
        try {
            await this.ensureLocalAPI();

            if (this.useLocal) {
                console.log('Creating session via local API...');
                const response = await fetch(`${LOCAL_API_BASE}/sessions/create`, {
                    method: 'GET',
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Local session created:', result);

                    // Convert to Tab format
                    return {
                        id: result.session_id,
                        name: tabData.name || 'New Session',
                        current_directory: tabData.current_directory || '~',
                        last_access: new Date().toISOString(),
                        is_active: true,
                        created_at: new Date().toISOString(),
                    };
                }
            }

            // Fallback to cloud API
            console.log('Falling back to cloud API for session creation...');
            const token = await authService.getIdToken();
            const response = await fetch(`${CLOUD_API_BASE}/sessions/tabs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(tabData),
            });

            if (!response.ok) {
                throw new Error(`Failed to create tab: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Tab creation failed:', error);
            throw error;
        }
    }

    async closeTab(tabId: string): Promise<void> {
        try {
            await this.ensureLocalAPI();

            if (this.useLocal) {
                console.log('Deleting session via local API:', tabId);
                const response = await fetch(`${LOCAL_API_BASE}/sessions/${tabId}/delete`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    console.log('Local session deleted successfully');
                    return;
                }
            }

            // Fallback to cloud API
            const token = await authService.getIdToken();
            const response = await fetch(`${CLOUD_API_BASE}/sessions/tabs/${tabId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to close tab: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to close tab:', error);
            throw error;
        }
    }

    async updateTabDirectory(tabId: string, directory: string): Promise<Tab> {
        try {
            const token = await authService.getIdToken();
            const response = await fetch(`${this.baseUrl}/sessions/tabs/${tabId}/directory`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ directory }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update tab directory: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('Failed to update tab directory:', error);
            throw error;
        }
    }

    async updateTabName(tabId: string, name: string): Promise<Tab> {
        try {
            await this.ensureLocalAPI();

            if (this.useLocal) {
                console.log('Updating session name via local API:', tabId, name);
                const response = await fetch(`${LOCAL_API_BASE}/sessions/${tabId}/rename`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name }),
                });

                if (response.ok) {
                    // Return updated tab info
                    return {
                        id: tabId,
                        name: name,
                        current_directory: '~',
                        last_access: new Date().toISOString(),
                        is_active: true,
                        created_at: new Date().toISOString(),
                    };
                }
            }

            // Fallback to cloud API
            const token = await authService.getIdToken();
            const response = await fetch(`${CLOUD_API_BASE}/sessions/tabs/${tabId}/name`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update tab name: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('Failed to update tab name:', error);
            throw error;
        }
    }

    async setActiveTab(tabId: string): Promise<void> {
        try {
            const token = await authService.getIdToken();
            const response = await fetch(`${this.baseUrl}/sessions/tabs/${tabId}/activate`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to activate tab: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to activate tab:', error);
            throw error;
        }
    }

    // Session management for terminal
    private currentSessionId?: string;

    setCurrentSession(sessionId: string): void {
        this.currentSessionId = sessionId;
    }

    getCurrentSession(): string | undefined {
        return this.currentSessionId;
    }
}

export const cloudService = new CloudService();
