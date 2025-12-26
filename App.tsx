
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, ShieldCheck, UserPlus, DollarSign, Newspaper, Folder, CheckCircle,
  Megaphone, LogOut, Save, PlusCircle, Trash2, Edit, Download, Lock, Unlock,
  MessageSquare, ThumbsUp, Heart, PartyPopper, Share2, Send, Eye, EyeOff,
  Bell, User as UserIcon, X, Database, RefreshCw, UploadCloud
} from 'lucide-react';
import { 
  Role, User, Student, Presence, Offering, FeedItem, FileEntry, Registration, Area, Comment
} from './types';
import { INITIAL_STUDENTS } from './constants';
import { db, DatabaseSchema } from './db';

const App: React.FC = () => {
  // --- Core State ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentArea, setCurrentArea] = useState<Area | 'home'>('home');
  
  // Data State
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  // Settings & Closing
  const [accumulatedBalance, setAccumulatedBalance] = useState(0);
  const [lastMonthClosure, setLastMonthClosure] = useState<string | null>(null);
  const [presenceClosedAt, setPresenceClosedAt] = useState<string | null>(null);
  const [allowEditsAfterClosure, setAllowEditsAfterClosure] = useState(false);

  // Profile Filter
  const [profileFilter, setProfileFilter] = useState<string | null>(null);

  // --- Database Sync ---
  
  // Load initial data
  useEffect(() => {
    const initDB = async () => {
      const data = await db.load();
      if (data) {
        setStudents(data.students);
        setPresences(data.presences);
        setOfferings(data.offerings);
        setFeed(data.feed);
        setFiles(data.files);
        setRegistrations(data.registrations);
        setAccumulatedBalance(data.settings.accumulatedBalance);
        setLastMonthClosure(data.settings.lastMonthClosure);
        setPresenceClosedAt(data.settings.presenceClosedAt);
        setAllowEditsAfterClosure(data.settings.allowEditsAfterClosure);
      }
      setIsInitializing(false);
    };
    initDB();
  }, []);

  // Auto-save on changes
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

    const timeout = setTimeout(saveData, 1000); // Debounce saves
    return () => clearTimeout(timeout);
  }, [students, presences, offerings, feed, files, registrations, accumulatedBalance, lastMonthClosure, presenceClosedAt, allowEditsAfterClosure, isInitializing]);

  // --- Handlers ---
  const handleLogin = (role: Role, email?: string, name?: string) => {
    if (role === 'lider') {
      setCurrentUser({ uid: 'lider-1', nome: 'Líder', papel: 'lider' });
    } else if (role === 'auxiliar') {
      if (!name) return alert('Informe seu nome.');
      setCurrentUser({ uid: `aux-${Date.now()}`, nome: name, papel: 'auxiliar' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentArea('home');
    setProfileFilter(null);
  };

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
        const data = JSON.parse(event.target?.result as string) as DatabaseSchema;
        if (confirm("Isso irá substituir todos os dados atuais. Confirmar restauração?")) {
          setStudents(data.students);
          setPresences(data.presences);
          setOfferings(data.offerings);
          setFeed(data.feed);
          setFiles(data.files);
          setRegistrations(data.registrations);
          setAccumulatedBalance(data.settings.accumulatedBalance);
          setLastMonthClosure(data.settings.lastMonthClosure);
          setPresenceClosedAt(data.settings.presenceClosedAt);
          setAllowEditsAfterClosure(data.settings.allowEditsAfterClosure);
          alert("Banco de dados restaurado!");
        }
      } catch (err) {
        alert("Erro ao importar arquivo.");
      }
    };
    reader.readAsText(file);
  };

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

  // --- Filters ---
  const financeTotals = useMemo(() => {
    const entries = offerings.filter(o => o.categoria === 'oferta' && o.tipo === 'entrada').reduce((s, o) => s + o.valor, 0);
    const exits = offerings.filter(o => o.categoria === 'oferta' && o.tipo === 'saida').reduce((s, o) => s + o.valor, 0);
    return { entries, exits, balance: entries - exits };
  }, [offerings]);

  const visibleFeed = useMemo(() => {
    const name = currentUser?.nome?.toLowerCase() || '';
    let filtered = [...feed].sort((a, b) => b.criadoEm.localeCompare(a.criromanceEm));
    if (profileFilter) filtered = filtered.filter(item => item.criadoPorNome === profileFilter);
    if (currentUser?.papel === 'lider') return filtered;
    return filtered.filter(item => item.publico || item.mencionados.some(m => m.toLowerCase() === name) || item.criadoPorNome === currentUser?.nome);
  }, [feed, currentUser, profileFilter]);

  const publicFeed = useMemo(() => {
    return feed.filter(f => f.publico).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [feed]);

  // --- UI Sub-Components ---

  const Header = () => (
    <header className="bg-[#4B1E6D]/95 text-white p-6 text-center shadow-lg sticky top-0 z-50">
      <div className="flex flex-col items-center gap-2 relative">
        <div className="absolute right-0 top-0 hidden md:flex items-center gap-2 px-4 py-2 bg-black/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
          {isSaving ? <RefreshCw className="animate-spin" size={12} /> : <Database size={12} className="text-green-400" />}
          {isSaving ? 'Sincronizando...' : 'Conectado'}
        </div>

        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-inner overflow-hidden border-2 border-white">
          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.uid || 'guest'}`} alt="MCI Kids" className="rounded-full" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">MCI Kids - Ministério Infantil</h1>
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
        setTimeout(() => setShowHeart(false), 1000);
      }
      lastTap.current = now;
    };

    const userReaction = currentUser ? item.usuariosQueReagiram?.[currentUser.uid] : null;

    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 group relative">
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Heart size={100} className="text-white fill-pink-500 animate-ping opacity-75" />
          </div>
        )}

        <div className="p-6 pb-2" onClick={handleDoubleTap}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <button onClick={(e) => { e.stopPropagation(); setProfileFilter(item.criadoPorNome); setCurrentArea('feed'); }} className="w-12 h-12 bg-gradient-to-br from-[#4B1E6D] to-pink-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-md">
                {item.criadoPorNome[0]}
              </button>
              <div>
                <button onClick={(e) => { e.stopPropagation(); setProfileFilter(item.criadoPorNome); setCurrentArea('feed'); }} className="font-bold text-lg text-gray-800 leading-none hover:text-[#4B1E6D] flex items-center gap-1">
                  {item.criadoPorNome} <UserIcon size={14} className="opacity-40" />
                </button>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{new Date(item.criadoEm).toLocaleString()}</p>
              </div>
            </div>
            {/* Fix: Resolved syntax error in ternary operator for tag styling */}
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${item.tipo === 'evento' ? 'bg-pink-100 text-pink-600 border-pink-200' : item.tipo === 'escala' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-cyan-100 text-cyan-600 border-cyan-200'}`}>
              {item.tipo.toUpperCase()}
            </span>
          </div>
          <p className="mt-4 text-gray-700 text-lg leading-relaxed">{item.texto}</p>
        </div>

        <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 border-y gap-4">
          <div className="flex gap-4">
            <button onClick={() => handleReaction(item.id, 'gostei')} className={`flex items-center gap-1 ${userReaction === 'gostei' ? 'text-cyan-600' : 'text-gray-400'}`}><ThumbsUp size={22} /><span className="text-sm font-black">{item.reacoes.gostei}</span></button>
            <button onClick={() => handleReaction(item.id, 'coracao')} className={`flex items-center gap-1 ${userReaction === 'coracao' ? 'text-pink-600' : 'text-gray-400'}`}><Heart size={22} /><span className="text-sm font-black">{item.reacoes.coracao}</span></button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(item.texto); alert('Copiado!'); }} className="text-gray-400"><Share2 size={20} /></button>
        </div>

        <div className="p-4 space-y-3 bg-white">
          {item.comentarios?.map((c, idx) => (
            <div key={idx} className="bg-gray-100/70 p-3 rounded-2xl text-sm"><span className="font-black text-indigo-900 mr-2">{c.nome}</span>{c.texto}</div>
          ))}
          <div className="flex gap-2">
            <input value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (handleAddComment(item.id, commentInput), setCommentInput(''))} placeholder="Adicione um comentário..." className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2 text-sm outline-none" />
            <button onClick={() => { handleAddComment(item.id, commentInput); setCommentInput(''); }} className="w-10 h-10 bg-[#4B1E6D] text-white rounded-full flex items-center justify-center"><Send size={18} /></button>
          </div>
        </div>
      </div>
    );
  };

  const AreaContainer = ({ title, children, icon: Icon }: any) => (
    <div className="bg-white/95 p-6 md:p-10 rounded-[3rem] shadow-2xl mt-12 max-w-6xl mx-auto border-8 border-[#4B1E6D]/5 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b-4 border-gray-50 pb-6 gap-6">
        <h2 className="text-4xl font-black flex items-center gap-4 text-[#4B1E6D]">{Icon && <Icon size={48} className="text-pink-500" />} {title}</h2>
        <button onClick={() => { setCurrentArea('home'); setProfileFilter(null); }} className="bg-gray-100 px-8 py-3 rounded-2xl text-gray-700 font-black">VOLTAR</button>
      </div>
      {children}
    </div>
  );

  const LiderArea = () => {
    const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
    if (currentUser?.papel !== 'lider') {
      return (
        <AreaContainer title="Acesso Reservado" icon={ShieldCheck}>
          <div className="max-w-md mx-auto space-y-6 text-center">
            <input value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full p-5 border-2 rounded-2xl text-center text-xl font-bold" placeholder="E-mail" />
            <input type="password" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full p-5 border-2 rounded-2xl text-center text-xl font-bold" placeholder="Senha" />
            <button onClick={() => handleLogin('lider', loginForm.email)} className="w-full p-5 bg-purple-600 text-white rounded-2xl font-black text-2xl shadow-xl">ENTRAR</button>
          </div>
        </AreaContainer>
      );
    }
    return (
      <AreaContainer title="Painel Coordenador" icon={ShieldCheck}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="p-8 bg-green-50 rounded-[2.5rem] border-4 border-white shadow-lg"><h4 className="font-black text-green-800 mb-2 uppercase text-xs">Saldo Ministério</h4><p className="text-4xl font-black text-green-600">R$ {financeTotals.balance.toFixed(2)}</p></div>
          <div className="p-8 bg-indigo-50 rounded-[2.5rem] border-4 border-white shadow-lg"><h4 className="font-black text-indigo-800 mb-2 uppercase text-xs">Alunos Ativos</h4><p className="text-4xl font-black text-indigo-600">{students.length}</p></div>
          <div className="p-8 bg-pink-50 rounded-[2.5rem] border-4 border-white shadow-lg flex items-center justify-center"><button onClick={handleLogout} className="bg-white px-8 py-3 rounded-2xl text-red-600 font-black shadow-md"><LogOut size={20} /></button></div>
        </div>

        <div className="bg-gray-100 p-8 rounded-[3rem] mb-12 border-4 border-white">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Database /> Gestão do Banco de Dados</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={handleExportDB} className="bg-white p-6 rounded-2xl border flex items-center justify-between font-bold hover:bg-indigo-50 transition-colors">
              <div><p className="text-indigo-600">Baixar Backup (JSON)</p><p className="text-xs text-gray-400 font-normal">Salve todas as informações em seu computador.</p></div>
              <Download className="text-indigo-600" />
            </button>
            <label className="bg-white p-6 rounded-2xl border flex items-center justify-between font-bold cursor-pointer hover:bg-green-50 transition-colors">
              <div><p className="text-green-600">Restaurar Banco de Dados</p><p className="text-xs text-gray-400 font-normal">Subir um arquivo de backup anterior.</p></div>
              <UploadCloud className="text-green-600" />
              <input type="file" accept=".json" onChange={handleImportDB} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-white p-10 rounded-[3rem] border shadow-xl"><h4 className="font-black text-2xl mb-8 uppercase">Ações Rápidas</h4>
            <div className="grid gap-4">
              <button onClick={() => setCurrentArea('presenca')} className="bg-indigo-50 p-5 rounded-2xl font-black text-indigo-700 text-left">CHAMADA</button>
              <button onClick={() => setCurrentArea('oferta')} className="bg-green-50 p-5 rounded-2xl font-black text-green-700 text-left">FINANCEIRO</button>
            </div>
          </div>
          <div className="space-y-6"><h4 className="font-black text-2xl uppercase">Feed Recente</h4>{visibleFeed.slice(0, 2).map(item => <FeedCard key={item.id} item={item} />)}</div>
        </div>
      </AreaContainer>
    );
  };

  const PaisArea = () => (
    <AreaContainer title="Área dos Pais" icon={Users}>
      <div className="p-20 text-center">
        <Users size={80} className="mx-auto text-blue-500 mb-6" />
        <p className="text-2xl font-black uppercase">Informações para os Pais em breve</p>
      </div>
    </AreaContainer>
  );

  const AuxiliarArea = () => (
    <AreaContainer title="Área do Auxiliar" icon={UserPlus}>
      <div className="p-20 text-center">
        <UserPlus size={80} className="mx-auto text-green-500 mb-6" />
        <p className="text-2xl font-black uppercase">Painel do Auxiliar em breve</p>
      </div>
    </AreaContainer>
  );

  const PresencaArea = () => (
    <AreaContainer title="Chamada" icon={CheckCircle}>
      <div className="p-20 text-center">
        <CheckCircle size={80} className="mx-auto text-indigo-500 mb-6" />
        <p className="text-2xl font-black uppercase">Sistema de Presença em breve</p>
      </div>
    </AreaContainer>
  );

  const OfertaArea = () => (
    <AreaContainer title="Financeiro" icon={DollarSign}>
      <div className="p-20 text-center">
        <DollarSign size={80} className="mx-auto text-emerald-500 mb-6" />
        <p className="text-2xl font-black uppercase">Controle Financeiro em breve</p>
      </div>
    </AreaContainer>
  );

  const FeedArea = () => (
    <AreaContainer title="Feed de Notícias" icon={Newspaper}>
      <div className="space-y-6">
        {visibleFeed.map(item => <FeedCard key={item.id} item={item} />)}
      </div>
    </AreaContainer>
  );

  const Home = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-24">
        <p className="text-4xl md:text-7xl italic text-white drop-shadow-2xl font-black mb-20 leading-[1.1] max-w-4xl mx-auto">"Ensina a criança no caminho em que deve andar..."<span className="text-2xl font-bold block mt-8 opacity-90 not-italic tracking-[0.3em] uppercase">— Provérbios 22:6</span></p>
        <button onClick={() => document.getElementById('main-menu')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white text-[#4B1E6D] px-20 py-8 rounded-full text-3xl font-black shadow-2xl hover:scale-110 transition-all">ENTRAR NO PORTAL</button>
      </div>
      <div id="main-menu" className="scroll-mt-40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          {['pais','lider','auxiliar','oferta','feed','arquivos','presenca'].map(area => (
            <button key={area} onClick={() => setCurrentArea(area as any)} className="p-8 bg-white/20 backdrop-blur-md text-white rounded-[2.5rem] shadow-xl flex flex-col items-center gap-3 font-black uppercase hover:bg-white/30 transition-all">
              {area === 'pais' && <Users size={40} />}
              {area === 'lider' && <ShieldCheck size={40} />}
              {area === 'auxiliar' && <UserPlus size={40} />}
              {area === 'oferta' && <DollarSign size={40} />}
              {area === 'feed' && <Newspaper size={40} />}
              {area === 'arquivos' && <Folder size={40} />}
              {area === 'presenca' && <CheckCircle size={40} />}
              <span className="text-sm">{area}</span>
            </button>
          ))}
        </div>
      </div>
      <Mural />
    </div>
  );

  const Mural = () => (
    <section className="bg-white/90 p-12 rounded-[4rem] shadow-2xl mt-12 border-b-8 border-[#4B1E6D]/10">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-[#4B1E6D] uppercase tracking-tighter"><Megaphone className="text-pink-600 animate-bounce" /> Mural do Ministério</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {publicFeed.length === 0 ? <p className="text-gray-400 font-bold italic py-12">Nenhum aviso no momento.</p> : publicFeed.slice(0, 3).map(item => <FeedCard key={item.id} item={item} />)}
      </div>
    </section>
  );

  if (isInitializing) return <div className="min-h-screen flex flex-col items-center justify-center text-white font-black"><RefreshCw className="animate-spin mb-4" size={48} /><p>CONECTANDO AO BANCO DE DADOS...</p></div>;

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
        {currentArea === 'arquivos' && <AreaContainer title="Arquivos" icon={Folder}><div className="p-20 text-center"><Folder size={80} className="mx-auto text-yellow-500 mb-6" /><p className="text-2xl font-black uppercase">Biblioteca em construção</p></div></AreaContainer>}
      </main>
    </div>
  );
};

export default App;
