import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { motion } from 'motion/react';
import { Users, Shield, Calendar, Mail, Search, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Navigate } from 'react-router-dom';

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: any;
  lastLogin: any;
}

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Redirect if not the designated admin
  if (user?.email !== "mymoonmujahitha2005_mca27@mepcoeng.ac.in") {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
        const snapshot = await getDocs(q);
        const userData = snapshot.docs.map(doc => doc.data() as AppUser);
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Admin <span className="text-indigo-400">Command</span></h1>
          </div>
          <p className="text-slate-400 font-medium">Monitoring the cosmic explorers of MoonBuddy</p>
        </div>

        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search explorers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Explorers</p>
              <h2 className="text-3xl font-black text-white">{users.length}</h2>
            </div>
          </div>
        </div>
        {/* Additional stats could go here */}
      </div>

      <div className="card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text">Explorer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Arrival</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={4}>
                      <div className="h-10 bg-slate-800/50 rounded-xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <motion.tr 
                    key={u.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-indigo-500/20 overflow-hidden bg-slate-800 flex items-center justify-center">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-400 font-bold">{u.displayName?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">{u.displayName}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">UID: {u.uid.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <Mail size={14} className="text-slate-500" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                          <Calendar size={14} className="text-slate-500" />
                          {formatDate(u.lastLogin)}
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-1 italic">
                          Joined: {formatDate(u.createdAt).split(',')[0]}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No explorers found in this sector</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
