import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

declare global {
    interface Window {
        __FIREBASE_API_KEY__?: string;
        __FIREBASE_AUTH_DOMAIN__?: string;
        __FIREBASE_PROJECT_ID__?: string;
        __FIREBASE_STORAGE_BUCKET__?: string;
        __FIREBASE_MESSAGING_SENDER_ID__?: string;
        __FIREBASE_APP_ID__?: string;
        __CLOUD_BACKEND_URL__?: string;
    }
}

const firebaseConfig = {
    apiKey: window.__FIREBASE_API_KEY__ || 'AIzaSyAHkS2NfLTTJsCoHzqURtnrCPMqVApL8bk',
    authDomain: window.__FIREBASE_AUTH_DOMAIN__ || 'cmdr-terminal.firebaseapp.com',
    projectId: window.__FIREBASE_PROJECT_ID__ || 'cmdr-terminal',
    storageBucket: window.__FIREBASE_STORAGE_BUCKET__ || 'cmdr-terminal.firebasestorage.app',
    messagingSenderId: window.__FIREBASE_MESSAGING_SENDER_ID__ || '830715383754',
    appId: window.__FIREBASE_APP_ID__ || '1:830715383754:web:6fc2d47f0083b0f2280933',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export class AuthService {
    private currentUser: User | null = null;
    private authCallbacks: ((user: User | null) => void)[] = [];

    constructor() {
        // Listen for auth state changes
        onAuthStateChanged(auth, user => {
            this.currentUser = user;
            this.authCallbacks.forEach(callback => callback(user));
        });
    }

    async signInWithGoogle(): Promise<User> {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign-out error:', error);
            throw error;
        }
    }

    async getIdToken(): Promise<string | null> {
        if (!this.currentUser) return null;
        try {
            return await this.currentUser.getIdToken();
        } catch (error) {
            console.error('Error getting ID token:', error);
            return null;
        }
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    onAuthStateChange(callback: (user: User | null) => void): () => void {
        this.authCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = this.authCallbacks.indexOf(callback);
            if (index > -1) {
                this.authCallbacks.splice(index, 1);
            }
        };
    }

    isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    async verifyTokenWithBackend(): Promise<boolean> {
        const token = await this.getIdToken();
        if (!token) return false;

        try {
            const response = await fetch(
                `${window.__CLOUD_BACKEND_URL__ || 'http://localhost:8000'}/api/auth/verify-token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                }
            );

            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }
}

export const authService = new AuthService();
