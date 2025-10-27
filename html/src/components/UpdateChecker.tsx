import { h, FunctionalComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { UpdateNotification } from './UpdateNotification';
import { getUpdateService } from '../services/UpdateService';

interface UpdateCheckerProps {
    webSocket: WebSocket | null;
    checkInterval?: number; // in milliseconds, default 1 hour
    disabled?: boolean; // disable update checking entirely
}

export const UpdateChecker: FunctionalComponent<UpdateCheckerProps> = ({ 
    webSocket,
    checkInterval = 3600000, // 1 hour
    disabled = false
}) => {
    const [isChecking, setIsChecking] = useState(false);
    const updateService = useRef(getUpdateService()).current;
    
    // Use ref to track last check time to avoid stale closures
    const lastCheckTimeRef = useRef<number>(0);

    useEffect(() => {
        if (webSocket) {
            updateService.setWebSocket(webSocket);
        }
    }, [webSocket, updateService]);

    const checkForUpdates = async (showNotification = false) => {
        if (isChecking || disabled || !webSocket || webSocket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        // Prevent too frequent checks (minimum 30 seconds between checks)
        const now = Date.now();
        if (now - lastCheckTimeRef.current < 30000) {
            console.debug('[UpdateChecker] Skipping check - too soon since last check');
            return;
        }
        
        try {
            console.debug('[UpdateChecker] Starting update check...');
            setIsChecking(true);
            
            const hasUpdate = await updateService.checkForUpdates();
            
            if (hasUpdate && showNotification && 'Notification' in window) {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        new Notification('CMDR Update Available', {
                            body: 'A new version is now available',
                            icon: '/favicon.png',
                            tag: 'cmdr-update'
                        });
                    }
                } catch (err) {
                    console.log('Notification not supported or permission denied');
                }
            }
            
            lastCheckTimeRef.current = Date.now();
        } catch (error) {
            console.error('Failed to check for updates:', error);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (disabled || !webSocket) return;
        
        // Check for updates 10 seconds after WebSocket connection
        const initialTimeout = setTimeout(() => {
            checkForUpdates();
        }, 10000);

        // Set up periodic checking
        const interval = setInterval(() => {
            checkForUpdates(true); // Show notification for periodic checks
        }, checkInterval);

        // Check when window becomes visible (user returns to tab)
        const handleVisibilityChange = () => {
            if (!document.hidden && Date.now() - lastCheckTimeRef.current > 300000) { // 5 minutes
                checkForUpdates();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkInterval, disabled, webSocket]);

    const handleUpdateStart = () => {
        console.log('Update installation started');
    };

    const handleUpdateComplete = (success: boolean) => {
        console.log('Update completed:', success ? 'success' : 'failed');
        
        if (success) {
            // Show restart notification or automatically restart
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
    };

    return (
        <UpdateNotification
            webSocket={webSocket}
            onUpdateStart={handleUpdateStart}
            onUpdateComplete={handleUpdateComplete}
        />
    );
};

export default UpdateChecker;
