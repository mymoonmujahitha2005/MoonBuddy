import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Brain, Map, HelpCircle, MessageSquare, 
  ChevronRight, ChevronLeft, Download, RotateCcw,
  Send, User as UserIcon, Bot, Check, X, Video, Loader2,
  Sparkles, ExternalLink, Moon, Printer
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { getMaterialById } from './dbService';
import { chatAboutMaterial } from './geminiService';
import { VisualMindMap, VisualMindMapRef } from './VisualMindMap';
import { FileStore } from './fileStore';
import { PdfViewer } from './PdfViewer';
import { DocxViewer } from './DocxViewer';
import { PptxViewer } from './PptxViewer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ResultsPage: React.FC = () => {
  const { id } = useParams();
  const [material, setMaterial] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [mindMapLoading, setMindMapLoading] = useState(false);
  const previewUrlFromStore = FileStore.getPreviewUrl();
  const previewUrl = previewUrlFromStore || (material?.fileType !== 'youtube' ? material?.originalUrl : null);
  const sessionYoutubeUrl = FileStore.getYoutubeUrl();
  const mindMapRef = useRef<VisualMindMapRef>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : null;
    return id ? `https://www.youtube.com/embed/${id}` : null;
  };

  const videoUrlToUse = sessionYoutubeUrl || material?.originalUrl;
  const youtubeEmbedUrl = material?.fileType === 'youtube' ? getYoutubeEmbedUrl(videoUrlToUse) : null;

  const exportToPdf = async () => {
    if (!notesRef.current) return;
    try {
      const canvas = await html2canvas(notesRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const notesEl = clonedDoc.getElementById('pdf-export-content');
          if (notesEl instanceof HTMLElement) {
            // Force basic styles to avoid oklch parsing errors in html2canvas
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              #pdf-export-content, #pdf-export-content * {
                color: #cbd5e1 !important;
                background-color: transparent !important;
                border-color: rgba(255,255,255,0.1) !important;
                text-shadow: none !important;
                box-shadow: none !important;
              }
              #pdf-export-content {
                background-color: #0f172a !important;
                padding: 40px !important;
              }
              #pdf-export-content h1, #pdf-export-content h2, #pdf-export-content h3 {
                color: #ffffff !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${material.title || 'study-material'}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };

  // Quiz & Flashcards State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        setLoading(true);
        const data = await getMaterialById(id);
        setMaterial(data);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGenerateMindMap = async () => {
    if (mindMapLoading) return;
    setMindMapLoading(true);
    // Simulate re-generation logic
    // In a real app, we might call Gemini again with "Refine mind map"
    setTimeout(() => {
      setMindMapLoading(false);
    }, 2000);
  };

  const handleRefreshMindMap = () => {
    mindMapRef.current?.resetView();
  };

  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting]);

  // Event handlers omitted for brevity (kept matching previous implementation)
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);
    try {
      const response = await chatAboutMaterial(material, userMessage, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', content: "I encountered an error while thinking. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleQuizSubmit = () => {
    if (!material?.quiz?.[currentQuestion]) return;
    if (selectedOption === material.quiz[currentQuestion].correctAnswer) setScore(score + 1);
    if (currentQuestion + 1 < (material.quiz?.length || 0)) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else setShowScore(true);
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 font-medium">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
      <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-slate-500">Consulting the Moon...</span>
    </div>
  </div>;

  if (!material) return <div className="flex h-screen items-center justify-center text-slate-400">Knowledge not found in this sector.</div>;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* LEFT: Video/Preview (Large, as seen in image) */}
      <div className="flex-1 bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl min-h-[300px] lg:min-h-0 relative group border border-white/5">
        {youtubeEmbedUrl ? (
          <div className="w-full h-full">
            <iframe 
              src={youtubeEmbedUrl}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Preview"
            />
          </div>
        ) : previewUrl ? (
          <div className="w-full h-full">
            {material.fileType?.includes('video') ? (
              <video 
                src={previewUrl} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay 
              />
            ) : material.fileType === 'pdf' ? (
              <PdfViewer url={previewUrl} file={FileStore.getFile()} />
            ) : material.fileType === 'document' ? (
              <DocxViewer file={FileStore.getFile()!} />
            ) : material.fileType === 'presentation' ? (
              <PptxViewer file={FileStore.getFile()!} />
            ) : material.fileType?.includes('audio') ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-slate-800/20">
                <div className="w-40 h-40 bg-purple-500/10 rounded-full flex items-center justify-center animate-pulse mb-8 border border-purple-500/20">
                   <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                      <RotateCcw size={40} className="animate-spin-slow" />
                   </div>
                </div>
                <audio 
                  src={previewUrl} 
                  className="w-full max-w-md" 
                  controls 
                  autoPlay 
                />
                <div className="mt-6 flex flex-col items-center gap-1">
                   <p className="text-white text-sm font-bold">Audio Recording</p>
                   <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center">Processing insights for this session</p>
                </div>
              </div>
            ) : material.fileType?.includes('image') ? (
              <img 
                src={previewUrl} 
                alt="File Preview" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 space-y-4">
                <Video size={64} className="opacity-20" />
                <p className="text-sm font-medium">Session playback available for media formats</p>
              </div>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-white/30">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
              <Video size={40} />
            </div>
            <div className="text-center px-6">
              <p className="text-xs font-bold uppercase tracking-widest">{material.fileType === 'youtube' ? 'YouTube link not available' : 'Local media session expired'}</p>
              <p className="text-[10px] opacity-60">
                {material.fileType === 'youtube' 
                  ? 'The video could not be embedded. Please check the URL.' 
                  : 'Re-upload media to see live preview'}
              </p>
            </div>
          </div>
        )}
        
        {/* Overlay info */}
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2 shadow-xl">
            <div className={`w-1.5 h-1.5 rounded-full ${previewUrl || youtubeEmbedUrl ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-slate-500'}`} />
            {previewUrl || youtubeEmbedUrl ? 'Celestial Link Active' : 'Offline Mode'}
          </div>
        </div>
      </div>

      {/* RIGHT: Tabs & Content (PROPORTIONAL) */}
      <div className="w-full lg:w-[500px] flex flex-col card overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-2xl">
        {/* Compact Tab Ribbon */}
        <div className="flex border-b border-white/5 p-3 overflow-x-auto no-scrollbar gap-2 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
          {[
            { id: 'notes', label: 'Celestial Notes', icon: <FileText size={20} /> },
            { id: 'flashcards', label: 'Moon Flashcards', icon: <Moon size={20} /> },
            { id: 'chat', label: 'Lunar Assistant', icon: <MessageSquare size={20} /> },
            { id: 'quiz', label: 'Stellar Quiz', icon: <HelpCircle size={20} /> },
            { id: 'mindmap', label: 'Galaxy Map', icon: <Map size={20} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              title={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-2xl transition-all flex items-center justify-center flex-1
                ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              {tab.icon}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-slate-300">
          <AnimatePresence mode="wait">
            {activeTab === 'notes' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="font-bold text-white tracking-tight">Cosmic Notes</h3>
                   <button 
                    onClick={exportToPdf}
                    className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 border border-indigo-500/20"
                   >
                     <Download size={14} />
                     Export PDF
                   </button>
                </div>
                <div ref={notesRef} id="pdf-export-content" className="prose prose-sm prose-invert max-w-none p-2">
                  <h1 className="text-2xl font-black text-white leading-tight tracking-tight">{material.title}</h1>
                  <p className="text-xs text-slate-400 italic mt-2 pb-6 border-b border-white/5 mb-6">{material.summary}</p>
                  <ReactMarkdown>{material.notes}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {activeTab === 'flashcards' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center space-y-8">
                 {material.flashcards && material.flashcards.length > 0 ? (
                   <>
                     <div onClick={() => setIsFlipped(!isFlipped)} className="w-full h-72 cursor-pointer perspective-1000">
                        <motion.div className="w-full h-full relative preserve-3d" animate={{ rotateY: isFlipped ? 180 : 0 }}>
                          <div className="absolute inset-0 backface-hidden flex items-center justify-center p-8 bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-[2.5rem] text-center font-bold text-white text-lg shadow-2xl">
                             <div className="absolute top-6 flex items-center gap-1.5 opacity-30">
                                <Sparkles size={12} />
                                <span className="text-[8px] uppercase tracking-[0.2em] font-black">Celestial Flashcard</span>
                             </div>
                            {material.flashcards[currentCard]?.front}
                          </div>
                          <div className="absolute inset-0 backface-hidden flex items-center justify-center p-8 bg-indigo-600 rounded-[2.5rem] text-center rotate-y-180 text-white text-lg shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
                            {material.flashcards[currentCard]?.back}
                          </div>
                        </motion.div>
                     </div>
                     <div className="flex items-center gap-6">
                        <button onClick={() => setCurrentCard(Math.max(0, currentCard - 1))} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-300"><ChevronLeft size={24} /></button>
                        <span className="text-sm font-black tabular-nums tracking-widest text-indigo-400">{currentCard + 1} / {material.flashcards.length}</span>
                        <button onClick={() => setCurrentCard(Math.min(material.flashcards.length-1, currentCard + 1))} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-300"><ChevronRight size={24} /></button>
                     </div>
                   </>
                 ) : (
                   <div className="text-slate-500 text-center uppercase tracking-widest text-[10px] font-bold">No celestial cards found.</div>
                 )}
              </motion.div>
            )}

            {activeTab === 'mindmap' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="h-full flex flex-col space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-white">Galaxy Map</h2>
                  <button 
                    onClick={handleGenerateMindMap}
                    disabled={mindMapLoading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-50 active:scale-95"
                  >
                    {mindMapLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-indigo-200" />}
                    <span>{mindMapLoading ? 'Aligning Stars...' : 'Generate Map'}</span>
                  </button>
                </div>

                <div className="flex-1 bg-black/20 rounded-3xl border border-white/5 shadow-inner flex flex-col overflow-hidden relative backdrop-blur-sm">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="text-md font-bold text-white truncate max-w-[200px]">{material.title || "Study Material"}</h3>
                    <div className="flex gap-2">
                       <button 
                         onClick={handleRefreshMindMap}
                         className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                       >
                         <RotateCcw size={14} />
                       </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6 relative overflow-hidden bg-slate-900/10 min-h-[400px]">
                    <VisualMindMap data={material.mindMap} ref={mindMapRef} loading={mindMapLoading} />
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'quiz' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 {material.quiz && material.quiz.length > 0 ? (
                   <>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 transition-all shadow-[0_0_8px_rgba(129,140,248,0.8)]" style={{ width: `${((currentQuestion + 1) / material.quiz.length) * 100}%` }} />
                     </div>
                     {showScore ? (
                       <div className="text-center py-12 space-y-4 bg-white/5 rounded-3xl border border-white/5">
                         <h2 className="text-2xl font-black text-white">Celestial Rank</h2>
                         <p className="text-5xl font-black text-indigo-400 tabular-nums">{score} <span className="text-slate-600 text-2xl">/ {material.quiz.length}</span></p>
                         <div className="pt-6 px-8">
                            <button onClick={() => {setShowScore(false); setCurrentQuestion(0); setScore(0);}} className="gradient-btn w-full">Restart Journey</button>
                         </div>
                       </div>
                     ) : (
                        <div className="space-y-8 pt-4">
                          <p className="text-xl font-bold text-white leading-tight">{material.quiz[currentQuestion]?.question}</p>
                          <div className="space-y-3">
                            {material.quiz[currentQuestion]?.options?.map((opt: string) => (
                              <button 
                                key={opt} 
                                onClick={() => setSelectedOption(opt)} 
                                className={`w-full p-5 rounded-2xl text-left text-sm font-bold border-2 transition-all duration-300
                                  ${selectedOption === opt 
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]' 
                                    : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <button disabled={!selectedOption} onClick={handleQuizSubmit} className="gradient-btn w-full !py-4 text-md tracking-tight">Confirm Alignment</button>
                        </div>
                     )}
                   </>
                 ) : (
                   <div className="text-slate-500 text-center font-bold uppercase tracking-widest text-[10px]">No stellar challenges found.</div>
                 )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                  <div className="flex-1 space-y-4 pb-4 overflow-y-auto no-scrollbar">
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-4">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                          <Sparkles size={12} />
                          Moon Assistant
                       </p>
                       <p className="text-xs text-slate-300 leading-relaxed font-medium">Hello explorer! I'm your celestial guide. Ask me anything about this knowledge base.</p>
                    </div>

                    {chatHistory.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-[1.5rem] text-sm max-w-[85%] leading-relaxed shadow-sm
                          ${m.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500' 
                            : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="flex justify-start">
                         <div className="bg-white/5 p-4 rounded-[1.5rem] rounded-tl-none border border-white/5 flex gap-2 items-center">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                         </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleChat} className="flex gap-2 pt-4 border-t border-white/5">
                    <input 
                      type="text" 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask the moon..."
                      className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatInput.trim() || isChatting}
                      className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                    >
                      <Send size={20} />
                    </button>
                  </form>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
};

export default ResultsPage;
