import { h } from 'preact';
import { useState } from 'preact/hooks';
import { authService } from '../../services/firebase';
import './auth.scss';

interface AuthProps {
    onAuthSuccess: () => void;
}

export function Login({ onAuthSuccess }: AuthProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await authService.signInWithGoogle();

            // Verify token with backend
            const isValid = await authService.verifyTokenWithBackend();
            if (isValid) {
                onAuthSuccess();
            } else {
                throw new Error('Token verification failed');
            }
        } catch (err: unknown) {
            console.error('Authentication error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Welcome to CMDR</h1>
                    <p>Terminal sharing made simple</p>
                </div>

                <div className="auth-content">
                    <button
                        className={`google-signin-btn ${isLoading ? 'loading' : ''}`}
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path
                                fill="#4285F4"
                                d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                            />
                            <path
                                fill="#34A853"
                                d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.53H1.83v2.07A8 8 0 0 0 8.98 17z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M4.5 10.49a4.8 4.8 0 0 1 0-3.09V5.33H1.83a8 8 0 0 0 0 7.23l2.67-2.07z"
                            />
                            <path
                                fill="#EA4335"
                                d="M8.98 4.72c1.16 0 2.19.4 3.01 1.2l2.26-2.26A7.7 7.7 0 0 0 8.98 1a8 8 0 0 0-7.15 4.33l2.67 2.07a4.8 4.8 0 0 1 4.48-2.68z"
                            />
                        </svg>
                        {isLoading ? 'Signing in...' : 'Continue with Google'}
                    </button>

                    {error && <div className="error-message">{error}</div>}
                </div>

                <div className="auth-footer">
                    <p>Secure authentication powered by Firebase</p>
                </div>
            </div>
        </div>
    );
}
