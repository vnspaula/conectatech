import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, MapPin, Clock, Users, Search, Heart, Share2, 
  Star, User as UserIcon, LogOut, Plus, Filter, Sparkles, CheckCircle, 
  Bookmark, Compass, Settings, Bell, ExternalLink, Lock, Mail, Globe, 
  Building, Award, MessageSquare, Menu, X, ChevronRight, CalendarDays, ArrowLeft, Send
} from 'lucide-react';
import { auth, googleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from './lib/firebase.ts';
import { EventItem, UserProfile, ReviewItem } from './types.ts';

const CATEGORIES = [
  "Todos",
  "Inteligência Artificial",
  "Dados",
  "Cloud",
  "DevOps",
  "UX/UI",
  "Desenvolvimento Web",
  "Mobile",
  "Segurança",
  "Carreira"
];

const STATES = ["Todos", "SP", "RJ", "SC", "PR", "MG", "DF", "RS"];

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App Navigation & State
  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'calendar' | 'profile' | 'organizer'>('home');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCity, setRegCity] = useState('São Paulo');
  const [regState, setRegState] = useState('SP');
  const [regInterests, setRegInterests] = useState<string[]>(['Inteligência Artificial', 'Desenvolvimento Web']);

  // Events & Data State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [favorites, setFavorites] = useState<EventItem[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedState, setSelectedState] = useState('Todos');
  const [selectedModality, setSelectedModality] = useState('Todas');
  const [selectedPriceType, setSelectedPriceType] = useState('Todos');

  // AI Recommendation
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Networking & Reviews
  const [networkingUsers, setNetworkingUsers] = useState<any[]>([]);
  const [eventReviews, setEventReviews] = useState<ReviewItem[]>([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  // Organizer Create Event State
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    description: '',
    banner: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1200',
    date: '2026-08-15',
    time: '18:30',
    city: 'São Paulo',
    state: 'SP',
    address: 'Av. Paulista, 1000',
    modality: 'Presencial' as 'Online' | 'Presencial',
    priceType: 'Gratuito' as 'Gratuito' | 'Pago',
    price: 'Gratuito',
    capacity: 150,
    category: 'Inteligência Artificial'
  });

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const idToken = await user.getIdToken();
        setToken(idToken);
        fetchUserProfile(idToken);
      } else {
        setToken(null);
        setDbUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (idToken: string) => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
        fetchUserFavorites(idToken);
        fetchUserRegistrations(idToken);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchUserFavorites = async (idToken: string) => {
    try {
      const res = await fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  };

  const fetchUserRegistrations = async (idToken: string) => {
    try {
      const res = await fetch('/api/my-registrations', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyRegistrations(data);
      }
    } catch (err) {
      console.error("Error fetching registrations:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      setShowAuthModal(false);
      showToast("Login com Google realizado com sucesso!");
    } catch (err: any) {
      console.error("Google login error:", err);
      showToast("Erro ao fazer login com Google.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setShowAuthModal(false);
      showToast("Login realizado com sucesso!");
    } catch (err: any) {
      console.error("Email login error:", err);
      showToast("Credenciais inválidas ou usuário não encontrado.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      await updateProfile(cred.user, { displayName: regName });
      
      const idToken = await cred.user.getIdToken();
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: regName,
          city: regCity,
          state: regState,
          interests: regInterests
        })
      });

      setShowAuthModal(false);
      showToast("Conta criada com sucesso! Bem-vindo ao ConectaTech.");
    } catch (err: any) {
      console.error("Register error:", err);
      showToast("Erro ao criar conta. Verifique os dados.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setDbUser(null);
    setFavorites([]);
    setMyRegistrations([]);
    showToast("Sessão encerrada com sucesso.");
  };

  const toggleFavorite = async (event: EventItem) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    const isFav = favorites.some(f => f.id === event.id);
    try {
      if (isFav) {
        await fetch(`/api/favorites/${event.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(favorites.filter(f => f.id !== event.id));
        showToast("Removido dos favoritos.");
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: event.id })
        });
        setFavorites([...favorites, event]);
        showToast("Adicionado aos favoritos!");
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const registerForEvent = async (event: EventItem) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    const isRegistered = myRegistrations.some(r => r.id === event.id);
    try {
      if (isRegistered) {
        await fetch(`/api/events/${event.id}/register`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMyRegistrations(myRegistrations.filter(r => r.id !== event.id));
        showToast("Inscrição cancelada com sucesso.");
      } else {
        await fetch(`/api/events/${event.id}/register`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setMyRegistrations([...myRegistrations, event]);
        showToast("Inscrição realizada com sucesso! Nos vemos lá.");
      }
      fetchEvents();
    } catch (err) {
      console.error("Error updating registration:", err);
    }
  };

  const fetchAiRecommendation = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    try {
      setLoadingAi(true);
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAiRecommendation(data.recommendation);
    } catch (err) {
      console.error("Error AI recommendation:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetch(`/api/events/${selectedEvent.id}/reviews`)
        .then(res => res.json())
        .then(data => setEventReviews(data))
        .catch(err => console.error(err));

      fetch('/api/networking/suggestions', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => setNetworkingUsers(data))
        .catch(err => console.error(err));
    }
  }, [selectedEvent]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEvent) return;
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newReviewRating, comment: newComment })
      });
      if (res.ok) {
        showToast("Avaliação enviada com sucesso!");
        setNewComment('');
        const revRes = await fetch(`/api/events/${selectedEvent.id}/reviews`);
        setEventReviews(await revRes.json());
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    }
  };

  const createNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEventForm)
      });
      if (res.ok) {
        showToast("Evento criado com sucesso!");
        fetchEvents();
        setCurrentTab('home');
      } else {
        showToast("Erro ao criar evento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEvents = events.filter(ev => {
    const matchesSearch = searchQuery === '' || 
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Todos' || ev.category === selectedCategory;
    const matchesState = selectedState === 'Todos' || ev.state === selectedState;
    const matchesModality = selectedModality === 'Todas' || ev.modality === selectedModality;
    const matchesPrice = selectedPriceType === 'Todos' || ev.priceType === selectedPriceType;

    return matchesSearch && matchesCategory && matchesState && matchesModality && matchesPrice;
  });

  const nextUpcomingEvent = events[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-indigo-400/30 backdrop-blur-md"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-indigo-200" />
            <span className="font-medium text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedEvent(null); setCurrentTab('home'); }}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                ConectaTech
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">Eventos, Networking e Comunidade</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button 
              onClick={() => { setSelectedEvent(null); setCurrentTab('home'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentTab === 'home' && !selectedEvent ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'}`}
            >
              Início
            </button>
            <button 
              onClick={() => { setSelectedEvent(null); setCurrentTab('search'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentTab === 'search' && !selectedEvent ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'}`}
            >
              Pesquisar
            </button>
            <button 
              onClick={() => { setSelectedEvent(null); setCurrentTab('calendar'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentTab === 'calendar' && !selectedEvent ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'}`}
            >
              Calendário
            </button>
            {dbUser && (
              <button 
                onClick={() => { setSelectedEvent(null); setCurrentTab('organizer'); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentTab === 'organizer' && !selectedEvent ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'}`}
              >
                Área do Organizador
              </button>
            )}
          </nav>

          {/* User Profile / Auth Action */}
          <div className="flex items-center space-x-4">
            {dbUser ? (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => { setSelectedEvent(null); setCurrentTab('profile'); }}
                  className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-700/60 transition-all"
                >
                  <img src={dbUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} alt={dbUser.name} className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-sm font-medium text-slate-200 hidden sm:inline">{dbUser.name.split(' ')[0]}</span>
                </button>
                <button 
                  onClick={handleLogout}
                  title="Sair"
                  className="p-2 rounded-xl bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all border border-slate-700/60"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5"
                >
                  Criar Conta
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* EVENT DETAILS VIEW */}
        {selectedEvent ? (
          <EventDetailsView 
            event={selectedEvent} 
            onBack={() => setSelectedEvent(null)}
            isFavorite={favorites.some(f => f.id === selectedEvent.id)}
            onToggleFavorite={() => toggleFavorite(selectedEvent)}
            isRegistered={myRegistrations.some(r => r.id === selectedEvent.id)}
            onToggleRegister={() => registerForEvent(selectedEvent)}
            reviews={eventReviews}
            newRating={newReviewRating}
            setNewRating={setNewReviewRating}
            newComment={newComment}
            setNewComment={setNewComment}
            onSubmitReview={submitReview}
            networkingUsers={networkingUsers}
            token={token}
            onShowAuth={() => setShowAuthModal(true)}
            showToast={showToast}
          />
        ) : (
          <>
            {/* HOME TAB */}
            {currentTab === 'home' && (
              <div className="space-y-12">
                
                {/* Hero / Next Event Highlight */}
                {nextUpcomingEvent && (
                  <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl">
                    <div className="absolute inset-0 z-0">
                      <img src={nextUpcomingEvent.banner} alt={nextUpcomingEvent.title} className="w-full h-full object-cover opacity-30 transform hover:scale-105 transition-all duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                    </div>

                    <div className="relative z-10 p-8 sm:p-12 lg:p-16 max-w-3xl space-y-6">
                      <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Próximo Grande Evento</span>
                      </div>
                      
                      <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                        {nextUpcomingEvent.title}
                      </h1>
                      
                      <p className="text-slate-300 text-base sm:text-lg line-clamp-2 leading-relaxed">
                        {nextUpcomingEvent.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <div className="flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                          <CalendarIcon className="w-4 h-4 text-indigo-400" />
                          <span>{nextUpcomingEvent.date} às {nextUpcomingEvent.time}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                          <MapPin className="w-4 h-4 text-purple-400" />
                          <span>{nextUpcomingEvent.city}, {nextUpcomingEvent.state}</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                          <Globe className="w-4 h-4 text-pink-400" />
                          <span>{nextUpcomingEvent.modality}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 pt-2">
                        <button 
                          onClick={() => setSelectedEvent(nextUpcomingEvent)}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
                        >
                          <span>Ver Detalhes</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleFavorite(nextUpcomingEvent)}
                          className={`p-3 rounded-xl border transition-all ${favorites.some(f => f.id === nextUpcomingEvent.id) ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                        >
                          <Heart className={`w-5 h-5 ${favorites.some(f => f.id === nextUpcomingEvent.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Recommendation Banner */}
                {dbUser && (
                  <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-slate-900/80 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Recomendador Inteligente com Gemini AI</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {aiRecommendation || "Clique ao lado para receber uma recomendação de evento personalizada com base nos seus interesses em tecnologia."}
                      </p>
                    </div>
                    <button
                      onClick={fetchAiRecommendation}
                      disabled={loadingAi}
                      className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap flex items-center space-x-2"
                    >
                      {loadingAi ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{aiRecommendation ? "Atualizar Recomendação" : "Sugerir Evento para Mim"}</span>
                    </button>
                  </div>
                )}

                {/* Category Filters Bar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                      <Compass className="w-5 h-5 text-indigo-400" />
                      <span>Explore por Categoria</span>
                    </h2>
                  </div>

                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30' : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Featured Events Grid */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                      <span>Eventos em Destaque</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">{filteredEvents.length}</span>
                    </h2>
                  </div>

                  {loadingEvents ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map(n => (
                        <div key={n} className="bg-slate-900/50 rounded-3xl h-96 border border-slate-800 animate-pulse p-6 space-y-4">
                          <div className="bg-slate-800 h-48 rounded-2xl w-full" />
                          <div className="bg-slate-800 h-6 rounded w-3/4" />
                          <div className="bg-slate-800 h-4 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-4">
                      <Compass className="w-12 h-12 text-slate-600 mx-auto" />
                      <h3 className="text-lg font-semibold text-slate-300">Nenhum evento encontrado</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">Tente ajustar seus filtros ou termos de pesquisa para encontrar eventos de tecnologia.</p>
                      <button 
                        onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); setSelectedState('Todos'); setSelectedModality('Todas'); setSelectedPriceType('Todos'); }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredEvents.map(event => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          isFavorite={favorites.some(f => f.id === event.id)}
                          onToggleFavorite={() => toggleFavorite(event)}
                          onSelect={() => setSelectedEvent(event)}
                        />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* SEARCH TAB */}
            {currentTab === 'search' && (
              <div className="space-y-8">
                <div className="bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <Search className="w-6 h-6 text-indigo-400" />
                    <span>Pesquisa Avançada de Eventos</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Buscar por nome, assunto ou cidade..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <select 
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="Todos">Todos os Estados</option>
                        {STATES.filter(s => s !== 'Todos').map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>

                    <div>
                      <select 
                        value={selectedModality}
                        onChange={(e) => setSelectedModality(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        <option value="Todas">Todas as Modalidades</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Preço</span>
                      <div className="flex space-x-2">
                        {['Todos', 'Gratuito', 'Pago'].map(pt => (
                          <button
                            key={pt}
                            onClick={() => setSelectedPriceType(pt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${selectedPriceType === pt ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-300 border-slate-800'}`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map(event => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      isFavorite={favorites.some(f => f.id === event.id)}
                      onToggleFavorite={() => toggleFavorite(event)}
                      onSelect={() => setSelectedEvent(event)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CALENDAR TAB */}
            {currentTab === 'calendar' && (
              <div className="space-y-8">
                <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                      <CalendarDays className="w-6 h-6 text-indigo-400" />
                      <span>Calendário Mensal de Eventos (Julho & Agosto 2026)</span>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar grid simulation */}
                    <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
                        <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
                      </div>
                      <div className="grid grid-cols-7 gap-2 text-sm">
                        {Array.from({ length: 31 }).map((_, i) => {
                          const dayNum = i + 1;
                          const dayStr = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                          const dayEvents = events.filter(e => e.date === dayStr);
                          const hasEvent = dayEvents.length > 0;

                          return (
                            <div 
                              key={i} 
                              className={`h-20 rounded-xl p-2 border flex flex-col justify-between transition-all ${hasEvent ? 'bg-indigo-950/40 border-indigo-500/50 cursor-pointer hover:border-indigo-400' : 'bg-slate-900/30 border-slate-800/60 text-slate-500'}`}
                            >
                              <span className={`font-semibold text-xs ${hasEvent ? 'text-indigo-300' : 'text-slate-500'}`}>{dayNum}</span>
                              {hasEvent && (
                                <div className="space-y-1 overflow-hidden">
                                  {dayEvents.map(de => (
                                    <div 
                                      key={de.id} 
                                      onClick={() => setSelectedEvent(de)}
                                      className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded truncate font-medium hover:bg-indigo-500"
                                      title={de.title}
                                    >
                                      {de.title}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upcoming Scheduled Events Panel */}
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-indigo-400" />
                          <span>Próximos na Agenda</span>
                        </h3>
                        <div className="space-y-3">
                          {events.slice(0, 4).map(ev => (
                            <div key={ev.id} onClick={() => setSelectedEvent(ev)} className="p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-indigo-500/50 transition-all space-y-1">
                              <span className="text-xs text-indigo-400 font-semibold">{ev.date} • {ev.time}</span>
                              <h4 className="text-sm font-bold text-white truncate">{ev.title}</h4>
                              <p className="text-xs text-slate-400">{ev.city}, {ev.state}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => showToast("Sincronização com Google Agenda ativada com sucesso!")}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Sincronizar com Google Agenda</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {currentTab === 'profile' && (
              <ProfileView 
                dbUser={dbUser} 
                token={token} 
                favorites={favorites} 
                myRegistrations={myRegistrations} 
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                showToast={showToast}
                onUpdateUser={(updated) => setDbUser(updated)}
              />
            )}

            {/* ORGANIZER TAB */}
            {currentTab === 'organizer' && (
              <OrganizerView 
                newEventForm={newEventForm}
                setNewEventForm={setNewEventForm}
                onSubmit={createNewEvent}
              />
            )}
          </>
        )}

      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {authMode === 'login' ? 'Entrar no ConectaTech' : authMode === 'register' ? 'Criar Conta ConectaTech' : 'Recuperar Senha'}
                </h3>
                <p className="text-xs text-slate-400">
                  {authMode === 'login' ? 'Conecte-se para favoritar, se inscrever e fazer networking.' : authMode === 'register' ? 'Preencha seus dados para começar.' : 'Digite seu e-mail para receber instruções.'}
                </p>
              </div>

              {authMode === 'login' ? (
                <div className="space-y-4">
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-3 shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Entrar com Google</span>
                  </button>

                  <button 
                    onClick={() => showToast("Login com LinkedIn em desenvolvimento.")}
                    className="w-full py-3 bg-[#0A66C2] hover:bg-[#095196] text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center space-x-3 shadow-md"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>Entrar com LinkedIn</span>
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-xs text-slate-500">ou com e-mail</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">E-mail</label>
                      <input 
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
                      <input 
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <button type="button" onClick={() => setAuthMode('forgot')} className="text-indigo-400 hover:underline">
                        Esqueci minha senha
                      </button>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      Entrar
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">Não tem uma conta? </span>
                    <button onClick={() => setAuthMode('register')} className="text-xs text-indigo-400 font-semibold hover:underline">
                      Criar conta
                    </button>
                  </div>
                </div>
              ) : authMode === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo</label>
                    <input 
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nome Sobrenome"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">E-mail</label>
                    <input 
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Senha</label>
                    <input 
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Cidade</label>
                      <input 
                        type="text"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
                      <select 
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        {STATES.filter(s => s !== 'Todos').map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Áreas de Interesse (Selecione)</label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {CATEGORIES.filter(c => c !== 'Todos').map(cat => {
                        const isSelected = regInterests.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              if (isSelected) {
                                setRegInterests(regInterests.filter(i => i !== cat));
                              } else {
                                setRegInterests([...regInterests, cat]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all mt-4"
                  >
                    Cadastrar e Conectar
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">Já tem uma conta? </span>
                    <button type="button" onClick={() => setAuthMode('login')} className="text-xs text-indigo-400 font-semibold hover:underline">
                      Entrar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">Enviaremos um link de recuperação para o seu e-mail cadastrado.</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">E-mail</label>
                    <input 
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button 
                    onClick={() => { showToast("E-mail de recuperação enviado com sucesso!"); setAuthMode('login'); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    Enviar Link de Recuperação
                  </button>
                  <button onClick={() => setAuthMode('login')} className="w-full text-xs text-slate-400 hover:text-white pt-2">
                    Voltar para o login
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Event Card Component
function EventCard({ event, isFavorite, onToggleFavorite, onSelect }: { key?: React.Key; event: EventItem; isFavorite: boolean; onToggleFavorite: () => void; onSelect: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl hover:border-indigo-500/50 transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="relative h-48 overflow-hidden">
          <img src={event.banner} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600/90 text-white backdrop-blur-md shadow-lg">
              {event.category}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg ${event.priceType === 'Gratuito' ? 'bg-emerald-600/90 text-white' : 'bg-purple-600/90 text-white'}`}>
              {event.priceType === 'Gratuito' ? 'Gratuito' : event.price}
            </span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`absolute top-4 right-4 p-2.5 rounded-xl backdrop-blur-md border transition-all ${isFavorite ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-900/60 border-slate-700/60 text-white hover:bg-slate-800'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-medium text-indigo-400">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{event.date} • {event.time}</span>
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
              {event.title}
            </h3>
          </div>

          <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate max-w-[120px]">{event.city}, {event.state}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{event.enrolledCount} / {event.capacity} vagas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0">
        <button 
          onClick={onSelect}
          className="w-full py-3 bg-slate-800 hover:bg-indigo-600 text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 group-hover:bg-indigo-600"
        >
          <span>Ver Detalhes</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Event Details View Component
function EventDetailsView({ 
  event, onBack, isFavorite, onToggleFavorite, isRegistered, onToggleRegister, 
  reviews, newRating, setNewRating, newComment, setNewComment, onSubmitReview,
  networkingUsers, token, onShowAuth, showToast 
}: { 
  event: EventItem; 
  onBack: () => void; 
  isFavorite: boolean; 
  onToggleFavorite: () => void; 
  isRegistered: boolean; 
  onToggleRegister: () => void;
  reviews: ReviewItem[];
  newRating: number;
  setNewRating: (n: number) => void;
  newComment: string;
  setNewComment: (c: string) => void;
  onSubmitReview: (e: React.FormEvent) => void;
  networkingUsers: any[];
  token: string | null;
  onShowAuth: () => void;
  showToast: (m: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'speakers' | 'networking' | 'reviews'>('info');

  const connectWithUser = async (targetUserId: number) => {
    if (!token) {
      onShowAuth();
      return;
    }
    try {
      const res = await fetch('/api/networking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId, eventId: event.id })
      });
      if (res.ok) {
        showToast("Solicitação de conexão enviada com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <button 
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar aos Eventos</span>
      </button>

      {/* Hero Banner Header */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="relative h-72 sm:h-96 w-full">
          <img src={event.banner} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-lg">
                  {event.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 shadow-lg">
                  {event.modality}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-lg">
                  {event.priceType === 'Gratuito' ? 'Gratuito' : event.price}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {event.title}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base flex items-center space-x-2">
                <Building className="w-4 h-4 text-indigo-400" />
                <span>Organizado por <strong className="text-white">{event.organizerName}</strong></span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={onToggleFavorite}
                className={`p-3 rounded-2xl backdrop-blur-md border transition-all ${isFavorite ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'}`}
                title="Favoritar"
              >
                <Heart className={`w-6 h-6 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Link do evento copiado para a área de transferência!");
                }}
                className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md transition-all"
                title="Compartilhar"
              >
                <Share2 className="w-6 h-6" />
              </button>
              <button 
                onClick={onToggleRegister}
                className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all ${isRegistered ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'}`}
              >
                {isRegistered ? 'Inscrito (Cancelar)' : 'Inscrever-se Agora'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-6">
        {['info', 'speakers', 'networking', 'reviews'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 text-sm font-semibold capitalize border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {tab === 'info' ? 'Sobre o Evento' : tab === 'speakers' ? 'Palestrantes' : tab === 'networking' ? 'Networking' : `Avaliações (${reviews.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'info' && (
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6">
              <h3 className="text-xl font-bold text-white">Sobre este evento</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {event.description}
              </p>

              {event.schedule && event.schedule.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h4 className="text-lg font-bold text-white">Programação</h4>
                  <div className="space-y-3">
                    {event.schedule.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-start space-x-4">
                        <div className="px-3 py-1 rounded-xl bg-indigo-600/20 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/30">
                          {item.time}
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-semibold text-white text-sm">{item.title}</h5>
                          <p className="text-xs text-slate-400">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'speakers' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Palestrantes Conidados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {event.speakers && event.speakers.length > 0 ? event.speakers.map((spk, idx) => (
                  <div key={idx} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
                    <img src={spk.avatar} alt={spk.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-700" />
                    <div>
                      <h4 className="font-bold text-white text-base">{spk.name}</h4>
                      <p className="text-xs text-indigo-400 font-medium">{spk.role}</p>
                      <p className="text-xs text-slate-400">{spk.company}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm">Nenhum palestrante cadastrado para este evento.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'networking' && (
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Sugestões de Networking</span>
                </h3>
                <p className="text-xs text-slate-400">Conecte-se com outros participantes interessados em tecnologia neste evento.</p>
                
                <div className="space-y-3 pt-2">
                  {networkingUsers.map((u) => (
                    <div key={u.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src={u.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} alt={u.name} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{u.name}</h4>
                          <p className="text-xs text-slate-400">{u.city}, {u.state} • {(u.interests as string[])?.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => connectWithUser(u.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                      >
                        Conectar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
                <h3 className="text-xl font-bold text-white">Avaliações e Comentários</h3>

                {token ? (
                  <form onSubmit={onSubmitReview} className="space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <h4 className="text-sm font-semibold text-white">Deixe sua avaliação</h4>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star className={`w-6 h-6 ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      required
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="O que você achou do evento?"
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                    >
                      Enviar Avaliação
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <p className="text-xs text-slate-400 mb-2">Faça login para avaliar este evento.</p>
                    <button onClick={onShowAuth} className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">Entrar</button>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  {reviews.length === 0 ? (
                    <p className="text-slate-500 text-sm">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                  ) : (
                    reviews.map(rev => (
                      <div key={rev.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img src={rev.userAvatar} alt={rev.userName} className="w-8 h-8 rounded-lg object-cover" />
                            <span className="font-semibold text-white text-sm">{rev.userName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm pl-11">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl sticky top-28">
            <h4 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Informações do Evento</h4>

            <div className="space-y-4 text-sm">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-xs">Data e Horário</span>
                  <span className="font-semibold text-white">{event.date} às {event.time}</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-xs">Local / Endereço</span>
                  <span className="font-semibold text-white">{event.address}</span>
                  <span className="text-slate-400 text-xs block">{event.city}, {event.state}</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-400 block text-xs">Capacidade & Inscrições</span>
                  <span className="font-semibold text-white">{event.enrolledCount} confirmados ({event.capacity} vagas)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button 
                onClick={onToggleRegister}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all ${isRegistered ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'}`}
              >
                {isRegistered ? 'Inscrito (Cancelar)' : 'Inscrever-se no Evento'}
              </button>

              <button 
                onClick={() => showToast("Evento adicionado ao Google Agenda com sucesso!")}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold text-sm transition-all flex items-center justify-center space-x-2 border border-slate-700"
              >
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>Adicionar ao Google Agenda</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Profile View Component
function ProfileView({ dbUser, token, favorites, myRegistrations, onSelectEvent, showToast, onUpdateUser }: { 
  dbUser: UserProfile | null; 
  token: string | null; 
  favorites: EventItem[]; 
  myRegistrations: EventItem[];
  onSelectEvent: (ev: EventItem) => void;
  showToast: (m: string) => void;
  onUpdateUser: (u: UserProfile) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(dbUser?.name || '');
  const [city, setCity] = useState(dbUser?.city || '');
  const [state, setState] = useState(dbUser?.state || 'SP');
  const [bio, setBio] = useState(dbUser?.bio || '');
  const [interests, setInterests] = useState<string[]>(dbUser?.interests || []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, city, state, bio, interests })
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateUser(updated);
        setIsEditing(false);
        showToast("Perfil atualizado com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!dbUser) {
    return (
      <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
        <UserIcon className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-semibold text-white">Faça login para ver seu perfil</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <img src={dbUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} alt={dbUser.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-xl" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{dbUser.name}</h2>
            <p className="text-xs text-indigo-400 font-medium">{dbUser.email}</p>
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{dbUser.city}, {dbUser.state}</span>
            </p>
            <p className="text-xs text-slate-300 max-w-md">{dbUser.bio}</p>
          </div>
        </div>

        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-2"
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>{isEditing ? 'Cancelar' : 'Editar Perfil'}</span>
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
          <h3 className="text-lg font-bold text-white">Editar Informações da Conta</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cidade</label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Biografia</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button 
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            Salvar Alterações
          </button>
        </form>
      )}

      {/* Registrations & Favorites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>Meus Eventos ({myRegistrations.length})</span>
          </h3>
          <div className="space-y-3">
            {myRegistrations.length === 0 ? (
              <p className="text-xs text-slate-500">Você ainda não se inscreveu em nenhum evento.</p>
            ) : (
              myRegistrations.map(ev => (
                <div key={ev.id} onClick={() => onSelectEvent(ev)} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 cursor-pointer hover:border-indigo-500 transition-all flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                    <p className="text-xs text-indigo-400">{ev.date} • {ev.city}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <span>Favoritos ({favorites.length})</span>
          </h3>
          <div className="space-y-3">
            {favorites.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum evento favoritado ainda.</p>
            ) : (
              favorites.map(ev => (
                <div key={ev.id} onClick={() => onSelectEvent(ev)} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 cursor-pointer hover:border-indigo-500 transition-all flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                    <p className="text-xs text-indigo-400">{ev.date} • {ev.city}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Organizer View Component
function OrganizerView({ newEventForm, setNewEventForm, onSubmit }: { newEventForm: any; setNewEventForm: any; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Criar Novo Evento</h2>
          <p className="text-xs text-slate-400">Publique seu evento na plataforma ConectaTech.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Título do Evento</label>
            <input 
              type="text"
              required
              value={newEventForm.title}
              onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
              placeholder="Ex: Workshop de React Avançado"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Descrição Completa</label>
            <textarea 
              required
              rows={4}
              value={newEventForm.description}
              onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
              placeholder="Descreva o que será abordado no evento..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
              <input 
                type="date"
                required
                value={newEventForm.date}
                onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Horário</label>
              <input 
                type="time"
                required
                value={newEventForm.time}
                onChange={(e) => setNewEventForm({ ...newEventForm, time: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cidade</label>
              <input 
                type="text"
                required
                value={newEventForm.city}
                onChange={(e) => setNewEventForm({ ...newEventForm, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
              <select 
                value={newEventForm.state}
                onChange={(e) => setNewEventForm({ ...newEventForm, state: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {STATES.filter(s => s !== 'Todos').map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Endereço / Link</label>
            <input 
              type="text"
              required
              value={newEventForm.address}
              onChange={(e) => setNewEventForm({ ...newEventForm, address: e.target.value })}
              placeholder="Ex: Av. Paulista, 1000 ou Transmissão Online"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Modalidade</label>
              <select 
                value={newEventForm.modality}
                onChange={(e) => setNewEventForm({ ...newEventForm, modality: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Presencial">Presencial</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Preço</label>
              <select 
                value={newEventForm.priceType}
                onChange={(e) => setNewEventForm({ ...newEventForm, priceType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Gratuito">Gratuito</option>
                <option value="Pago">Pago</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor</label>
              <input 
                type="text"
                value={newEventForm.price}
                onChange={(e) => setNewEventForm({ ...newEventForm, price: e.target.value })}
                placeholder="R$ 50,00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
            <select 
              value={newEventForm.category}
              onChange={(e) => setNewEventForm({ ...newEventForm, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all mt-4"
          >
            Publicar Evento
          </button>
        </form>
      </div>
    </div>
  );
}
