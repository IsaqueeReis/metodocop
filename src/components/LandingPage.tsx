import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Check, Star, Shield, Zap, Target, BookOpen, PenTool, Database, MessageCircle, ChevronRight, Activity, Quote, Folder, ArrowRight, BarChart3, Clock, Brain, TrendingUp, Users, User, ChevronDown, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { globalRepo } from '../../services/repository';
import { Product, Coupon, ProductFolder, User as UserType } from '../../types';
import { QuestionStatsDashboard } from './QuestionStatsDashboard';

// Marquee animation variants
const marqueeVariants = {
  animate: {
    x: [0, -1035],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: "loop",
        duration: 20,
        ease: "linear",
      },
    },
  },
};

export const LandingPage = ({ onNavigateToAuth, user, onLogout }: { onNavigateToAuth: () => void, user?: UserType, onLogout?: () => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [folders, setFolders] = useState<ProductFolder[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Dados Fictícios de Alta Performance para o Mockup Real da Plataforma
  const fakeStats = {
    total: 12500,
    correct: 10625,
    incorrect: 1875,
    accuracy: 85
  };
  
  const fakeSubjects = [
    { name: "Direito Penal", total: 3500, correct: 3150, incorrect: 350, accuracy: 90, subjectsList: [] },
    { name: "Direito Constitucional", total: 4200, correct: 3360, incorrect: 840, accuracy: 80, subjectsList: [] },
    { name: "Legislação Extravagante", total: 4800, correct: 4115, incorrect: 685, accuracy: 85, subjectsList: [] }
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const p = await globalRepo.getProducts();
      const f = await globalRepo.getProductFolders();
      const c = await globalRepo.getCoupons();
      setProducts(p);
      setFolders(f);
      setCoupons(c);
    };
    loadData();
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
      return [...prev, {product, quantity: 1}];
    });
  };

  const buyNow = (product: Product) => {
    addToCart(product);
    setIsCartOpen(true);
  };

  const applyCoupon = () => {
    const coupon = coupons.find(c => c.code === couponCode);
    if (coupon) setAppliedCoupon(coupon);
    else alert('Cupom inválido');
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.promotionalPrice || item.product.price) * item.quantity, 0);
  const discount = appliedCoupon ? subtotal * (appliedCoupon.discountPercentage / 100) : 0;
  const total = subtotal - discount;

  const handleCheckout = () => {
    const hasCompleto = cart.some(item => item.product.name.toLowerCase().includes('completo') || item.product.name.toLowerCase().includes('vip'));
    const LINK_COMPLETO = 'https://pay.kiwify.com.br/hCg38Ue';
    const LINK_APOSTILA = 'https://pay.kiwify.com.br/BqLdY3E';
    
    if (hasCompleto) {
        window.location.href = LINK_COMPLETO;
    } else {
        window.location.href = LINK_APOSTILA;
    }
  };

  const filteredProducts = (activeFolderId 
    ? products.filter(p => p.folderId === activeFolderId)
    : [...products]).sort((a, b) => b.price - a.price);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white selection:text-black relative overflow-x-hidden">
      
      {/* Background Dinâmico Tecnológico e Luzes Estratégicas */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#050505]"></div>
        
        {/* Efeitos de Fundo (Glow Estilo Sirene Policial Suave) que acompanham o scroll */}
        <div className="absolute top-0 -left-[20%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-0 -right-[20%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/30 rounded-full blur-[150px]"></div>

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className={`fixed top-0 left-0 right-0 px-6 py-4 flex justify-between items-center transition-all duration-300 z-50 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-lg border-b border-white/5 shadow-lg' : 'bg-transparent'}`}>
          <div className="flex items-center gap-4">
            <img src="https://i.postimg.cc/3JWsBW54/1bd1e00c-3df8-4700-b8aa-4586d43b3c64.png" alt="MÉTODO COP" className="w-12 md:w-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          </div>
          
          <div className="flex gap-8 items-center bg-zinc-900/50 backdrop-blur-md border border-white/5 px-8 py-3 rounded-full hidden lg:flex">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({behavior: 'smooth'})} className="text-zinc-400 hover:text-white text-sm font-bold tracking-wide uppercase transition-colors">Plataforma</button>
            <button onClick={() => document.getElementById('products')?.scrollIntoView({behavior: 'smooth'})} className="text-zinc-400 hover:text-white text-sm font-bold tracking-wide uppercase transition-colors">Materiais</button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({behavior: 'smooth'})} className="text-zinc-400 hover:text-white text-sm font-bold tracking-wide uppercase transition-colors">Relatos</button>
          </div>

          <div className="flex gap-4 items-center">
            {user ? (
              <button onClick={onLogout} className="text-zinc-400 text-sm font-bold hover:text-white transition">Sair</button>
            ) : (
              <button onClick={onNavigateToAuth} className="text-white text-sm font-bold hover:text-zinc-300 transition hidden sm:block">Entrar</button>
            )}
            <button onClick={() => user ? null : onNavigateToAuth()} className="bg-white text-black text-sm font-bold px-6 py-2.5 rounded-full hover:bg-zinc-200 transition-transform hover:scale-105">
              {user ? 'Acessar Painel' : 'Começar Agora'}
            </button>
            <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-full transition border border-white/10 group">
              <ShoppingCart size={18} className="text-zinc-400 group-hover:text-white transition-colors"/>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg shadow-white/50">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Hero Section Moderno */}
        <header className="pt-40 pb-20 px-6 min-h-[90vh] flex items-center justify-center relative overflow-hidden">
          
          {/* As luzes agora estão no background fixo principal */}

          <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center relative z-10">
            {/* Esquerda: Textos de Impacto (Agora Centralizados) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-bold text-xs mb-8 uppercase tracking-widest backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Turmas Abertas 2026
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight leading-[1.15] uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                O MÉTODO DEFINITIVO <br/> PARA A SUA <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700">APROVAÇÃO</span>
              </h1>
              
              <p className="text-base md:text-xl text-zinc-400 mb-10 max-w-2xl font-light leading-relaxed">
                Transforme-se em um estudante de excelência. Direcionamento estratégico, banco de questões robusto e tudo que você precisa para dominar o edital e conquistar sua vaga nas carreiras policiais.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                <button onClick={() => document.getElementById('products')?.scrollIntoView({behavior: 'smooth'})} className="bg-white hover:bg-zinc-200 text-black font-bold py-4 px-12 rounded-full text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 group">
                  Conhecer o MÉTODO <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Faixa de Métricas */}
        <div className="border-y border-white/5 bg-white/[0.02] py-8 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
            {[
              { label: "Alunos Aprovados", value: "+100" },
              { label: "Questões no Banco", value: "30.000" },
              { label: "Redações Corrigidas", value: "Ilimitadas" },
              { label: "Satisfação", value: "98.7%" }
            ].map((stat, i) => (
              <div key={i} className={`flex flex-col items-center justify-center text-center ${i % 2 !== 0 ? 'border-l border-white/5 md:border-none' : ''}`}>
                <div className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">{stat.value}</div>
                <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Products (Vitrine movida para cima do painel) */}
        <section id="products" className="py-16 md:py-24 px-4 md:px-6 relative z-10">
          <div className="max-w-6xl mx-auto bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-[2rem] p-6 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-xs md:text-sm font-bold text-white/50 tracking-widest uppercase mb-2">Catálogo de Aprovação</h2>
                <h3 className="text-3xl md:text-4xl font-bold">Vitrine de Produtos</h3>
              </div>
              
              <div className="flex bg-zinc-900/50 p-1.5 rounded-full border border-white/10 backdrop-blur-md overflow-x-auto max-w-full custom-scrollbar">
                <button 
                  onClick={() => setActiveFolderId(null)}
                  className={`px-6 py-2 rounded-full font-bold text-sm transition whitespace-nowrap ${activeFolderId === null ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                >
                  Todos os Produtos
                </button>
                {folders.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setActiveFolderId(f.id)}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeFolderId === f.id ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col group hover:border-zinc-500 transition-colors shadow-xl"
                >
                  <div className="h-56 relative overflow-hidden bg-zinc-900">
                    {p.coverImageUrl ? (
                      <img src={p.coverImageUrl} alt={p.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                        <Folder size={48} className="mb-2 opacity-50"/>
                        <span className="font-bold uppercase tracking-widest text-xs">MÉTODO COP</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  </div>
                  
                  <div className="p-8 flex flex-col flex-1">
                    <h4 className="text-2xl font-bold mb-3">{p.name}</h4>
                    
                    <details className="group cursor-pointer mb-8 flex-1 [&::-webkit-details-marker]:hidden">
                      <summary className="text-zinc-400 font-bold text-xs uppercase tracking-widest select-none flex items-center justify-between outline-none list-none pb-3 border-b border-zinc-800 hover:text-white transition-colors">
                        Benefícios do Plano <ChevronDown size={14} className="group-open:rotate-180 transition-transform"/>
                      </summary>
                      <div className="mt-4 space-y-3">
                        {(p.description || 'Material oficial e atualizado focado nas carreiras policiais.').split('\n').map((line, idx) => line.trim() ? (
                          <div key={idx} className="flex items-start gap-2 text-zinc-400 text-sm">
                            <CheckCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                            <span>{line.trim()}</span>
                          </div>
                        ) : null)}
                      </div>
                    </details>
                    
                    <div className="flex items-end justify-between mt-auto mb-6">
                      <div>
                        {p.promotionalPrice ? (
                          <>
                            <span className="text-zinc-600 line-through text-sm mr-2 block">R$ {p.price.toFixed(2)}</span>
                            <span className="text-3xl font-black text-white">R$ {p.promotionalPrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-3xl font-black text-white">R$ {p.price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => buyNow(p)}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                      Comprar Agora <ShoppingCart size={18} className="transition-transform group-hover:scale-110"/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-20 border border-white/5 rounded-3xl bg-zinc-900/20 mt-8">
                <Folder size={48} className="mx-auto text-zinc-700 mb-4"/>
                <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum material nesta categoria</p>
              </div>
            )}
          </div>
        </section>

        {/* Ecosystem - Bento Grid (Painel da Plataforma movido para baixo) */}
        <section id="features" className="py-16 md:py-24 px-4 md:px-6 relative z-10 mt-8">
          <div className="max-w-6xl mx-auto bg-[#050505]/60 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] p-6 md:p-12">
            <div className="text-center mb-16">
              <h2 className="text-xs md:text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase mb-4 flex items-center justify-center gap-2">
                <Shield size={16}/> Benefícios do Aluno COP
              </h2>
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight">Acesso Total à Plataforma</h3>
              <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">Você não está comprando um curso, está adquirindo o passaporte para a sua aprovação. Veja tudo que te aguarda do outro lado.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-black rounded-3xl border border-white/10 p-8 relative overflow-hidden group hover:border-zinc-500 transition-all">
                <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                  <Database size={24}/>
                </div>
                <h4 className="text-2xl font-bold mb-3">Banco de Questões Inéditas</h4>
                <p className="text-zinc-400">Mais de 30 mil questões das bancas policiais. Sistema de inteligência artificial que aprende com seus erros e filtra exatamente o que você precisa revisar.</p>
              </motion.div>

              <motion.div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-8 relative overflow-hidden group hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
                  <PenTool size={24}/>
                </div>
                <h4 className="text-xl font-bold mb-2">Correção de Redação</h4>
                <p className="text-zinc-500 text-sm">Sua redação avaliada nos mesmos critérios rígidos da banca examinadora (Cespe, FGV, Vunesp, etc).</p>
              </motion.div>

              <motion.div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-8 relative overflow-hidden group hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
                  <Target size={24}/>
                </div>
                <h4 className="text-xl font-bold mb-2">Trilha do Vencedor</h4>
                <p className="text-zinc-500 text-sm">Tarefas diárias gamificadas. Saiba exatamente o que estudar, revisar e resolver a cada dia.</p>
              </motion.div>
              
              <motion.div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-8 relative overflow-hidden group hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
                  <BookOpen size={24}/>
                </div>
                <h4 className="text-xl font-bold mb-2">Vade Mecum COP</h4>
                <p className="text-zinc-500 text-sm">Lei seca esquematizada, grifada e atualizada. Estude os artigos que realmente importam e despencam nas provas.</p>
              </motion.div>

              <motion.div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-8 relative overflow-hidden group hover:bg-zinc-900 transition-colors">
                <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6">
                  <Users size={24}/>
                </div>
                <h4 className="text-xl font-bold mb-2">Mentoria COP</h4>
                <p className="text-zinc-500 text-sm">Encontros e direcionamento direto com aprovados e especialistas em concursos policiais.</p>
              </motion.div>

              <motion.div className="md:col-span-3 bg-[#111] rounded-3xl border border-white/5 p-8 relative overflow-hidden group hover:border-white/20 transition-all">
 
                 <div className="relative z-10 flex flex-col md:flex-row h-full items-center gap-8">
                    <div className="flex-1">
                      <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 text-white rounded-2xl flex items-center justify-center mb-6">
                        <Activity size={28}/>
                      </div>
                      <h4 className="text-2xl font-bold mb-3">Dashboard de Performance</h4>
                      <p className="text-zinc-400">Diga adeus ao estudo às cegas. Tenha gráficos precisos do seu avanço por disciplina, controle absoluto dos seus Editais e Simulados, e uma previsibilidade matemática da sua aprovação.</p>
                    </div>
                 </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonials - Marquee Dinâmico */}
        <section id="testimonials" className="py-16 md:py-24 border-t border-white/5 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] z-10 pointer-events-none"></div>
          
          <div className="text-center mb-12 relative z-20 px-6">
            <h2 className="text-xs md:text-sm font-bold text-zinc-500 tracking-[0.2em] uppercase mb-3">Relatos Reais</h2>
            <h3 className="text-3xl md:text-4xl font-bold">Quem usa, aprova.</h3>
          </div>

          <div className="flex whitespace-nowrap overflow-hidden relative">
            <motion.div 
              variants={marqueeVariants}
              animate="animate"
              className="flex gap-6 px-3"
            >
              {/* Duplicamos os relatos para o efeito de loop infinito */}
              {[...Array(2)].map((_, arrayIndex) => (
                <React.Fragment key={arrayIndex}>
                  {[
                    {name: "João Pedro", text: "A plataforma mudou meu jogo. O banco de questões é absurdo de bom.", role: "Aprovado PMMG"},
                    {name: "Maria Silva", text: "Saí do zero aos 85% de acertos em 3 meses seguindo a trilha diária.", role: "Aprovada PMPE"},
                    {name: "Carlos Mendes", text: "A correção de redação é idêntica ao que a banca cobra. Impressionante.", role: "Aprovado PMAL"},
                    {name: "Ana Costa", text: "O melhor investimento. Esquece PDF infinito, aqui é foco no que cai.", role: "Aprovada PPCE"},
                    {name: "Lucas Teixeira", text: "Os gráficos me mostraram exatamente onde eu tava errando.", role: "Aprovado PCSP"},
                  ].map((t, i) => (
                    <div key={`${arrayIndex}-${i}`} className="w-[350px] inline-flex flex-col bg-zinc-900/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm whitespace-normal">
                      <Quote size={32} className="text-white/10 mb-6"/>
                      <p className="text-zinc-300 text-lg leading-relaxed mb-8 flex-1 italic">"{t.text}"</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xl text-white border border-white/10">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white">{t.name}</div>
                          <div className="text-zinc-500 text-xs font-bold uppercase">{t.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-white/10 bg-black text-center relative z-20">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <img src="https://i.postimg.cc/3JWsBW54/1bd1e00c-3df8-4700-b8aa-4586d43b3c64.png" alt="MÉTODO COP" className="w-12 opacity-50 hover:opacity-100 transition-opacity" />
            <p className="text-zinc-600 text-[10px] md:text-xs font-bold uppercase tracking-widest">© 2026 MÉTODO COP. A aprovação é o limite.</p>
            <div className="flex gap-4">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">Termos</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">Privacidade</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Cart Sidebar Modificado (Mais clean) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></motion.div>
          
          <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="w-full max-w-md bg-[#0a0a0a] h-full relative z-10 flex flex-col border-l border-white/10 shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black">
              <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={20}/> Seu Carrinho</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <ShoppingCart size={48} className="mb-4 opacity-50"/>
                  <p className="font-bold uppercase tracking-widest text-sm">Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                    {item.product.coverImageUrl ? (
                      <img src={item.product.coverImageUrl} className="w-16 h-16 object-cover rounded-lg" alt=""/>
                    ) : (
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center"><Folder size={20} className="text-zinc-600"/></div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-sm leading-tight text-white">{item.product.name}</h4>
                      <div className="text-zinc-400 text-xs mt-1">Qtd: {item.quantity}</div>
                    </div>
                    <div className="font-black text-white">
                      R$ {((item.product.promotionalPrice || item.product.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-black">
                <div className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={couponCode} 
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="CUPOM DE DESCONTO" 
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-4 text-sm outline-none focus:border-zinc-500 uppercase font-bold text-white"
                  />
                  <button onClick={applyCoupon} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg font-bold text-sm transition-colors">
                    Aplicar
                  </button>
                </div>

                <div className="space-y-3 mb-6 text-sm font-bold">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-400">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- R$ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl text-white pt-3 border-t border-white/10">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={handleCheckout} className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  Finalizar Compra
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
