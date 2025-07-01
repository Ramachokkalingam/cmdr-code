import { h, FunctionalComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { UpdateInfo, updateService } from '../services/updateService';
import { UpdateModal } from './UpdateModal';

interface UpdateCheckerProps {
    checkInterval?: number; // in milliseconds, default 1 hour
    disabled?: boolean; // disable update checking entirely
}

export const UpdateChecker: FunctionalComponent<UpdateCheckerProps> = ({ 
    checkInterval = 3600000, // 1 hour
    disabled = false
}) => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    
    // Use ref to track last check time to avoid stale closures
    const lastCheckTimeRef = useRef<number>(0);

    const checkForUpdates = async (showNotification = false) => {
        if (isChecking || disabled) return;
        
        // Prevent too frequent checks (minimum 30 seconds between checks)
        const now = Date.now();
        if (now - lastCheckTimeRef.current < 30000) {
            console.debug('[UpdateChecker] Skipping check - too soon since last check');
            return;
        }
        
        try {
            console.debug('[UpdateChecker] Starting update check...');
            setIsChecking(true);
            const update = await updateService.checkForUpdates();
            
            if (update) {
                console.debug('[UpdateChecker] Update available:', update);
                setUpdateInfo(update);
                setShowModal(true);
                
                if (showNotification && 'Notification' in window) {
                    try {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            new Notification('CMDR Update Available', {
                                body: `Version ${update.version} is now available`,
                                icon: '/favicon.png',
                                tag: 'cmdr-update'
                            });
                        }
                    } catch (err) {
                        console.log('Notification not supported or permission denied');
                    }
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
        if (disabled) return;
        
        // Check for updates on component mount
        checkForUpdates();

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
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkInterval, disabled]); // Removed lastCheckTime from dependencies

    const handleCloseModal = () => {
        if (updateInfo && !updateInfo.mandatory) {
            setShowModal(false);
        }
    };

    const handleSkipUpdate = () => {
        if (updateInfo && !updateInfo.mandatory) {
            setShowModal(false);
            // Store skip preference in localStorage to avoid showing again for this version
            localStorage.setItem(`cmdr-skip-update-${updateInfo.version}`, 'true');
        }
    };

    // Don't show modal if user has already skipped this version
    const shouldShowModal = showModal && updateInfo && 
        (updateInfo.mandatory || !localStorage.getItem(`cmdr-skip-update-${updateInfo.version}`));

    return (
        <div>
            {shouldShowModal && updateInfo && (
                <UpdateModal
                    updateInfo={updateInfo}
                    onClose={handleCloseModal}
                    onSkip={handleSkipUpdate}
                />
            )}
        </div>
    );
};

export default UpdateChecker;
