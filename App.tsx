
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, ShieldCheck, UserPlus, DollarSign, Newspaper, Folder, CheckCircle,
  Megaphone, LogOut, Save, PlusCircle, Trash2, Edit, Download, Lock, Unlock,
  MessageSquare, ThumbsUp, Heart, PartyPopper, Share2, Send, Eye, EyeOff,
  Bell, User as UserIcon, X, Database, RefreshCw, UploadCloud, Calendar
} from 'lucide-react';
import { 
  Role, User, Student, Presence, Offering, FeedItem, FileEntry, Registration, Area, Comment
} from './types';
import { INITIAL_STUDENTS } from './constants';
import { db, DatabaseSchema } from './db';

const App: React.FC = () => {
  // --- Estados do Sistema ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentArea, setCurrentArea] = useState<Area | 'home'>('home');
  
  // --- Estados de Dados ---
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  // --- Configurações e Fechamentos ---
  const [accumulatedBalance, setAccumulatedBalance] = useState(0);
  const [lastMonthClosure, setLastMonthClosure] = useState<string | null>(null);
  const [presenceClosedAt, setPresenceClosedAt] = useState<string | null>(null);
  const [allowEditsAfterClosure, setAllowEditsAfterClosure] = useState(false);

  // Filtro de Perfil (Instagram Style)
  const [profileFilter, setProfileFilter] = useState<string | null>(null);

  // --- Sincronização com "Banco de Dados" (LocalStorage) ---
  
  useEffect(() => {
    const initDB = async () => {
      const data = await db.load();
      if (data) {
        setStudents(data.students || INITIAL_STUDENTS);
        setPresences(data.presences || []);
        setOfferings(data.offerings || []);
        setFeed(data.feed || []);
        setFiles(data.files || []);
        setRegistrations(data.registrations || []);
        setAccumulatedBalance(data.settings?.accumulatedBalance || 0);
        setLastMonthClosure(data.settings?.lastMonthClosure || null);
        setPresenceClosedAt(data.settings?.presenceClosedAt || null);
        setAllowEditsAfterClosure(data.settings?.allowEditsAfterClosure || false);
      }
      setIsInitializing(false);
    };
    initDB();
  }, []);

  useEffect(() => {
    if (isInitializing) return;

    const saveData = async () => {
      setIsSaving(true);
      const schema: DatabaseSchema = {
        students, presences, offerings, feed, files, registrations,
        settings: { accumulatedBalance, lastMonthClosure, presenceClosedAt, allowEditsAfterClosure }
      };
      await db.save(schema);
      setTimeout(() => setIsSaving(false), 500);
    };

    const timeout = setTimeout(saveData, 1000);
    return () => clearTimeout(timeout);
  }, [students, presences, offerings, feed, files, registrations, accumulatedBalance, lastMonthClosure, presenceClosedAt, allowEditsAfterClosure, isInitializing]);

  // --- Handlers de Autenticação ---
  const handleLogin = (role: Role, email?: string, name?: string) => {
    if (role === 'lider') {
      setCurrentUser({ uid: 'lider-1', nome: 'Coordenador(a)', papel: 'lider' });
    } else if (role === 'auxiliar') {
      if (!name) return alert('Por favor, informe seu nome.');
      setCurrentUser({ uid: `aux-${Date.now()}`, nome: name, papel: 'auxiliar' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentArea('home');
    setProfileFilter(null);
  };

  // --- Handlers de Banco de Dados ---
  // Fix: Added handleExportDB and handleImportDB to manage database backup and restoration
  const handleExportDB = () => {
    const schema: DatabaseSchema = {
      students, presences, offerings, feed, files, registrations,
      settings: { accumulatedBalance, lastMonthClosure, presenceClosedAt, allowEditsAfterClosure }
    };
    db.exportToJSON(schema);
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as DatabaseSchema;
        if (window.confirm('Atenção: Isso irá substituir TODOS os dados atuais pelos dados do arquivo. Deseja continuar?')) {
          setStudents(data.students || INITIAL_STUDENTS);
          setPresences(data.presences || []);
          setOfferings(data.offerings || []);
          setFeed(data.feed || []);
          setFiles(data.files || []);
          setRegistrations(data.registrations || []);
          setAccumulatedBalance(data.settings?.accumulatedBalance || 0);
          setLastMonthClosure(data.settings?.lastMonthClosure || null);
          setPresenceClosedAt(data.settings?.presenceClosedAt || null);
          setAllowEditsAfterClosure(data.settings?.allowEditsAfterClosure || false);
          alert('Dados restaurados com sucesso!');
        }
      } catch (err) {
        console.error('Erro na importação:', err);
        alert('Erro ao importar arquivo. Verifique se o formato JSON está correto.');
      }
    };
    reader.readAsText(file);
    // Reset value to allow uploading the same file again if needed
    e.target.value = '';
  };

  // --- Handlers de Social/Feed ---
  const handleReaction = (postId: string, type: 'gostei' | 'coracao' | 'festa') => {
    if (!currentUser) return alert("Entre no portal para reagir!");
    setFeed(prev => prev.map(post => {
      if (post.id === postId) {
        const userMap = post.usuariosQueReagiram || {};
        const previousReaction = userMap[currentUser.uid];
        const newReactions = { ...post.reacoes };
        const newUsersMap = { ...userMap };

        if (previousReaction === type) {
          newReactions[type] = Math.max(0, newReactions[type] - 1);
          newUsersMap[currentUser.uid] = null;
        } else {
          if (previousReaction) newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
          newReactions[type] = (newReactions[type] || 0) + 1;
          newUsersMap[currentUser.uid] = type;
        }
        return { ...post, reacoes: newReactions, usuariosQueReagiram: newUsersMap };
      }
      return post;
    }));
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    const newComment: Comment = {
      nome: currentUser?.nome || 'Visitante',
      texto: text,
      aprovado: true
    };
    setFeed(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comentarios: [...(post.comentarios || []), newComment] };
      }
      return post;
    }));
  };

  // --- Cálculos de Filtros e Totais ---
  const financeTotals = useMemo(() => {
    const entries = offerings.filter(o => o.categoria === 'oferta' && o.tipo === 'entrada').reduce((s, o) => s + o.valor, 0);
    const exits = offerings.filter(o => o.categoria === 'oferta' && o.tipo === 'saida').reduce((s, o) => s + o.valor, 0);
    return { entries, exits, balance: entries - exits };
  }, [offerings]);

  const visibleFeed = useMemo(() => {
    const name = currentUser?.nome?.toLowerCase() || '';
    let filtered = [...feed].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    if (profileFilter) filtered = filtered.filter(item => item.criadoPorNome === profileFilter);
    if (currentUser?.papel === 'lider') return filtered;
    return filtered.filter(item => item.publico || item.mencionados.some(m => m.toLowerCase() === name) || item.criadoPorNome === currentUser?.nome);
  }, [feed, currentUser, profileFilter]);

  const publicFeed = useMemo(() => {
    return feed.filter(f => f.publico).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [feed]);

  // --- Sub-Componentes de UI ---

  const Header = () => (
    <header className="bg-[#4B1E6D]/95 text-white p-6 text-center shadow-lg sticky top-0 z-50">
      <div className="flex flex-col items-center gap-2 relative max-w-7xl mx-auto">
        <div className="absolute right-0 top-0 hidden md:flex items-center gap-2 px-4 py-2 bg-black/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Database size={12} className="text-green-400" />}
          {isSaving ? 'Salvando...' : 'Conectado'}
        </div>
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-inner overflow-hidden border-2 border-white cursor-pointer" onClick={() => setCurrentArea('home')}>
          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=mci-kids`} alt="MCI Kids" className="rounded-full" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">MCI Kids - Ministério Infantil</h1>
      </div>
    </header>
  );

  const FeedCard: React.FC<{ item: FeedItem }> = ({ item }) => {
    const [commentInput, setCommentInput] = useState('');
    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef<number>(0);

    const handleDoubleTap = () => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        handleReaction(item.id, 'coracao');
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
      lastTap.current = now;
    };

    const userReaction = currentUser ? item.usuariosQueReagiram?.[currentUser.uid] : null;

    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 relative">
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Heart size={120} className="text-white fill-pink-500 animate-ping opacity-75" />
          </div>
        )}
        <div className="p-6 pb-2" onClick={handleDoubleTap}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4B1E6D] to-pink-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-md">
                {item.criadoPorNome[0]}
              </div>
              <div>
                <button onClick={(e) => { e.stopPropagation(); setProfileFilter(item.criadoPorNome); setCurrentArea('feed'); }} className="font-bold text-lg text-gray-800 leading-none hover:text-[#4B1E6D] flex items-center gap-1">
                  {item.criadoPorNome} <UserIcon size={14} className="opacity-40" />
                </button>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{new Date(item.criadoEm).toLocaleString()}</p>
              </div>
            </div>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.tipo === 'evento' ? 'bg-pink-100 text-pink-600 border-pink-200' : item.tipo === 'escala' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-cyan-100 text-cyan-600 border-cyan-200'}`}>
              {item.tipo.toUpperCase()}
            </span>
          </div>
          <p className="mt-4 text-gray-700 text-lg leading-relaxed">{item.texto}</p>
          {item.mencionados.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {item.mencionados.map(m => <span key={m} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">@{m}</span>)}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 border-y gap-4">
          <div className="flex gap-6">
            <button onClick={() => handleReaction(item.id, 'gostei')} className={`flex items-center gap-1 transition-transform active:scale-150 ${userReaction === 'gostei' ? 'text-cyan-600' : 'text-gray-400'}`}>
              <ThumbsUp size={22} className={userReaction === 'gostei' ? 'fill-cyan-600' : ''} />
              <span className="text-sm font-black">{item.reacoes.gostei}</span>
            </button>
            <button onClick={() => handleReaction(item.id, 'coracao')} className={`flex items-center gap-1 transition-transform active:scale-150 ${userReaction === 'coracao' ? 'text-pink-600' : 'text-gray-400'}`}>
              <Heart size={22} className={userReaction === 'coracao' ? 'fill-pink-600' : ''} />
              <span className="text-sm font-black">{item.reacoes.coracao}</span>
            </button>
            <button onClick={() => handleReaction(item.id, 'festa')} className={`flex items-center gap-1 transition-transform active:scale-150 ${userReaction === 'festa' ? 'text-yellow-500' : 'text-gray-400'}`}>
              <PartyPopper size={22} />
              <span className="text-sm font-black">{item.reacoes.festa}</span>
            </button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(item.texto); alert('Copiado para área de transferência!'); }} className="text-gray-400 hover:text-indigo-600"><Share2 size={20} /></button>
        </div>

        <div className="p-4 space-y-3 bg-white">
          {item.comentarios?.map((c, idx) => (
            <div key={idx} className="bg-gray-100/70 p-3 rounded-2xl text-sm shadow-sm animate-in slide-in-from-left-2">
              <span className="font-black text-indigo-900 mr-2">{c.nome}</span>
              <span className="text-gray-700">{c.texto}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (handleAddComment(item.id, commentInput), setCommentInput(''))} placeholder="Adicione um comentário..." className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 ring-indigo-200" />
            <button onClick={() => { handleAddComment(item.id, commentInput); setCommentInput(''); }} className="w-10 h-10 bg-[#4B1E6D] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"><Send size={18} /></button>
          </div>
        </div>
      </div>
    );
  };

  const AreaContainer = ({ title, children, icon: Icon }: any) => (
    <div className="bg-white/95 p-6 md:p-10 rounded-[3rem] shadow-2xl mt-8 max-w-6xl mx-auto border-8 border-[#4B1E6D]/5 animate-in fade-in zoom-in-95 duration-500 mb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-4 border-gray-50 pb-6 gap-6">
        <h2 className="text-3xl md:text-4xl font-black flex items-center gap-4 text-[#4B1E6D]">
          {Icon && <Icon size={48} className="text-pink-500" />} {title}
        </h2>
        <button onClick={() => { setCurrentArea('home'); setProfileFilter(null); }} className="bg-gray-100 px-8 py-3 rounded-2xl text-gray-700 font-black border-2 border-transparent hover:border-indigo-200 transition-all uppercase text-sm tracking-widest">VOLTAR</button>
      </div>
      {children}
    </div>
  );

  // --- Áreas Específicas ---

  const PaisArea = () => {
    const [form, setForm] = useState({ nome: '', nasc: '', resp: '', tel: '', obs: '' });
    return (
      <AreaContainer title="Espaço Família" icon={Users}>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-indigo-600 flex items-center gap-2"><PlusCircle /> Cadastro de Criança</h3>
            <div className="bg-indigo-50/30 p-8 rounded-[2rem] border-2 border-indigo-100 space-y-4">
              <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome Completo" className="w-full p-4 rounded-xl border-2 outline-none focus:ring-4 ring-indigo-100" />
              <input type="date" value={form.nasc} onChange={e => setForm({...form, nasc: e.target.value})} className="w-full p-4 rounded-xl border-2 outline-none focus:ring-4 ring-indigo-100" />
              <input value={form.resp} onChange={e => setForm({...form, resp: e.target.value})} placeholder="Nome do Responsável" className="w-full p-4 rounded-xl border-2 outline-none focus:ring-4 ring-indigo-100" />
              <input value={form.tel} onChange={e => setForm({...form, tel: e.target.value})} placeholder="WhatsApp (00) 00000-0000" className="w-full p-4 rounded-xl border-2 outline-none focus:ring-4 ring-indigo-100" />
              <button onClick={() => {
                if(!form.nome || !form.tel) return alert('Preencha ao menos o nome e telefone!');
                setRegistrations([{ ...form, id: `reg-${Date.now()}`, criadoEm: new Date().toISOString(), endereco:'', telEmerg:'', contatoEmerg:'' }, ...registrations]);
                setForm({ nome: '', nasc: '', resp: '', tel: '', obs: '' });
                alert('Cadastro realizado com sucesso!');
              }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xl shadow-xl hover:bg-indigo-700">ENVIAR CADASTRO</button>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-pink-600 flex items-center gap-2"><Bell /> Últimos Avisos</h3>
            <div className="grid gap-6">
              {publicFeed.length === 0 ? <p className="text-gray-400 italic">Nenhum aviso público recente.</p> : publicFeed.map(item => <FeedCard key={item.id} item={item} />)}
            </div>
          </div>
        </div>
      </AreaContainer>
    );
  };

  const AuxiliarArea = () => {
    const [name, setName] = useState('');
    if (!currentUser) {
      return (
        <AreaContainer title="Entrada Auxiliar" icon={UserPlus}>
          <div className="max-w-md mx-auto space-y-6 text-center py-20">
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Identifique-se para acessar as ferramentas</p>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-5 border-2 rounded-2xl outline-none focus:ring-4 ring-blue-100 text-center text-xl font-bold" placeholder="Seu Nome Completo" />
            <button onClick={() => handleLogin('auxiliar', undefined, name)} className="w-full p-5 bg-blue-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:bg-blue-700 transition-all">ENTRAR COMO AUXILIAR</button>
          </div>
        </AreaContainer>
      );
    }
    return (
      <AreaContainer title={`Olá, ${currentUser.nome}`} icon={UserPlus}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10">
          <button onClick={() => setCurrentArea('presenca')} className="p-8 bg-indigo-500 text-white rounded-[2rem] shadow-xl flex flex-col items-center gap-3 font-black hover:scale-105 transition-all"><CheckCircle size={40} /> CHAMADA</button>
          <button onClick={() => setCurrentArea('oferta')} className="p-8 bg-green-500 text-white rounded-[2rem] shadow-xl flex flex-col items-center gap-3 font-black hover:scale-105 transition-all"><DollarSign size={40} /> OFERTAS</button>
          <button onClick={() => { setProfileFilter(null); setCurrentArea('feed'); }} className="p-8 bg-cyan-500 text-white rounded-[2rem] shadow-xl flex flex-col items-center gap-3 font-black hover:scale-105 transition-all"><Newspaper size={40} /> FEED</button>
          <button onClick={handleLogout} className="p-8 bg-red-500 text-white rounded-[2rem] shadow-xl flex flex-col items-center gap-3 font-black hover:scale-105 transition-all"><LogOut size={40} /> SAIR</button>
        </div>
      </AreaContainer>
    );
  };

  const PresencaArea = () => {
    const [dia, setDia] = useState(new Date().toISOString().slice(0, 10));
    const [novo, setNovo] = useState('');
    return (
      <AreaContainer title="Controle de Chamada" icon={CheckCircle}>
        <div className="flex flex-wrap gap-6 items-end mb-10 bg-indigo-50/50 p-8 rounded-[2rem] border-2 border-white">
          <div className="space-y-2">
            <label className="text-xs font-black text-indigo-900 uppercase">Data do Culto</label>
            <input type="date" value={dia} onChange={e => setDia(e.target.value)} className="p-4 rounded-xl border-2 font-bold outline-none" />
          </div>
          <div className="flex-grow space-y-2">
            <label className="text-xs font-black text-indigo-900 uppercase">Novo Visitante/Criança</label>
            <div className="flex gap-2">
              <input value={novo} onChange={e => setNovo(e.target.value)} placeholder="Nome completo" className="flex-grow p-4 rounded-xl border-2 outline-none" />
              <button onClick={() => {
                if(!novo) return;
                setStudents([...students, { id: `al-${Date.now()}`, nome: novo, tipo: 'convidado' }]);
                setNovo('');
              }} className="bg-indigo-600 text-white px-6 rounded-xl font-black shadow-lg hover:bg-indigo-700">ADICIONAR</button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-[2rem] shadow-sm border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr className="border-b"><th className="p-6 font-black uppercase text-xs text-gray-400">Nome</th><th className="p-6 font-black uppercase text-xs text-gray-400 text-center">Status</th><th className="p-6 font-black uppercase text-xs text-gray-400 text-right">Marcar</th></tr></thead>
            <tbody className="divide-y">
              {students.map(s => {
                const reg = presences.find(p => p.alunoId === s.id && p.dataISO === dia);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-6 font-bold text-gray-700">{s.nome}</td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black ${reg ? (reg.presente ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-gray-100 text-gray-400'}`}>
                        {reg ? (reg.presente ? 'PRESENTE' : 'FALTA') : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="p-6 flex gap-2 justify-end">
                      <button onClick={() => {
                        const idx = presences.findIndex(p => p.alunoId === s.id && p.dataISO === dia);
                        if(idx >= 0) {
                          const up = [...presences]; up[idx].presente = true; setPresences(up);
                        } else {
                          setPresences([...presences, { id:`pr-${Date.now()}`, alunoId:s.id, dataISO:dia, presente:true, registradoPorNome:currentUser?.nome || 'Anônimo', papel:currentUser?.papel || 'visitante', criadoEm:new Date().toISOString() }]);
                        }
                      }} className="w-10 h-10 bg-green-500 text-white rounded-lg font-black hover:bg-green-600 shadow-md">P</button>
                      <button onClick={() => {
                        const idx = presences.findIndex(p => p.alunoId === s.id && p.dataISO === dia);
                        if(idx >= 0) {
                          const up = [...presences]; up[idx].presente = false; setPresences(up);
                        } else {
                          setPresences([...presences, { id:`pr-${Date.now()}`, alunoId:s.id, dataISO:dia, presente:false, registradoPorNome:currentUser?.nome || 'Anônimo', papel:currentUser?.papel || 'visitante', criadoEm:new Date().toISOString() }]);
                        }
                      }} className="w-10 h-10 bg-red-500 text-white rounded-lg font-black hover:bg-red-600 shadow-md">F</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AreaContainer>
    );
  };

  const OfertaArea = () => {
    const [ofForm, setOfForm] = useState({ cat: 'oferta' as const, tipo: 'entrada' as const, valor: '', obs: '' });
    return (
      <AreaContainer title="Tesouraria" icon={DollarSign}>
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          <div className="bg-green-50/50 p-8 rounded-[2.5rem] border-2 border-white space-y-4 shadow-inner">
            <h3 className="font-black text-green-700 flex items-center gap-2 text-xl"><PlusCircle /> Novo Lançamento</h3>
            <div className="grid grid-cols-2 gap-4">
              <select value={ofForm.cat} onChange={e => setOfForm({...ofForm, cat: e.target.value as any})} className="p-4 rounded-xl border-2 font-bold">
                <option value="oferta">OFERTA</option><option value="gasto">GASTO</option>
              </select>
              <select value={ofForm.tipo} onChange={e => setOfForm({...ofForm, tipo: e.target.value as any})} className="p-4 rounded-xl border-2 font-bold">
                <option value="entrada">ENTRADA</option><option value="saida">SAÍDA</option>
              </select>
            </div>
            <input type="number" value={ofForm.valor} onChange={e => setOfForm({...ofForm, valor: e.target.value})} placeholder="R$ 0,00" className="w-full p-4 rounded-xl border-2 font-black text-2xl outline-none" />
            <input value={ofForm.obs} onChange={e => setOfForm({...ofForm, obs: e.target.value})} placeholder="Observação (opcional)" className="w-full p-4 rounded-xl border-2 outline-none" />
            <button onClick={() => {
              const val = parseFloat(ofForm.valor);
              if(isNaN(val) || val <= 0) return alert('Informe um valor válido!');
              setOfferings([{ id: `of-${Date.now()}`, ...ofForm, valor: val, criadoEm: new Date().toISOString(), registradoPorNome: currentUser?.nome || 'Anônimo', papel: currentUser?.papel || 'visitante' } as any, ...offerings]);
              setOfForm({ cat: 'oferta', tipo: 'entrada', valor: '', obs: '' });
              alert('Lançamento registrado!');
            }} className="w-full bg-green-600 text-white p-5 rounded-xl font-black text-xl shadow-xl hover:bg-green-700">LANÇAR NO SISTEMA</button>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-center text-center space-y-4">
            <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs">Saldo Atual do Ministério</h3>
            <p className={`text-6xl font-black ${financeTotals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {financeTotals.balance.toFixed(2)}
            </p>
            <div className="flex justify-around pt-6 border-t-2 border-dashed border-gray-50">
              <div><p className="text-[10px] font-black text-gray-400">ENTRADAS</p><p className="text-green-500 font-bold">R$ {financeTotals.entries.toFixed(2)}</p></div>
              <div><p className="text-[10px] font-black text-gray-400">SAÍDAS</p><p className="text-red-500 font-bold">R$ {financeTotals.exits.toFixed(2)}</p></div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-[2rem] border border-gray-100 shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50"><tr className="border-b"><th className="p-6 font-black uppercase text-xs text-gray-400">Data</th><th className="p-6 font-black uppercase text-xs text-gray-400">Descrição</th><th className="p-6 font-black uppercase text-xs text-gray-400 text-right">Valor</th></tr></thead>
            <tbody className="divide-y">
              {offerings.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="p-6 text-xs font-bold text-gray-400">{new Date(o.criadoEm).toLocaleDateString()}</td>
                  <td className="p-6">
                    <p className="font-black text-indigo-900 text-xs uppercase">{o.categoria} • {o.tipo}</p>
                    <p className="text-[10px] text-gray-400">{o.obs || 'Sem observação'}</p>
                  </td>
                  <td className={`p-6 text-right font-black text-lg ${o.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {o.tipo === 'entrada' ? '+' : '-'} R$ {o.valor.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AreaContainer>
    );
  };

  const FeedArea = () => {
    const [msg, setMsg] = useState({ texto: '', publico: false, tipo: 'aviso' as const, mencoes: '' });
    return (
      <AreaContainer title={profileFilter ? `Postagens de ${profileFilter}` : "Feed de Notícias"} icon={Newspaper}>
        {profileFilter && (
          <div className="mb-8 flex items-center justify-between bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center font-black text-2xl">{profileFilter[0]}</div>
              <p className="font-black text-xl">Mostrando apenas: {profileFilter}</p>
            </div>
            <button onClick={() => setProfileFilter(null)} className="flex items-center gap-2 bg-white/20 px-6 py-2 rounded-xl text-sm font-black hover:bg-white/30 transition-all uppercase tracking-tighter"><X /> Limpar</button>
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-cyan-50 shadow-xl sticky top-28 space-y-4">
              <h3 className="font-black text-cyan-600 flex items-center gap-2 text-xl"><PlusCircle /> Novo Post</h3>
              <textarea value={msg.texto} onChange={e => setMsg({...msg, texto: e.target.value})} className="w-full p-4 border-2 rounded-2xl bg-gray-50 h-40 resize-none outline-none focus:ring-4 ring-cyan-50" placeholder="O que deseja compartilhar?" />
              <select value={msg.tipo} onChange={e => setMsg({...msg, tipo: e.target.value as any})} className="w-full p-4 border-2 rounded-xl bg-white font-bold">
                <option value="aviso">📢 AVISO</option><option value="evento">🎉 EVENTO</option><option value="escala">📋 ESCALA</option>
              </select>
              <input value={msg.mencoes} onChange={e => setMsg({...msg, mencoes: e.target.value})} placeholder="Marcar pessoas (separar por vírgula)" className="w-full p-4 border-2 rounded-xl outline-none" />
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-xl transition-all">
                <input type="checkbox" checked={msg.publico} onChange={e => setMsg({...msg, publico: e.target.checked})} className="w-5 h-5 accent-cyan-600" /> 
                <span className="text-xs font-black text-gray-500 uppercase">Tornar Público (Mural)</span>
              </label>
              <button onClick={() => {
                if(!msg.texto) return alert('O post está vazio!');
                setFeed([{ id: `fd-${Date.now()}`, ...msg, mencionados: msg.mencoes.split(',').map(s=>s.trim()).filter(Boolean), criadoEm: new Date().toISOString(), criadoPorNome: currentUser?.nome || 'Visitante', reacoes: { gostei: 0, coracao: 0, festa: 0 }, comentarios: [], usuariosQueReagiram: {} }, ...feed]);
                setMsg({ texto: '', publico: false, tipo: 'aviso', mencoes: '' });
                alert('Publicado com sucesso!');
              }} className="w-full bg-cyan-600 text-white p-5 rounded-xl font-black text-xl shadow-xl hover:bg-cyan-700 transition-all">PUBLICAR</button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-10">
            {visibleFeed.map(item => <FeedCard key={item.id} item={item} />)}
            {visibleFeed.length === 0 && <div className="text-center py-40 border-4 border-dashed rounded-[4rem] text-gray-300 font-black text-2xl uppercase tracking-[0.2em]">Nada para mostrar aqui</div>}
          </div>
        </div>
      </AreaContainer>
    );
  };

  const LiderArea = () => {
    const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
    if (currentUser?.papel !== 'lider') {
      return (
        <AreaContainer title="Espaço Liderança" icon={ShieldCheck}>
          <div className="max-w-md mx-auto space-y-6 text-center py-20">
            <ShieldCheck size={80} className="mx-auto text-purple-600 mb-6" />
            <input value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full p-5 border-2 rounded-2xl text-center text-xl font-bold" placeholder="E-mail do Coordenador" />
            <input type="password" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full p-5 border-2 rounded-2xl text-center text-xl font-bold" placeholder="Senha" />
            <button onClick={() => handleLogin('lider', loginForm.email)} className="w-full p-5 bg-purple-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:bg-purple-700 transition-all">ACESSAR PAINEL</button>
          </div>
        </AreaContainer>
      );
    }
    return (
      <AreaContainer title="Painel de Controle" icon={ShieldCheck}>
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="p-8 bg-green-50 rounded-[2.5rem] border-4 border-white shadow-lg text-center"><h4 className="font-black text-green-800 mb-2 uppercase text-xs">Caixa Geral</h4><p className="text-4xl font-black text-green-600">R$ {financeTotals.balance.toFixed(2)}</p></div>
          <div className="p-8 bg-indigo-50 rounded-[2.5rem] border-4 border-white shadow-lg text-center"><h4 className="font-black text-indigo-800 mb-2 uppercase text-xs">Crianças</h4><p className="text-4xl font-black text-indigo-600">{students.length}</p></div>
          <div className="p-8 bg-pink-50 rounded-[2.5rem] border-4 border-white shadow-lg flex items-center justify-center"><button onClick={handleLogout} className="bg-white px-8 py-3 rounded-2xl text-red-600 font-black shadow-md flex items-center gap-2 hover:bg-red-50"><LogOut size={20} /> SAIR</button></div>
        </div>
        <div className="bg-gray-50 p-10 rounded-[3rem] border-2 border-white shadow-inner mb-12">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Database /> Gestão do Banco de Dados</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={handleExportDB} className="bg-white p-6 rounded-2xl border flex items-center justify-between font-bold hover:shadow-lg transition-all"><div className="text-left"><p className="text-indigo-600">Baixar Backup</p><p className="text-[10px] text-gray-400 font-normal">Cria um arquivo JSON com todas as informações atuais.</p></div><Download className="text-indigo-600" /></button>
            <label className="bg-white p-6 rounded-2xl border flex items-center justify-between font-bold cursor-pointer hover:shadow-lg transition-all"><div className="text-left"><p className="text-green-600">Restaurar Dados</p><p className="text-[10px] text-gray-400 font-normal">Substitui os dados atuais por um arquivo de backup.</p></div><UploadCloud className="text-green-600" /><input type="file" accept=".json" onChange={handleImportDB} className="hidden" /></label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl"><h4 className="font-black text-xl mb-6 uppercase text-gray-400 tracking-widest">Registros de Fichas</h4><ul className="space-y-3">{registrations.map(r => <li key={r.id} className="p-4 bg-gray-50 rounded-xl text-sm font-bold text-gray-600 flex justify-between"><span>{r.nome}</span><span className="text-[10px] opacity-50">{r.tel}</span></li>)}{registrations.length === 0 && <li className="text-gray-300 italic">Nenhuma ficha enviada.</li>}</ul></div>
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl"><h4 className="font-black text-xl mb-6 uppercase text-gray-400 tracking-widest">Ações Rápidas</h4><div className="grid grid-cols-2 gap-4"><button onClick={() => setCurrentArea('presenca')} className="bg-indigo-600 text-white p-4 rounded-xl font-black shadow-md hover:scale-105 transition-transform">CHAMADA</button><button onClick={() => setCurrentArea('oferta')} className="bg-green-600 text-white p-4 rounded-xl font-black shadow-md hover:scale-105 transition-transform">FINANCEIRO</button><button onClick={() => setCurrentArea('feed')} className="bg-cyan-600 text-white p-4 rounded-xl font-black shadow-md hover:scale-105 transition-transform">SOCIAL</button><button onClick={() => setCurrentArea('home')} className="bg-gray-200 text-gray-600 p-4 rounded-xl font-black shadow-md hover:scale-105 transition-transform">INÍCIO</button></div></div>
        </div>
      </AreaContainer>
    );
  };

  const Home = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="inline-block p-2 px-8 mb-8 rounded-full bg-white/20 border-2 border-white/30 backdrop-blur-xl animate-pulse"><p className="text-white font-black text-xs uppercase tracking-[0.4em]">Portal Ministério Infantil</p></div>
        <p className="text-4xl md:text-7xl italic text-white drop-shadow-2xl font-black mb-16 leading-[1.1] max-w-4xl mx-auto">"Ensina a criança no caminho em que deve andar..."<span className="text-2xl font-bold block mt-8 opacity-90 not-italic tracking-[0.3em] uppercase">— Provérbios 22:6</span></p>
        <button onClick={() => document.getElementById('main-menu')?.scrollIntoView({ behavior: 'smooth' })} className="group relative bg-white text-[#4B1E6D] px-16 md:px-24 py-6 md:py-8 rounded-full text-2xl md:text-3xl font-black shadow-2xl hover:scale-110 hover:-rotate-2 transition-all active:scale-95 overflow-hidden"><span className="relative z-10">ABRIR PORTAL</span><div className="absolute inset-0 bg-gradient-to-r from-pink-50 to-indigo-50 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div></button>
      </div>
      <div id="main-menu" className="scroll-mt-40 grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 mb-20">
        <button onClick={() => setCurrentArea('pais')} className="p-8 bg-orange-400 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><Users size={40} /> PAIS</button>
        <button onClick={() => setCurrentArea('lider')} className="p-8 bg-purple-600 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><ShieldCheck size={40} /> LÍDER</button>
        <button onClick={() => setCurrentArea('auxiliar')} className="p-8 bg-blue-500 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><UserPlus size={40} /> AUXILIAR</button>
        <button onClick={() => setCurrentArea('oferta')} className="p-8 bg-green-500 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><DollarSign size={40} /> OFERTA</button>
        <button onClick={() => { setProfileFilter(null); setCurrentArea('feed'); }} className="p-8 bg-cyan-400 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><Newspaper size={40} /> FEED</button>
        <button onClick={() => setCurrentArea('arquivos')} className="p-8 bg-yellow-500 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><Folder size={40} /> ARQUIVOS</button>
        <button onClick={() => setCurrentArea('presenca')} className="p-8 bg-indigo-500 text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black hover:-translate-y-2 transition-all"><CheckCircle size={40} /> PRESENÇA</button>
      </div>
      <Mural />
      <footer className="mt-40 text-center space-y-4 pb-10">
        <div className="inline-block px-8 py-3 bg-black/10 backdrop-blur-lg rounded-full text-white/70 text-[10px] font-black uppercase tracking-[0.4em]">MCI Kids • Feito com Amor • 2024</div>
      </footer>
    </div>
  );

  const Mural = () => (
    <section className="bg-white/90 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] shadow-2xl mt-12 border-b-8 border-[#4B1E6D]/10">
      <h2 className="text-3xl font-black mb-10 flex items-center gap-3 text-[#4B1E6D] uppercase tracking-tighter"><Megaphone className="text-pink-600 animate-bounce" /> Mural do Ministério</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {publicFeed.length === 0 ? <p className="text-gray-400 font-bold italic py-12 text-center col-span-full">Nenhum aviso no momento.</p> : publicFeed.slice(0, 6).map(item => <FeedCard key={item.id} item={item} />)}
      </div>
    </section>
  );

  if (isInitializing) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white font-black">
      <div className="relative mb-8">
        <RefreshCw className="animate-spin" size={64} />
        <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" size={24} />
      </div>
      <p className="text-2xl animate-pulse tracking-[0.2em] uppercase">Conectando ao Banco de Dados...</p>
    </div>
  );

  return (
    <div className="min-h-screen pb-40 selection:bg-pink-300 selection:text-[#4B1E6D]">
      <Header />
      <main className="container mx-auto px-4 max-w-7xl">
        {currentArea === 'home' && <Home />}
        {currentArea === 'pais' && <PaisArea />}
        {currentArea === 'lider' && <LiderArea />}
        {currentArea === 'auxiliar' && <AuxiliarArea />}
        {currentArea === 'presenca' && <PresencaArea />}
        {currentArea === 'oferta' && <OfertaArea />}
        {currentArea === 'feed' && <FeedArea />}
        {currentArea === 'arquivos' && (
          <AreaContainer title="Biblioteca de Arquivos" icon={Folder}>
            <div className="py-24 text-center group">
              <Folder size={100} className="mx-auto text-yellow-500 mb-6 group-hover:scale-125 transition-transform duration-500" />
              <p className="text-2xl font-black uppercase text-gray-400 tracking-tighter">Módulo de Arquivos em Desenvolvimento</p>
              <p className="text-gray-400 mt-4 max-w-md mx-auto">Em breve você poderá salvar e baixar lições bíblicas, escalas de serviço e certificados.</p>
            </div>
          </AreaContainer>
        )}
      </main>
    </div>
  );
};

export default App;
