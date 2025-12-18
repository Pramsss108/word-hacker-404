import { auth, db, googleProvider } from './firebase';
import { 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut, 
    onAuthStateChanged, 
    User,
    signInAnonymously,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

export type UserStatus = 'loading' | 'anonymous' | 'pro' | 'god_mode';

class ProAuthService {
    private user: User | null = null;
    private status: UserStatus = 'loading';
    private listeners: ((status: UserStatus, user: User | null) => void)[] = [];

    // Developer Secret from .env (God Mode)
    private readonly DEV_SECRET = import.meta.env.VITE_AI_ACCESS_SECRET;

    constructor() {
        // Check for redirect result on page load - MUST complete before anything else
        console.log("🔍 Checking for redirect result...");
        
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    console.log("✅ Redirect login successful!", result.user.email);
                } else {
                    console.log("ℹ️ No redirect result (normal page load)");
                }
            })
            .catch((error) => {
                console.error("❌ Redirect result error:", error.code, error.message);
            });

        onAuthStateChanged(auth, (user) => {
            console.log("🔄 Auth state changed:", user ? `User: ${user.email || user.uid}` : 'No user');
            this.user = user;
            if (user) {
                console.log("✅ User logged in:", user.uid, user.email || 'anonymous', "Is Anonymous?", user.isAnonymous);
                // Only sync real users to DB, not anonymous guests
                if (!user.isAnonymous) {
                    this.syncUserToDB(user);
                }
            } else {
                console.log("❌ User is null/signed out");
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
        } else if (this.user?.isAnonymous) {
            this.status = 'anonymous'; // Guest user
        } else if (this.user) {
            this.status = 'pro'; // Logged in user
        } else {
            this.status = 'loading'; // No user yet
        }
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb(this.status, this.user));
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
            console.log("🚀 Starting Google sign in...");
            const result = await signInWithPopup(auth, googleProvider);
            console.log("✅ Popup sign in successful!", result.user.email);
            return result;
        } catch (error: any) {
            console.error("❌ Popup error:", error.code, error.message);
            // If popup blocked or fails, use redirect method
            if (error.code === 'auth/popup-blocked' || 
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request') {
                console.log("🔄 Popup failed, trying redirect...");
                await signInWithRedirect(auth, googleProvider);
            } else {
                console.error("Login failed", error);
                throw error;
            }
        }
    }

    /**
     * Alternative: Direct redirect login (no popup)
     */
    public async signInWithRedirect() {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Redirect login failed", error);
            throw error;
        }
    }

    /**
     * Sign in with Email and Password
     */
    public async signInWithEmail(email: string, password: string) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Email login failed", error);
            throw error;
        }
    }

    /**
     * Create new account with Email and Password
     */
    public async signUpWithEmail(email: string, password: string) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error("Email signup failed", error);
            throw error;
        }
    }

    /**
     * Sign in as Anonymous Guest
     */
    public async signInAsGuest() {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Anonymous login failed", error);
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
