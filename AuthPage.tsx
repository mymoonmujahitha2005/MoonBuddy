import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Moon, Mail, Lock, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      console.log("Initiating Google Sign-In with project:", auth.app.options.projectId);
      const { user } = await signInWithPopup(auth, provider);
      console.log("Sign-in success for user:", user.email);
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Space Traveler',
          photoURL: user.photoURL || null,
          lastLogin: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      } else {
        // Update without blocking navigation
        setDoc(userDocRef, {
          displayName: user.displayName || userDoc.data()?.displayName,
          photoURL: user.photoURL || userDoc.data()?.photoURL,
          lastLogin: serverTimestamp(),
        }, { merge: true }).catch(err => console.error("LastLogin update failed", err));
      }
      
      navigate('/');
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Connection interrupted. This often happens inside the preview frame. Use the "Open in New Tab" link below for a stable connection.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups or use "Open in New Tab" below.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(`Google login is not enabled for project: gen-lang-client-0344577707. Please go to the Firebase Console > Authentication > Sign-in method and enable Google.`);
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain ${window.location.hostname} is not authorized. In Firebase Console > Authentication > Settings > Authorized domains, add: ${window.location.hostname}`);
      } else {
        setError('The connection is being blocked. This is common when using an iframe. Please use the "Open in New Tab" link below to login safely.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in the Firebase Console. Please enable it in your Authentication settings.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="card p-8 sm:p-10 !rounded-[2.5rem]" id="auth-card">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-[1.5rem] text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] mb-6 transform -rotate-6">
              <Moon size={32} className="fill-white/10" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Moon<span className="text-indigo-400">Buddy</span></h1>
            <p className="text-slate-400 mt-2 font-medium">Celestial AI Learning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                  placeholder="name@cosmos.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-red-400 bg-red-400/5 p-4 rounded-2xl border border-red-400/20">{error}</p>
                {error.toLowerCase().includes('tab') && (
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-center text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                  >
                    Open in New Tab <Sparkles className="inline-block ml-1" size={10} />
                  </a>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-btn flex items-center justify-center gap-2 group h-14 !rounded-2xl shadow-xl shadow-indigo-600/20"
              id="auth-submit-btn"
            >
              <span className="text-md font-black tracking-tight">{loading ? 'Initiating...' : (isLogin ? 'Enter the Galaxy' : 'Begin Journey')}</span>
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="px-4 bg-slate-900/40 text-slate-500 rounded-full">Celestial Auth</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-14 border border-white/5 bg-white/5 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-300 hover:bg-white/10 hover:border-white/10 hover:text-white transition-all active:scale-95 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google Access
            </button>
          </form>

            <div className="mt-8 text-center space-y-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-[0.15em] block w-full"
              >
                {isLogin ? "New Explorer? Join the Moon" : "Returning? Synchronize"}
              </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
