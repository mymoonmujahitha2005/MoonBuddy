import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Youtube, FileText, Video, Loader2, ArrowUpRight, Clock, Share2, Check } from 'lucide-react';
import { useAuth } from './AuthContext';
import { processFile } from './geminiService';
import { saveMaterial } from './dbService';
import { motion, AnimatePresence } from 'motion/react';

import { FileStore } from './fileStore';

const Dashboard: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState<'video' | 'pdf' | 'youtube'>('video');
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    const file = files[0];
    
    let targetType = 'file';
    const fileName = file.name.toLowerCase();
    
    if (file.type.includes('pdf')) targetType = 'pdf';
    else if (file.type.includes('video')) targetType = 'video';
    else if (file.type.includes('audio')) targetType = 'audio';
    else if (file.type.includes('image')) targetType = 'image';
    else if (file.type.includes('text')) targetType = 'text';
    else if (file.type.includes('presentation') || file.type.includes('powerpoint') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) targetType = 'presentation';
    else if (file.type.includes('word') || file.type.includes('officedocument.word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) targetType = 'document';

    FileStore.setFile(file);
    navigate('/processing', { state: { filename: file.name, type: targetType } });
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    FileStore.setYoutubeUrl(youtubeUrl);
    navigate('/processing', { state: { filename: 'YouTube Video', type: 'youtube' } });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const copyAppUrl = () => {
    // Attempt to convert ais-dev to ais-pre for a direct app experience
    let shareUrl = window.location.href;
    if (shareUrl.includes('ais-dev-')) {
      shareUrl = shareUrl.replace('ais-dev-', 'ais-pre-');
    }
    
    navigator.clipboard.writeText(shareUrl);
    setShowCopyTooltip(true);
    setTimeout(() => setShowCopyTooltip(false), 2000);
  };

  return (
    <div className="w-full py-10 space-y-12">
      <div className="card overflow-hidden !rounded-3xl border-indigo-500/10">
        <div className="bg-indigo-600/20 backdrop-blur-md p-10 text-center text-white space-y-4 border-b border-indigo-500/20">
          <h1 className="text-4xl font-black tracking-tight">Upload Celestial Content</h1>
          <p className="text-indigo-200 max-w-xl mx-auto opacity-90 font-medium">
            Let the moon process your knowledge. Upload a video, PDF, or paste a YouTube URL to begin.
          </p>
        </div>

        <div className="p-8 space-y-8">
          <div className="flex bg-slate-900/50 p-1 rounded-xl max-w-lg mx-auto border border-white/5 shadow-inner">
            {[
              { id: 'video', label: 'Media', icon: <Video size={18} /> },
              { id: 'pdf', label: 'Documents', icon: <FileText size={18} /> },
              { id: 'youtube', label: 'YouTube', icon: <Youtube size={18} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveUploadTab(tab.id as any);
                  if (tab.id !== 'youtube') setYoutubeUrl('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${activeUploadTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeUploadTab === 'youtube' ? (
            <form 
              onSubmit={handleYoutubeSubmit}
              className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-300
                ${youtubeUrl ? 'border-indigo-400/50 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/10 hover:border-slate-600 hover:bg-slate-800/20'}`}
            >
              <div className="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-red-500 border border-white/5">
                <Youtube size={32} />
              </div>
              <div className="w-full max-w-md space-y-4">
                <div className="space-y-2">
                  <p className="text-xl font-bold text-white">Process YouTube Video</p>
                  <p className="text-sm text-slate-400">Paste the link below to generate Insights</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-white placeholder:text-slate-600"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    Process
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 transition-all duration-300 cursor-pointer
                ${dragActive ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 bg-slate-800/10 hover:border-indigo-500/30 hover:bg-slate-800/30'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <div className="w-16 h-16 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-slate-400 border border-white/5">
                <Upload size={32} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">Drag & Drop {activeUploadTab === 'video' ? 'Media' : 'Documents'}</p>
                <p className="text-sm text-slate-400 uppercase tracking-widest font-medium mt-1">or click to browse files</p>
              </div>
              <input 
                type="file" className="hidden" id="file-upload" 
                ref={fileInputRef}
                accept={activeUploadTab === 'pdf' ? ".pdf,.pptx,.ppt,.docx,.doc" : "video/*,audio/*"}
                onChange={(e) => e.target.files && handleFiles(e.target.files)} 
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">
                {activeUploadTab === 'pdf' ? 'Celestial support for PDF, PPTX and Word' : 'Galaxy support (max 14MB) for MP4, WebM, MOV'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={copyAppUrl}
          className="group flex items-center gap-3 bg-slate-900/50 hover:bg-slate-800 border border-white/5 px-6 py-3 rounded-2xl transition-all relative overflow-hidden"
          id="btn-share-app"
        >
          <div className="flex items-center gap-2 text-indigo-400 group-hover:text-white transition-colors">
            <Share2 size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Share Permanent Cosmic Link</span>
          </div>
          <AnimatePresence>
            {showCopyTooltip && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-0 bg-indigo-600 flex items-center justify-center gap-2"
              >
                <Check size={16} className="text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Link Copied!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
