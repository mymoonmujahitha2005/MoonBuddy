import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Clock, Trash2, ArrowUpRight, Search, 
  Filter, Video, Youtube, Calendar, MoreVertical 
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getUserMaterials, deleteMaterial } from './dbService';
import { motion, AnimatePresence } from 'motion/react';

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchMaterials = async () => {
    if (user) {
      setLoading(true);
      const data = await getUserMaterials(user.uid);
      setMaterials(data || []);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Delete button clicked for ID:", id);
    
    // In iframes, window.confirm can sometimes be blocked. 
    // We'll proceed with deletion directly but maybe add a small delay or just do it.
    // To be safe, we'll keep it simple for now to ensure functional correctness.
    try {
      await deleteMaterial(id);
      console.log("Delete successful for ID:", id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Deletion UI error:", err);
      alert("Failed to delete. Check your connection.");
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Celestial Archive</h1>
          <p className="text-slate-400 font-medium">Review your previous cosmic discoveries</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 p-2 px-4 rounded-xl border border-white/5 bg-slate-900 shadow-xl text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-all active:scale-95">
                <Filter size={18} />
                <span className="text-xs uppercase tracking-widest">Filter</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="gradient-btn !px-6"
            >
              Discover More
            </button>
        </div>
      </div>

      <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search the archive by title or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-4 py-5 rounded-3xl bg-slate-900 shadow-2xl border border-white/5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder:text-slate-600 transition-all font-medium"
          />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500 uppercase tracking-widest text-[10px] font-bold">Scanning Sectors...</div>
        ) : filteredMaterials.length === 0 ? (
          <div className="card p-24 text-center space-y-6 flex flex-col items-center">
             <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-600 border border-white/5 shadow-inner">
                <Clock size={40} />
             </div>
             <div className="space-y-2">
                <p className="text-2xl font-black text-white">Empty Space</p>
                <p className="text-slate-400 max-w-xs mx-auto">No celestial materials have been processed in this quadrant of the galaxy.</p>
             </div>
             <button 
                onClick={() => navigate('/')}
                className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors uppercase tracking-widest text-xs"
             >Initiate First Discovery</button>
          </div>
        ) : (
          <AnimatePresence>
            {filteredMaterials.map((m, i) => (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/results/${m.id}`)}
                className="card p-6 group flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-indigo-500/30 hover:shadow-[0_20px_40_rgba(79,70,229,0.2)] transition-all cursor-pointer bg-slate-900/40"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl
                    ${m.fileType === 'pdf' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : m.fileType === 'video' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    {m.fileType === 'pdf' ? <FileText size={28} /> : m.fileType === 'video' ? <Video size={28} /> : <Youtube size={28} />}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-xl group-hover:text-indigo-400 transition-colors tracking-tight leading-tight">{m.title || m.fileName}</h3>
                    <div className="flex items-center gap-4 text-slate-500 text-xs mt-2 font-bold">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider">
                        <Calendar size={14} className="opacity-50" />
                        {m.createdAt?.toDate()?.toLocaleDateString()}
                      </span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                      <span className="flex items-center gap-1 uppercase tracking-widest text-indigo-500/60">
                         {m.fileType}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <div className="hidden md:flex flex-col items-end mr-6 bg-slate-800/20 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Discovery Status</span>
                        <span className="text-[10px] text-indigo-400 font-black flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                            ARCHIVED
                        </span>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(e, m.id);
                      }}
                      className="relative z-10 w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center border border-white/5 hover:border-red-500/30 cursor-pointer shadow-lg active:scale-95"
                      title="Erase Memory"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button 
                      className="group/btn w-12 h-12 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 border border-indigo-400/20"
                      title="Open Discovery"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/results/${m.id}`);
                      }}
                    >
                        <ArrowUpRight size={24} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
