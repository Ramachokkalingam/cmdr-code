import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { authService } from '../../services/firebase';
import { cloudService } from '../../services/cloud';
import { User } from 'firebase/auth';
import './session.scss';

interface Tab {
    id: string;
    name: string;
    current_directory: string;
    last_access: string;
    is_active: boolean;
}

interface SessionProps {
    user: User;
    onSignOut: () => void;
    onTabChange?: (tabId: string) => void;
}

export function SessionManager({ user, onSignOut, onTabChange }: SessionProps) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load tabs on component mount
    useEffect(() => {
        loadTabs();
    }, []);

    const loadTabs = async () => {
        try {
            setLoading(true);
            setError(null);

            // First test if cloud service is available
            console.log('Testing cloud service...');
            await cloudService.checkHealth();
            console.log('Cloud service is available, loading tabs...');

            const tabsData = await cloudService.getTabs();
            console.log('Loaded tabs:', tabsData);
            setTabs(tabsData);

            // Set first tab as active if no active tab
            if (tabsData.length > 0 && !activeTabId) {
                setActiveTabId(tabsData[0].id);
                onTabChange?.(tabsData[0].id);
            }
        } catch (err: unknown) {
            console.error('Failed to load tabs:', err);

            // More specific error messages
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('Failed to get tabs: 401')) {
                setError('Authentication failed - please sign in again');
            } else if (errorMessage.includes('Failed to get tabs: 404')) {
                setError('Tab service not found - check backend');
            } else if (errorMessage.includes('Failed to get tabs: 500')) {
                setError('Server error - check backend logs');
            } else if (errorMessage.includes('fetch')) {
                setError('Cannot connect to backend - is it running?');
            } else {
                setError(`Failed to load tabs: ${errorMessage}`);
            }

            // Create a default local tab for fallback
            const defaultTab = {
                id: 'local-default',
                name: 'Terminal',
                current_directory: '~',
                last_access: new Date().toISOString(),
                is_active: true,
            };
            setTabs([defaultTab]);
            setActiveTabId(defaultTab.id);
            onTabChange?.(defaultTab.id);
        } finally {
            setLoading(false);
        }
    };

    const createNewTab = async () => {
        try {
            setError(null);
            console.log('Creating new tab...');

            const newTab = await cloudService.createTab({
                name: `Tab ${new Date().toLocaleTimeString()}`,
                current_directory: '~',
            });

            console.log('Tab created successfully:', newTab);

            // Reload tabs to get updated list
            await loadTabs();

            // Switch to new tab
            setActiveTabId(newTab.id);
            onTabChange?.(newTab.id);
        } catch (err: unknown) {
            console.error('Failed to create tab - detailed error:', err);

            // More specific error messages
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage.includes('Failed to create tab: 401')) {
                setError('Authentication failed - please sign in again');
            } else if (errorMessage.includes('Failed to create tab: 403')) {
                setError('Permission denied - check user authentication');
            } else if (errorMessage.includes('Failed to create tab: 500')) {
                setError('Server error - check backend logs');
            } else if (errorMessage.includes('fetch')) {
                setError('Cannot connect to backend - is it running?');
            } else {
                setError(`Failed to create tab: ${errorMessage}`);
            }
        }
    };

    const closeTab = async (tabId: string) => {
        try {
            setError(null);
            await cloudService.closeTab(tabId);

            // Remove from local state
            const updatedTabs = tabs.filter(tab => tab.id !== tabId);
            setTabs(updatedTabs);

            // If closing active tab, switch to another tab
            if (activeTabId === tabId) {
                const newActiveTab = updatedTabs[0];
                if (newActiveTab) {
                    setActiveTabId(newActiveTab.id);
                    onTabChange?.(newActiveTab.id);
                } else {
                    setActiveTabId(null);
                }
            }
        } catch (err) {
            setError('Failed to close tab');
            console.error('Failed to close tab:', err);
        }
    };

    const switchTab = (tabId: string) => {
        setActiveTabId(tabId);
        onTabChange?.(tabId);
    };

    const handleSignOut = async () => {
        try {
            await authService.signOut();
            onSignOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    return (
        <div className="session-manager">
            {/* Tab Bar */}
            <div className="tab-bar">
                <div className="tabs-container">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                            onClick={() => switchTab(tab.id)}
                        >
                            <span className="tab-name">{tab.name}</span>
                            <span className="tab-directory">{tab.current_directory}</span>
                            {tabs.length > 1 && (
                                <button
                                    className="tab-close"
                                    onClick={e => {
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button className="new-tab-btn" onClick={createNewTab} disabled={loading}>
                    + New Tab
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* User Session Info */}
            <div className="session-info">
                <div className="user-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User Avatar" />
                    ) : (
                        <div className="avatar-placeholder">
                            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>

                {showUserMenu && (
                    <div className="user-menu">
                        <div className="user-details">
                            <div className="user-name">{user.displayName || 'Anonymous'}</div>
                            <div className="user-email">{user.email}</div>
                        </div>
                        <div className="session-stats">
                            <div className="stat">
                                <span className="stat-label">Active Tabs:</span>
                                <span className="stat-value">{tabs.length}</span>
                            </div>
                        </div>
                        <button className="sign-out-btn" onClick={handleSignOut}>
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
