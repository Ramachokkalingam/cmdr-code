import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { localSessionService, LocalTab } from '../../services/local-session';
import { User } from 'firebase/auth';
import './session-sidebar.scss';

interface Session {
    id: string;
    name: string;
    current_directory: string;
    last_access: string;
    is_active: boolean;
    created_at?: string;
}

// Convert LocalTab to Session format
function tabToSession(tab: LocalTab): Session {
    return {
        id: tab.id,
        name: tab.name,
        current_directory: tab.current_directory || '~',
        last_access: tab.last_access || new Date().toISOString(),
        is_active: tab.is_active || false,
        created_at: tab.created_at,
    };
}

interface SessionSidebarProps {
    user: User;
    activeSessionId: string | null;
    collapsed: boolean;
    onSessionChange: (sessionId: string) => void;
    onSignOut: () => void;
    onToggleSidebar: () => void;
}

export function SessionSidebar({
    user,
    activeSessionId,
    collapsed,
    onSessionChange,
    onSignOut,
    onToggleSidebar,
}: SessionSidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Loading sessions...');
            await localSessionService.checkHealth();

            const sessionsData = await localSessionService.getTabs();
            console.log('Loaded sessions:', sessionsData);
            setSessions(sessionsData.map(tabToSession));

            // Set first session as active if no active session
            if (sessionsData.length > 0 && !activeSessionId) {
                onSessionChange(sessionsData[0].id);
            }
        } catch (err: unknown) {
            console.error('Failed to load sessions:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load session history';
            setError(errorMessage);

            // Create a default local session for fallback
            const defaultSession = {
                id: 'local-default',
                name: 'New Session',
                current_directory: '~',
                last_access: new Date().toISOString(),
                is_active: true,
            };
            setSessions([defaultSession]);
            onSessionChange(defaultSession.id);
        } finally {
            setLoading(false);
        }
    };

    const createNewSession = async () => {
        try {
            setError(null);
            const timestamp = new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });

            const newSession = await localSessionService.createTab({
                name: `Session ${timestamp}`,
                current_directory: '~',
            });

            console.log('Session created:', newSession);
            await loadSessions();
            onSessionChange(newSession.id);
        } catch (err: unknown) {
            console.error('Failed to create session:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create new session';
            setError(errorMessage);
        }
    };

    const deleteSession = async (sessionId: string, event: Event) => {
        event.stopPropagation();

        if (sessions.length <= 1) {
            setError('Cannot delete the last session');
            return;
        }

        try {
            await localSessionService.closeTab(sessionId);

            const updatedSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(updatedSessions);

            // Switch to another session if deleting active one
            if (activeSessionId === sessionId) {
                const nextSession = updatedSessions[0];
                if (nextSession) {
                    onSessionChange(nextSession.id);
                }
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
            setError('Failed to delete session');
        }
    };

    const startEditing = (session: Session, event: Event) => {
        event.stopPropagation();
        setEditingSessionId(session.id);
        setEditingName(session.name);
    };

    const saveSessionName = async () => {
        if (!editingSessionId || !editingName.trim()) {
            setEditingSessionId(null);
            return;
        }

        try {
            // Update local state immediately for better UX
            setSessions(sessions.map(s => (s.id === editingSessionId ? { ...s, name: editingName.trim() } : s)));

            // Update the session name via API
            await localSessionService.updateTabName(editingSessionId, editingName.trim());

            setEditingSessionId(null);
            setEditingName('');
        } catch (err) {
            console.error('Failed to update session name:', err);
            setError('Failed to update session name');
            // Revert local state on error
            await loadSessions();
            setEditingSessionId(null);
        }
    };

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            saveSessionName();
        } else if (event.key === 'Escape') {
            setEditingSessionId(null);
            setEditingName('');
        }
    };

    const formatSessionTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
            return 'Now';
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className={`session-sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <button
                    className="toggle-sidebar-btn"
                    onClick={onToggleSidebar}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                </button>

                {!collapsed && (
                    <Fragment>
                        <h2>Sessions</h2>
                        <button
                            className="new-session-btn"
                            onClick={createNewSession}
                            disabled={loading}
                            title="Start new session"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                        </button>
                    </Fragment>
                )}
            </div>

            {/* Error Display */}
            {error && !collapsed && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Sessions List */}
            {!collapsed && (
                <div className="sessions-list">
                    {loading ? (
                        <div className="loading-message">Loading sessions...</div>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
                                onClick={() => onSessionChange(session.id)}
                            >
                                <div className="session-content">
                                    {editingSessionId === session.id ? (
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={e => setEditingName((e.target as HTMLInputElement).value)}
                                            onBlur={saveSessionName}
                                            onKeyDown={handleKeyPress}
                                            autoFocus
                                            className="session-name-input"
                                        />
                                    ) : (
                                        <Fragment>
                                            <div className="session-info">
                                                <div className="session-name">{session.name}</div>
                                                <div className="session-meta">
                                                    <span className="session-time">
                                                        {formatSessionTime(session.last_access)}
                                                    </span>
                                                    <span className="session-dir">{session.current_directory}</span>
                                                </div>
                                            </div>
                                            <div className="session-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={e => startEditing(session, e)}
                                                    title="Rename session"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                    </svg>
                                                </button>
                                                {sessions.length > 1 && (
                                                    <button
                                                        className="delete-btn"
                                                        onClick={e => deleteSession(session.id, e)}
                                                        title="Delete session"
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                        >
                                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </Fragment>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* User Menu */}
            <div className="sidebar-footer">
                <div className="user-section">
                    <button
                        className="user-button"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title={collapsed ? user.displayName || user.email || 'User' : ''}
                    >
                        <div className="user-avatar">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User Avatar" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <div className="user-info">
                                <div className="user-name">{user.displayName || 'Anonymous'}</div>
                                <div className="user-email">{user.email}</div>
                            </div>
                        )}
                        {!collapsed && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 10l5 5 5-5z" />
                            </svg>
                        )}
                    </button>

                    {showUserMenu && !collapsed && (
                        <div className="user-dropdown">
                            <div className="dropdown-item">
                                <span className="session-count">{sessions.length} active sessions</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item danger" onClick={onSignOut}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
