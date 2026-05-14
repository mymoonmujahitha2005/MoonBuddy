import React from 'react';
import { motion } from 'motion/react';
import { Moon, Sparkles } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[9999] overflow-hidden"
    >
      {/* Galaxy Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: Math.random() }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity }}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              boxShadow: '0 0 8px 1px white'
            }}
          />
        ))}
      </div>

      <div className="relative">
        {/* Animated background rings */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-indigo-500 blur-3xl"
        />
        
        <div className="relative flex flex-col items-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-24 h-24 bg-slate-900/50 backdrop-blur-xl rounded-full shadow-[0_0_50px_-12px_rgba(99,102,241,0.5)] flex items-center justify-center mb-6 border border-slate-700/50"
          >
            <Moon size={48} className="text-white fill-white/10" />
            
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-indigo-400"
            >
              <Sparkles size={28} />
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
              Moon<span className="text-indigo-400">Buddy</span>
            </h1>
            <div className="flex items-center justify-center gap-2 text-slate-400 font-bold uppercase tracking-[0.3em] text-[9px]">
              <div className="h-[1px] w-4 bg-slate-800" />
              <span>Celestial AI Learning</span>
              <div className="h-[1px] w-4 bg-slate-800" />
            </div>
          </motion.div>
          
          <div className="mt-12 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="h-full w-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
