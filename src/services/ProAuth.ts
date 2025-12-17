import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

export type UserStatus = 'loading' | 'anonymous' | 'pro' | 'god_mode';

interface DailyUsage {
    count: number;
    date: string; // YYYY-MM-DD
}

class ProAuthService {
    private user: User | null = null;
    private status: UserStatus = 'loading';
    private listeners: ((status: UserStatus, user: User | null) => void)[] = [];

    // Developer Secret from .env (God Mode)
    private readonly DEV_SECRET = import.meta.env.VITE_AI_ACCESS_SECRET;

    constructor() {
        onAuthStateChanged(auth, (user) => {
            this.user = user;
            if (user) {
                this.syncUserToDB(user); // 📧 MARKETING: Save email to DB
            }
            this.updateStatus();
        });
    }

    /**
     * Saves user email/name to Firestore for Marketing Lists
     */
    private async syncUserToDB(user: User) {
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastSeen: serverTimestamp()
            }, { merge: true }); // Merge ensures we don't overwrite other data
        } catch (e) {
            console.error("Marketing sync failed", e);
        }
    }

    private updateStatus() {
        if (this.DEV_SECRET && this.DEV_SECRET.length > 5) {
            this.status = 'god_mode'; // Local Dev Override
        } else if (this.user) {
            this.status = 'pro';
        } else {
            this.status = 'anonymous';
        }
        this.notifyListeners();
    }

    public subscribe(callback: (status: UserStatus, user: User | null) => void) {
        this.listeners.push(callback);
        callback(this.status, this.user);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    public async signIn() {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    }

    public async signOut() {
        await firebaseSignOut(auth);
    }

    public getStatus() {
        return this.status;
    }

    /**
     * CORE LOGIC: Can the user chat?
     * Returns: { allowed: boolean, reason?: string, remaining?: number }
     */
    public async checkAccess(): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
        // 1. GOD MODE (Always allow)
        if (this.status === 'god_mode') {
            return { allowed: true, remaining: 9999 };
        }

        // 2. MUST BE LOGGED IN
        if (!this.user) {
            return { allowed: false, reason: 'login_required' };
        }

        // 3. CHECK FIRESTORE LIMITS
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', this.user.uid);
        const usageRef = doc(db, `users/${this.user.uid}/usage/${today}`);

        try {
            const snap = await getDoc(usageRef);
            let count = 0;

            if (snap.exists()) {
                count = snap.data().count || 0;
            }

            if (count >= 10) {
                return { allowed: false, reason: 'limit_reached', remaining: 0 };
            }

            return { allowed: true, remaining: 10 - count };

        } catch (error) {
            console.error("Auth Check Error", error);
            // Fail open (allow) if DB error? No, fail closed for security.
            return { allowed: false, reason: 'error' };
        }
    }

    /**
     * Call this AFTER a successful AI response to deduct a credit
     */
    public async incrementUsage() {
        if (this.status === 'god_mode' || !this.user) return;

        const today = new Date().toISOString().split('T')[0];
        const usageRef = doc(db, `users/${this.user.uid}/usage/${today}`);

        try {
            await setDoc(usageRef, {
                count: increment(1),
                lastUsed: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Failed to track usage", e);
        }
    }
}

export const proAuth = new ProAuthService();
