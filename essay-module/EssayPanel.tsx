
import React, { useState, useEffect } from 'react';
import { EssayService } from './service';
import { EssayTopic, EssaySubmission } from './types';
import { PremiumLock } from '../trilha-vencedor/PremiumLock';
import { PenTool, Upload, FileText, CheckCircle, Clock, AlertCircle, Link, ChevronRight, X, Star, Send, Plus, List as ListIcon, Trash2, Archive, Zap, Loader2, Sparkles, Wand2, BrainCircuit } from 'lucide-react';
import { Dialog, DialogType } from '../components/ui/Dialog';

interface Props {
  user: any; // User type
  hasPremium?: boolean; // Prop recebida do pai
  allUsers?: any[];
  allPlans?: any[];
}

export const EssayPanel = ({ user, hasPremium = false, allUsers = [], allPlans = [] }: Props) => {
  const [topics, setTopics] = useState<EssayTopic[]>([]);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  
  // Estados de Navegação
  const [activeView, setActiveView] = useState<'LIST' | 'EDITOR' | 'CORRECTION'>('LIST');
  const [selectedTopic, setSelectedTopic] = useState<EssayTopic | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<EssaySubmission | null>(null);
  
  // Estados de Edição (Aluno)
  const [essayContent, setEssayContent] = useState('');
  const [essayFileUrl, setEssayFileUrl] = useState('');
  
  // Estados de Admin
  const [isAdminMode, setIsAdminMode] = useState(user.role === 'ADMIN' || user.role === 'MASTER_ADMIN');
  const [adminTab, setAdminTab] = useState<'CORRECTIONS' | 'TOPICS' | 'HISTORY'>('CORRECTIONS');
  const [adminReviewSub, setAdminReviewSub] = useState<EssaySubmission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);

  // Estados de Criação de Tema (Admin)
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  
  // Target States
  const [targetType, setTargetType] = useState<'ALL' | 'PLAN' | 'STUDENT'>('ALL');
  const [targetId, setTargetId] = useState('');

  // Estados de IA (Admin)
  const [aiBoard, setAiBoard] = useState('');
  const [aiSubject, setAiSubject] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [correctionPrompt, setCorrectionPrompt] = useState('');
  const [isCorrectingAI, setIsCorrectingAI] = useState(false);

  // --- DIALOG SYSTEM ---
  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      type: DialogType;
      title: string;
      message: string;
      onConfirm?: (value?: string) => void;
      inputPlaceholder?: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  const showAlert = (title: string, message: string) => {
      setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: undefined });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
      setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const handleDialogConfirm = (value?: string) => {
      if (dialog.onConfirm) dialog.onConfirm(value);
      setDialog({ ...dialog, isOpen: false });
  };

  const canAccess = hasPremium || isAdminMode;
  
  useEffect(() => {
    if (!canAccess) return;
    loadData();
  }, [canAccess]);

  const loadData = async () => {
    const t = await EssayService.getTopics(user.id, user.role, user.planId);
    setTopics(t);
    
    if (isAdminMode) {
        const s = await EssayService.getAllSubmissions();
        setSubmissions(s);
    } else {
        const s = await EssayService.getStudentSubmissions(user.id);
        setSubmissions(s);
    }
  };

  const handleStartEssay = (topic: EssayTopic) => {
      setSelectedTopic(topic);
      setActiveView('EDITOR');
      setEssayContent('');
      setEssayFileUrl('');
  };

  const handleSubmit = async () => {
    if (!selectedTopic || (!essayContent && !essayFileUrl)) return showAlert('Erro', "Escreva o texto OU envie o link do arquivo.");
    
    await EssayService.submitEssay({
        student_id: user.id,
        student_name: user.name,
        topic_id: selectedTopic.id,
        content_text: essayContent,
        file_url: essayFileUrl,
        status: 'PENDING'
    });
    
    showAlert('Sucesso', "Redação enviada para o comando! Aguarde a correção.");
    setActiveView('LIST');
    loadData();
  };

  const handleViewCorrection = (sub: EssaySubmission) => {
      setViewingSubmission(sub);
      setActiveView('CORRECTION');
  };

  // Admin Actions
  const handleAdminOpenCorrection = (sub: EssaySubmission) => {
      setAdminReviewSub(sub);
      // Se já foi corrigida, carrega os dados
      if (sub.status === 'DONE' && sub.review) {
          setScore(sub.review.final_score);
          setFeedback(sub.review.feedback_text);
      } else {
          setScore(0);
          setFeedback('');
      }
  };

  const handleAdminSubmitCorrection = async () => {
    if (!adminReviewSub) return;
    
    // Passando user.id como mentor_id (obrigatório no SQL)
    await EssayService.submitReview({
        submission_id: adminReviewSub.id,
        mentor_id: user.id, 
        final_score: score,
        feedback_text: feedback,
        competencies_json: {}
    });
    
    showAlert('Sucesso', "Correção enviada ao aluno!");
    setAdminReviewSub(null);
    loadData();
  };

  const handleCorrectWithAI = async () => {
    if (!adminReviewSub || !adminReviewSub.content_text) return showAlert('Erro', "A redação precisa ter texto para ser corrigida pela IA.");
    
    setIsCorrectingAI(true);
    try {
      const result = await EssayService.correctEssayWithAI(
        adminReviewSub.content_text,
        adminReviewSub.topic_title || 'Tema Geral',
        correctionPrompt
      );
      setFeedback(result.feedback);
      setScore(result.score);
      showAlert('Sucesso', 'Correção sugerida pela IA carregada com sucesso! Você pode revisar e ajustar antes de enviar.');
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao corrigir redação com IA.');
    } finally {
      setIsCorrectingAI(false);
    }
  };

  const handleGenerateTopicAI = async () => {
    if (!aiBoard || !aiSubject) return showAlert('Erro', "Preencha a Banca e o Assunto para gerar o tema.");
    
    setIsGeneratingTopic(true);
    try {
      const result = await EssayService.generateTopicWithAI(aiBoard, aiSubject, aiPrompt);
      setNewTopicTitle(result.title);
      setNewTopicDesc(result.description);
      showAlert('Sucesso', 'Tema gerado pela IA com sucesso! Você pode ajustar antes de salvar.');
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao gerar tema com IA.');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleCreateOrUpdateTopic = async () => {
      if (!newTopicTitle || !newTopicDesc) return showAlert('Erro', "Preencha título e descrição do tema.");
      
      if (editingTopicId) {
          await EssayService.updateTopic(editingTopicId, newTopicTitle, newTopicDesc);
          showAlert('Sucesso', "Tema atualizado com sucesso!");
          setEditingTopicId(null);
      } else {
          await EssayService.createTopic(newTopicTitle, newTopicDesc, targetType, targetId);
          showAlert('Sucesso', "Novo tema disponibilizado para a tropa!");
      }
      
      setNewTopicTitle('');
      setNewTopicDesc('');
      setTargetType('ALL');
      setTargetId('');
      setNewTopicDesc('');
      loadData();
  };

  const handleEditTopicClick = (topic: EssayTopic) => {
      setEditingTopicId(topic.id);
      setNewTopicTitle(topic.title);
      setNewTopicDesc(topic.description);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditTopic = () => {
      setEditingTopicId(null);
      setNewTopicTitle('');
      setNewTopicDesc('');
      setTargetType('ALL');
      setTargetId('');
  };

  const handleDeleteTopic = (id: string) => {
      showConfirm('Confirmação', "Atenção, Comandante! Tem certeza que deseja excluir este tema?", async () => {
          await EssayService.deleteTopic(id);
          loadData();
      });
  };

  if (!canAccess) return <div className="relative min-h-screen"><PremiumLock /></div>;

  return (
    <div className="bg-[#09090b] min-h-screen text-zinc-200 p-4 md:p-8 font-sans">
      <header className="mb-8 border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <PenTool className="text-red-600" size={32}/> 
            Redação <span className="text-zinc-600 ml-2 text-xl border-l border-zinc-800 pl-3">Mentoria Estratégica</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">Envie suas redações e receba correções detalhadas dos oficiais.</p>
        </div>
        
        {isAdminMode && (
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button 
                    onClick={() => setAdminTab('CORRECTIONS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'CORRECTIONS' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <CheckCircle size={14}/> Pendentes
                </button>
                <button 
                    onClick={() => setAdminTab('HISTORY')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'HISTORY' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <Archive size={14}/> Redações Recebidas
                </button>
                <button 
                    onClick={() => setAdminTab('TOPICS')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition ${adminTab === 'TOPICS' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    <ListIcon size={14}/> Gerenciar Temas
                </button>
            </div>
        )}
      </header>

      {/* --- VISíO DO PROFESSOR (ADMIN) --- */}
      {isAdminMode ? (
        <>
            {/* ABA: CORREÇÕES (PENDENTES) E ABA: HISTÓRICO (RECEBIDAS) */}
            {(adminTab === 'CORRECTIONS' || adminTab === 'HISTORY') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit">
                        <h3 className="text-white font-bold mb-4 uppercase flex items-center gap-2">
                            {adminTab === 'CORRECTIONS' ? <Clock className="text-yellow-500"/> : <Archive className="text-green-500"/>}
                            {adminTab === 'CORRECTIONS' ? 'Envios Pendentes' : 'Redações Recebidas (Corrigidas)'}
                        </h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {submissions.filter(s => adminTab === 'CORRECTIONS' ? s.status === 'PENDING' : s.status === 'DONE').map(sub => (
                                <div key={sub.id} onClick={() => handleAdminOpenCorrection(sub)} className={`p-4 bg-zinc-950 border rounded-lg cursor-pointer transition group ${adminTab === 'HISTORY' ? 'border-zinc-800 hover:border-green-600' : 'border-zinc-800 hover:border-red-600'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-bold transition ${adminTab === 'HISTORY' ? 'text-zinc-300 group-hover:text-green-500' : 'text-white group-hover:text-red-500'}`}>{sub.student_name}</p>
                                            <p className="text-xs text-zinc-500 mt-1">{sub.topic_title}</p>
                                        </div>
                                        {adminTab === 'CORRECTIONS' ? (
                                            <span className="text-[10px] bg-yellow-900/20 text-yellow-500 border border-yellow-900 px-2 py-1 rounded">Corrigir</span>
                                        ) : (
                                            <span className="text-[10px] bg-green-900/20 text-green-500 border border-green-900 px-2 py-1 rounded font-bold">Nota: {sub.review?.final_score}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2 flex justify-between">
                                        <span>Enviado: {new Date(sub.created_at).toLocaleDateString()}</span>
                                        {adminTab === 'HISTORY' && sub.review && <span>Corrigido em: {new Date(sub.review.created_at).toLocaleDateString()}</span>}
                                    </p>
                                </div>
                            ))}
                            {submissions.filter(s => adminTab === 'CORRECTIONS' ? s.status === 'PENDING' : s.status === 'DONE').length === 0 && (
                                <p className="text-zinc-500 italic p-4 text-center border border-zinc-800 rounded-lg border-dashed">
                                    {adminTab === 'CORRECTIONS' ? 'Nenhum envio pendente.' : 'Nenhuma redação corrigida ainda.'}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* PAINEL DE CORREÇíO / VISUALIZAÇíO */}
                    {adminReviewSub ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in sticky top-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold">
                                    {adminReviewSub.status === 'DONE' ? 'Visualizando Correção:' : 'Corrigindo:'} {adminReviewSub.student_name}
                                </h3>
                                <button onClick={() => setAdminReviewSub(null)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            {adminReviewSub.file_url && (
                                <a href={adminReviewSub.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-4 text-blue-400 hover:text-blue-300 bg-blue-900/20 p-3 rounded-lg border border-blue-900/50">
                                    <Link size={16}/> Ver Arquivo do Aluno
                                </a>
                            )}
                            
                            <div className="bg-zinc-950 p-4 rounded-lg mb-4 text-sm text-zinc-300 max-h-60 overflow-y-auto whitespace-pre-wrap border border-zinc-800 font-serif">
                                {adminReviewSub.content_text || "Texto não fornecido (Apenas arquivo)."}
                            </div>
                            
                            <div className="space-y-4 pt-4 border-t border-zinc-800">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2 mb-1">
                                        <Zap size={12} className="text-yellow-500"/> Prompt de Correção IA (Opcional)
                                    </label>
                                    <textarea 
                                        value={correctionPrompt}
                                        onChange={e => setCorrectionPrompt(e.target.value)}
                                        placeholder="Instruções específicas para a IA corrigir esta redação..."
                                        className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-xs text-zinc-400 outline-none focus:border-yellow-600 resize-none h-16"
                                    />
                                    <button 
                                        onClick={handleCorrectWithAI}
                                        disabled={isCorrectingAI || adminReviewSub.status === 'DONE' || !adminReviewSub.content_text}
                                        className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold py-2 rounded border border-zinc-700 flex items-center justify-center gap-2 text-xs transition disabled:opacity-50"
                                    >
                                        {isCorrectingAI ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14}/>}
                                        Sugerir Correção com IA
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Nota Final (0-100)</label>
                                    <input 
                                        type="number" 
                                        value={score} 
                                        onChange={e => setScore(Number(e.target.value))} 
                                        disabled={adminReviewSub.status === 'DONE'}
                                        className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white mt-1 outline-none focus:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Feedback Detalhado</label>
                                    <textarea 
                                        value={feedback} 
                                        onChange={e => setFeedback(e.target.value)} 
                                        disabled={adminReviewSub.status === 'DONE'}
                                        className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded text-white h-32 mt-1 outline-none focus:border-green-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                {adminReviewSub.status !== 'DONE' && (
                                    <button onClick={handleAdminSubmitCorrection} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                                        <CheckCircle size={18}/> Enviar Correção
                                    </button>
                                )}
                                {adminReviewSub.status === 'DONE' && (
                                    <div className="p-3 bg-green-900/20 border border-green-900 rounded text-green-500 text-center text-sm font-bold flex items-center justify-center gap-2">
                                        <CheckCircle size={16}/> Correção Enviada
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-center text-zinc-500 italic">
                            Selecione uma redação ao lado para {adminTab === 'CORRECTIONS' ? 'corrigir' : 'visualizar'}.
                        </div>
                    )}
                </div>
            )}

            {/* ABA: GERENCIAR TEMAS */}
            {adminTab === 'TOPICS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-1 space-y-6">
                        {/* Gerador IA */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-white font-bold mb-4 uppercase flex items-center gap-2 text-sm tracking-wide">
                                <Wand2 className="text-yellow-500"/> Gerar Tema com IA
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Banca</label>
                                    <input 
                                        value={aiBoard}
                                        onChange={e => setAiBoard(e.target.value)}
                                        placeholder="Ex: CEBRASPE, FGV..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1 text-xs outline-none focus:border-yellow-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Assunto</label>
                                    <input 
                                        value={aiSubject}
                                        onChange={e => setAiSubject(e.target.value)}
                                        placeholder="Ex: Segurança Pública, Ética..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1 text-xs outline-none focus:border-yellow-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Instruções Adicionais</label>
                                    <textarea 
                                        value={aiPrompt}
                                        onChange={e => setAiPrompt(e.target.value)}
                                        placeholder="Ex: Foque no papel da polícia municipal..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1 text-xs outline-none focus:border-yellow-600 resize-none h-20"
                                    />
                                </div>
                                <button 
                                    onClick={handleGenerateTopicAI}
                                    disabled={isGeneratingTopic}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold py-2 rounded border border-zinc-700 flex items-center justify-center gap-2 text-xs transition disabled:opacity-50"
                                >
                                    {isGeneratingTopic ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                                    Gerar Tema com IA
                                </button>
                            </div>
                        </div>

                        {/* Cadastro Manual */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit shadow-lg">
                            <h3 className="text-white font-bold mb-6 uppercase flex items-center gap-2 text-sm tracking-wide">
                                <Plus className="text-red-500"/> {editingTopicId ? 'Editar Tema' : 'Novo Tema Manual'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Título do Tema</label>
                                    <input 
                                        type="text" 
                                        value={newTopicTitle}
                                        onChange={e => setNewTopicTitle(e.target.value)}
                                        placeholder="Ex: A importância da Segurança Pública..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white mt-1 outline-none focus:border-red-600 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Texto Motivador e Critérios</label>
                                    <textarea 
                                        value={newTopicDesc}
                                        onChange={e => setNewTopicDesc(e.target.value)}
                                        placeholder="Insira os textos de apoio, instruções e critérios de correção aqui..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white h-64 mt-1 outline-none focus:border-red-600 resize-none text-sm leading-relaxed"
                                    />
                                </div>
                                {!editingTopicId && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 uppercase">Destinatário</label>
                                            <select 
                                                value={targetType}
                                                onChange={e => {
                                                    setTargetType(e.target.value as any);
                                                    setTargetId('');
                                                }}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white mt-1 outline-none focus:border-red-600 text-sm"
                                            >
                                                <option value="ALL">Todos os Alunos</option>
                                                <option value="PLAN">Plano de Estudo Específico</option>
                                                <option value="STUDENT">Aluno Específico</option>
                                            </select>
                                        </div>
                                        {targetType === 'PLAN' && (
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Selecione o Plano</label>
                                                <select 
                                                    value={targetId}
                                                    onChange={e => setTargetId(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white mt-1 outline-none focus:border-red-600 text-sm"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {allPlans.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {targetType === 'STUDENT' && (
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase">Selecione o Aluno</label>
                                                <select 
                                                    value={targetId}
                                                    onChange={e => setTargetId(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white mt-1 outline-none focus:border-red-600 text-sm"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {allUsers.map(u => (
                                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="pt-2 flex gap-3">
                                    <button 
                                        onClick={handleCreateOrUpdateTopic}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-red-900/20"
                                    >
                                        <Plus size={18}/> {editingTopicId ? 'Atualizar Tema' : 'Cadastrar Tema'}
                                    </button>
                                    {editingTopicId && (
                                        <button 
                                            onClick={handleCancelEditTopic}
                                            className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h3 className="text-white font-bold mb-6 uppercase flex items-center gap-2 text-sm tracking-wide">
                            <ListIcon className="text-zinc-500"/> Temas Ativos ({topics.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {topics.map(topic => (
                                <div key={topic.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-lg flex flex-col gap-3 group hover:border-zinc-700 transition">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-white font-bold text-lg">{topic.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-green-900/20 text-green-500 border border-green-900/50 px-2 py-1 rounded">Ativo</span>
                                            <button 
                                                onClick={() => handleEditTopicClick(topic)} 
                                                className="text-zinc-600 hover:text-blue-500 p-1 transition" 
                                                title="Editar Tema"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTopic(topic.id)} 
                                                className="text-zinc-600 hover:text-red-500 p-1 transition" 
                                                title="Excluir Tema"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-zinc-400 text-sm line-clamp-3 leading-relaxed">{topic.description}</p>
                                    <div className="pt-3 border-t border-zinc-900 flex justify-end">
                                        <span className="text-[10px] text-zinc-600 font-mono">ID: {topic.id.substring(0, 8)}...</span>
                                    </div>
                                </div>
                            ))}
                            {topics.length === 0 && (
                                <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                    Nenhum tema cadastrado. Crie o primeiro ao lado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
      ) : (
        
      /* --- VISÃO DO ALUNO --- */
      <div className="space-y-8">
          
          {/* VISUALIZAÇÃO: LISTA (PADRÃO) */}
          {activeView === 'LIST' && (
            <div className="space-y-8 animate-fade-in">
                {/* BANNER INFORMATIVO */}
                <div className="bg-gradient-to-r from-red-900/30 via-black to-black border border-red-500/20 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.15)]">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-600/20 rounded-full blur-[80px]"></div>
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-red-900/20 rounded-full blur-[80px]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <Sparkles className="text-red-500" size={24} /> Desbloqueie seu Potencial
                            </h3>
                            <p className="text-zinc-400 text-sm max-w-xl mt-2 leading-relaxed">
                                Escolha um dos temas abaixo para iniciar seu treinamento. Uma redação bem estruturada é a chave para a aprovação.
                            </p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="bg-black/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl w-full md:w-40 flex flex-col justify-between group hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest group-hover:text-zinc-400 transition-colors">Temas Ativos</p>
                                    <Sparkles className="text-red-500 group-hover:rotate-12 transition-transform duration-300" size={16}/>
                                </div>
                                <h3 className="text-3xl font-black text-red-500 tracking-tight mt-4">{topics.length}</h3>
                            </div>
                            <div className="bg-black/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl w-full md:w-40 flex flex-col justify-between group hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest group-hover:text-zinc-400 transition-colors">Enviadas</p>
                                    <Clock className="text-white group-hover:rotate-12 transition-transform duration-300" size={16}/>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tight mt-4">{submissions.length}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* COLUNA 1: NOVO ENVIO */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full relative group shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        <div className="p-6 border-b border-white/5 relative z-10">
                            <h3 className="text-white font-black uppercase text-lg tracking-tight flex items-center gap-3">
                                <PenTool size={20} className="text-red-500"/> Temas Disponíveis
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {topics.map(topic => (
                                <div key={topic.id} className="bg-black/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl hover:border-red-500/50 hover:bg-black/60 transition-all duration-300 group/card relative hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(220,38,38,0.1)]">
                                    <div className="pr-24">
                                        <h4 className="font-bold text-white text-base mb-2 group-hover/card:text-red-400 transition-colors">{topic.title}</h4>
                                        <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{topic.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleStartEssay(topic)}
                                        className="absolute right-5 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white text-xs font-black px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide"
                                    >
                                        Escrever <ChevronRight size={14}/>
                                    </button>
                                </div>
                            ))}
                            {topics.length === 0 && (
                                <div className="text-zinc-500 text-center py-12 border border-white/5 rounded-2xl bg-black/20 backdrop-blur-sm">
                                    <Sparkles size={32} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-sm font-medium">Nenhum tema disponível no momento.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUNA 2: HISTÓRICO */}
                    <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col h-full relative group shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        <div className="p-6 border-b border-white/5 relative z-10">
                            <h3 className="text-white font-black uppercase text-lg tracking-tight flex items-center gap-3">
                                <Clock size={20} className="text-blue-500"/> Meu Histórico
                            </h3>
                        </div>
                        <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {submissions.map(sub => {
                                const isDone = sub.status === 'DONE';
                                return (
                                    <div key={sub.id} className="bg-black/40 backdrop-blur-sm border border-white/5 p-5 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 hover:border-white/10 hover:bg-black/60 transition-all duration-300">
                                        <div className="flex-1">
                                            <p className="font-bold text-white text-base mb-1">{sub.topic_title}</p>
                                            <p className="text-xs text-zinc-500 flex items-center gap-1"><Clock size={12}/> Enviado em {new Date(sub.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        
                                        {isDone ? (
                                            <button 
                                                onClick={() => handleViewCorrection(sub)}
                                                className="bg-green-600 hover:bg-green-500 text-white text-xs font-black px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)] transition-all active:scale-95 w-full xl:w-auto uppercase tracking-wide shrink-0"
                                            >
                                                <CheckCircle size={16} className="shrink-0"/> Ver Correção
                                            </button>
                                        ) : (
                                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-xl flex items-center justify-center gap-2 w-full xl:w-auto shrink-0">
                                                <Clock size={14} className="shrink-0"/> Em Análise
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {submissions.length === 0 && (
                                <div className="text-zinc-500 text-center py-12 border border-white/5 rounded-2xl bg-black/20 backdrop-blur-sm">
                                    <Clock size={32} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-sm font-medium">Você ainda não enviou nenhuma redação.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* VISUALIZAÇíO: EDITOR */}
          {activeView === 'EDITOR' && selectedTopic && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-4xl mx-auto animate-fade-in">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <PenTool size={20} className="text-red-500"/> Escrever Redação
                      </h2>
                      <button onClick={() => setActiveView('LIST')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-sm font-bold">
                          <X size={16}/> Cancelar
                      </button>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-6">
                      <h3 className="text-red-500 font-bold text-sm uppercase mb-2">Tema Proposto</h3>
                      <p className="text-lg font-bold text-white mb-2">{selectedTopic.title}</p>
                      <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap font-serif border-t border-zinc-900 pt-2 mt-2">
                          {selectedTopic.description}
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Texto da Redação</label>
                          <textarea 
                              value={essayContent}
                              onChange={e => setEssayContent(e.target.value)}
                              placeholder="Digite seu texto aqui..."
                              className="w-full h-80 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-zinc-200 outline-none focus:border-red-600 resize-none font-serif leading-relaxed text-base"
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ou Link do Arquivo (PDF/Imagem)</label>
                          <div className="flex gap-2">
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-zinc-500">
                                  <Link size={18}/>
                              </div>
                              <input 
                                  type="text" 
                                  value={essayFileUrl}
                                  onChange={e => setEssayFileUrl(e.target.value)}
                                  placeholder="Cole aqui o link do Google Drive..."
                                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-red-600 text-sm"
                              />
                          </div>
                      </div>

                      <div className="flex justify-end pt-4">
                          <button 
                              onClick={handleSubmit}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition transform hover:scale-105"
                          >
                              <Send size={18}/> Enviar para Correção
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* VISUALIZAÇíO: CORREÇíO (DEVOLUTIVA) */}
          {activeView === 'CORRECTION' && viewingSubmission && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-4xl mx-auto animate-fade-in shadow-2xl">
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                      <h2 className="text-xl font-bold text-green-500 flex items-center gap-2">
                          <CheckCircle size={24}/> Devolutiva da Redação
                      </h2>
                      <button onClick={() => setActiveView('LIST')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-sm font-bold">
                          <X size={16}/> Fechar
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 text-center">
                          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Nota Final</p>
                          <div className="text-5xl font-black text-white mb-2">{viewingSubmission.review?.final_score}</div>
                          <div className="flex justify-center gap-1 text-yellow-500">
                              {[1,2,3,4,5].map(i => <Star key={i} size={16} fill={i <= (viewingSubmission.review?.final_score || 0)/20 ? "currentColor" : "none"} />)}
                          </div>
                      </div>
                      
                      <div className="md:col-span-2 bg-green-900/10 border border-green-900/30 p-6 rounded-xl">
                          <p className="text-green-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                              <PenTool size={14}/> Feedback do Professor
                          </p>
                          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {viewingSubmission.review?.feedback_text}
                          </p>
                      </div>
                  </div>

                  <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Seu Texto Original</p>
                      <div className="text-zinc-400 text-sm font-serif leading-relaxed whitespace-pre-wrap">
                          {viewingSubmission.content_text || "Texto enviado via arquivo."}
                      </div>
                      {viewingSubmission.file_url && (
                          <div className="mt-4 pt-4 border-t border-zinc-800">
                              <a href={viewingSubmission.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-bold">
                                  <Link size={14}/> Visualizar Arquivo Enviado
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          )}

      </div>
      )}
      <Dialog 
        isOpen={dialog.isOpen} 
        type={dialog.type} 
        title={dialog.title} 
        message={dialog.message} 
        onConfirm={handleDialogConfirm} 
        onCancel={() => setDialog({ ...dialog, isOpen: false })} 
        inputPlaceholder={dialog.inputPlaceholder}
      />
    </div>
  );
};
