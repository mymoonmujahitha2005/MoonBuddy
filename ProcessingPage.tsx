import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, FileText, Video as VideoIcon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processFile, processYoutubeUrl } from './geminiService';
import { saveMaterial } from './dbService';
import { useAuth } from './AuthContext';

const steps = [
  { id: 1, label: "Signal received", desc: "Setting up your cosmic content" },
  { id: 2, label: "Scanning orbits", desc: "Gemini is scanning for key themes" },
  { id: 3, label: "Extracting star-dust", desc: "Generating transcript or key points" },
  { id: 4, label: "Condensing galaxies", desc: "Condensing the main ideas" },
  { id: 5, label: "Forging insights", desc: "Formatting structured notes" },
  { id: 6, label: "Finalizing alignment", desc: "Saving your celestial study kit" }
];

import { FileStore } from './fileStore';

const ProcessingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const { filename, type } = location.state || {};

  const processed = React.useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<string | null>(null);

  useEffect(() => {
    const file = FileStore.getFile();
    const youtubeUrl = FileStore.getYoutubeUrl();
    
    if (processed.current || error) return;
    
    if ((!file && !youtubeUrl) || !user) {
      if (!processed.current && !error) navigate('/');
      return;
    }

    const runProcess = async () => {
      processed.current = true;
      const interval = setInterval(() => {
        setCurrentStep(prev => (prev < 5 ? prev + 1 : prev));
      }, 3000);

      try {
        let result;
        if (youtubeUrl) {
          result = await processYoutubeUrl(youtubeUrl);
        } else if (file) {
          result = await processFile(file);
        } else {
          throw new Error("No content to process.");
        }
        
        clearInterval(interval);
        setCurrentStep(5); // Generating notes
        
        await new Promise(r => setTimeout(r, 800));
        setCurrentStep(6); // Finalizing
        
        // Add a safety check for the result
        if (!result || !result.title) {
          throw new Error("AI returned an empty result.");
        }

        const materialId = await saveMaterial(user.uid, filename, type, result, youtubeUrl || undefined);
        
        if (!materialId) throw new Error("Database error: Could not save your material.");

        setCurrentStep(7);
        
        setTimeout(() => {
          // FileStore.clearFile(); // Keep it for the results page preview
          navigate(`/results/${materialId}`, { replace: true });
        }, 1000);
        
      } catch (err: any) {
        clearInterval(interval);
        console.error("Process Error:", err);
        
        let errorMsg = err.message || 'An unexpected error occurred.';
        
        if (err.message && err.message.includes('404')) {
          errorMsg = 'System Error: Essential service not found (404). Please contact support.';
        } else if (err.message && err.message.includes('Unexpected token')) {
          errorMsg = 'Data formatting error. Try using a simpler file.';
        }
        
        setError(errorMsg);
        try {
          const jsonStr = err.message.substring(err.message.indexOf('{'), err.message.lastIndexOf('}') + 1);
          if (jsonStr) {
             const parsed = JSON.parse(jsonStr);
             setTechnicalDetails(`Operation: ${parsed.operationType}, Path: ${parsed.path}, Error: ${parsed.error}`);
          } else {
             setTechnicalDetails(err.stack || String(err));
          }
        } catch {
          setTechnicalDetails(err.stack || String(err));
        }
        FileStore.clearFile();
      }
    };

    runProcess();
  }, [user, navigate, filename, type, error]);

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-400/20 shadow-lg">
            <Info size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Signal Interrupted</h1>
            <p className="text-slate-400 max-w-md mx-auto">{error}</p>
            {technicalDetails && (
              <details className="mt-4 text-left">
                <summary className="text-[10px] text-slate-600 cursor-pointer uppercase tracking-widest font-bold hover:text-slate-400 transition-colors">
                  View Technical Log
                </summary>
                <pre className="mt-2 text-[10px] bg-slate-900/50 p-4 rounded-xl border border-white/5 text-slate-500 overflow-x-auto whitespace-pre-wrap font-mono">
                  {technicalDetails}
                </pre>
              </details>
            )}
          </div>
          <button 
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Return to Command Center
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 w-full"
      >
        <div className="space-y-3 relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">Processing Cosmic Knowledge</h1>
          <p className="text-slate-400 font-medium">Extracting wisdom from "{filename}"</p>
        </div>

        <div className="w-full max-w-md mx-auto relative">
          <div className="w-full bg-slate-900 border border-white/5 h-3 rounded-full overflow-hidden mb-12 shadow-inner">
            <motion.div 
              className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.8)]"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="space-y-4 text-left max-w-xs mx-auto">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center gap-4 transition-all duration-300">
                  <div className="w-6 h-6 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 size={24} className="text-indigo-400 transition-all scale-110 shadow-indigo-400/20 shadow-sm" />
                    ) : isActive ? (
                      <Loader2 size={20} className="animate-spin text-indigo-500" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                    )}
                  </div>
                  <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-700'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProcessingPage;
