
import React, { useState, useEffect } from 'react';
import { Filter, Play, CheckCircle, XCircle, Video, Book, AlertCircle, Search, RefreshCw, ChevronDown, ChevronUp, Crosshair, Target, Shield, Skull, BarChart2, Plus, Bookmark, List, Trash2, FolderOpen, Calendar, MessageSquare, Send, User, Flag, ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react';
import { QBQuestion, QBFilters, Difficulty, QuestionType, QBNotebook, QBComment, QBReport } from './types';
import { QuestionBankService } from './service';
import { supabase } from '../services/supabase';
import { QuestionPieChart, EvolutionChart, PrecisãonWaveChart } from '../components/ui/Charts';
import { Dialog, DialogType } from '../components/ui/Dialog';

const MultiSelect = ({ 
    label, 
    options, 
    selected, 
    onChange, 
    placeholder = "Selecionar..." 
}: { 
    label: string, 
    options: string[], 
    selected: string[], 
    onChange: (val: string[]) => void,
    placeholder?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="relative">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none cursor-pointer flex justify-between items-center min-h-[38px]"
            >
                <span className="truncate text-xs">
                    {selected.length === 0 ? placeholder : 
                     selected.length === 1 ? selected[0] : 
                     `${selected.length} selecionados`}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2">
                        {options.length === 0 ? (
                            <p className="text-zinc-500 text-xs p-2 italic text-center">Nenhuma opção disponível</p>
                        ) : (
                            options.map(opt => (
                                <label key={opt} className="flex items-center gap-2 p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={selected.includes(opt)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleOption(opt);
                                        }}
                                        className="rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600"
                                    />
                                    <span className="text-xs text-zinc-300">{opt}</span>
                                </label>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export const QuestionBankPanel = ({ studentId, onUpdateStats }: { studentId: string, onUpdateStats?: (correct: number, incorrect: number, subject?: string) => void }) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'QUESTIONS' | 'PERFORMANCE' | 'NOTEBOOKS'>('QUESTIONS');

  // Common State
  const [questions, setQuestions] = useState<QBQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // Question Execution State (Per Question)
  const [selectedAlts, setSelectedAlts] = useState<Record<string, string | null>>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>({});
  const [resolutions, setResolutions] = useState<Record<string, {comment_text: string, video_url?: string, legal_basis?: string} | null>>({});
  const [loadingResolutions, setLoadingResolutions] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Comments State (Per Question)
  const [questionComments, setQuestionComments] = useState<Record<string, QBComment[]>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<{questionId: string, commentId: string, userName: string} | null>(null);
  const [userName, setUserName] = useState('Aluno');

  // Notebooks State
  const [notebooks, setNotebooks] = useState<QBNotebook[]>([]);
  const [showNotebookModal, setShowNotebookModal] = useState(false); // Modal to add question
  const [newNotebookName, setNewNotebookName] = useState('');
  const [selectedNotebookForFilter, setSelectedNotebookForFilter] = useState<string | null>(null);

  // Reports State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('ERRO_GABARITO');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Filter Options Data
  const [filterOptions, setFilterOptions] = useState<{
      disciplines: string[];
      boards: string[];
      organs: string[];
      roles: string[];
      subjects: string[];
      sub_subjects: string[];
      sources: string[];
      disciplineToSubjects: Record<string, string[]>;
      subjectToSubSubjects: Record<string, string[]>;
  }>({ 
      disciplines: [], boards: [], organs: [], roles: [], subjects: [], sub_subjects: [], sources: [],
      disciplineToSubjects: {}, subjectToSubSubjects: {}
  });

  // Filters State
  const [showFilters, setShowFilters] = useState(true);
  const [stats, setStats] = useState({ total: 0, accuracy: 0, correct: 0, history: [] as any[] });
  const [filters, setFilters] = useState<QBFilters>({
    discipline: [],
    board: '',
    organ: '',
    role: '',
    subject: [],
    sub_subject: [],
    source: '',
    year: undefined,
    difficulty: undefined,
    type: undefined,
    keyword: '',
    status: 'ALL',
    page: 1,
    pageSize: 10
  });

  // Estado para filtro de data do gráfico de precisão
  const [precisionDateFilter, setPrecisãonDateFilter] = useState<{ start: string; end: string }>({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Últimos 30 dias por padrão
      end: new Date().toISOString().split('T')[0]
  });

  // Dialog State
  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      type: DialogType;
      title: string;
      message: string;
      onConfirm?: (value?: string) => void;
      onCancel?: () => void;
      inputPlaceholder?: string;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: undefined, onCancel: () => setDialog(null) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel: () => setDialog(null) });
  };

  const handlediçãogConfirm = (value?: string) => {
      if (dialog?.onConfirm) dialog.onConfirm(value);
      setDialog(prev => prev ? { ...prev, isOpen: false } : null);
  };

  // Load Initial Data
  useEffect(() => {
    loadQuestions(); // Load initial batch
    loadStats();
    loadFilterOptions();
    loadNotebooks();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!studentId) return;
    try {
      const { data: profile } = await supabase.from('users').select('full_name').eq('id', studentId).single();
      if (profile?.full_name) setUserName(profile.full_name);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadComments = async (qId: string) => {
    setLoadingComments(prev => ({ ...prev, [qId]: true }));
    try {
      const data = await QuestionBankService.getComments(qId);
      setQuestionComments(prev => ({ ...prev, [qId]: data }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleAddComment = async (qId: string) => {
    const commentText = newComments[qId];
    if (!commentText?.trim()) return;
    
    try {
      await QuestionBankService.addComment({
        question_id: qId,
        user_id: studentId,
        user_name: userName,
        comment_text: commentText,
        parent_id: replyingTo?.questionId === qId ? replyingTo.commentId : null
      });
      setNewComments(prev => ({ ...prev, [qId]: '' }));
      if (replyingTo?.questionId === qId) setReplyingTo(null);
      loadComments(qId);
    } catch (error) {
      console.error("Error adding comment:", error);
      showAlert('Erro', 'Não foi possível enviar seu comentário. Verifique sua conexão.');
    }
  };

  const handleToggleLike = async (commentId: string, qId: string) => {
    try {
      await QuestionBankService.toggleLike(commentId, studentId);
      loadComments(qId);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const loadNotebooks = async () => {
      const nb = await QuestionBankService.getUserNotebooks(studentId);
      setNotebooks(nb);
  };

  const loadFilterOptions = async () => {
      const { data } = await supabase.from('qb_questions').select('discipline, board, organ, role, subject, sub_subject, source').eq('is_active', true);
      if (data) {
          const safeData = data as Record<string, any>[];
          
          const disciplines = new Set<string>();
          const boards = new Set<string>();
          const organs = new Set<string>();
          const roles = new Set<string>();
          const subjects = new Set<string>();
          const sub_subjects = new Set<string>();
          const sources = new Set<string>();
          
          const disciplineToSubjects: Record<string, Set<string>> = {};
          const subjectToSubSubjects: Record<string, Set<string>> = {};

          safeData.forEach(item => {
              if (item.discipline) {
                  disciplines.add(item.discipline);
                  if (item.subject) {
                      if (!disciplineToSubjects[item.discipline]) disciplineToSubjects[item.discipline] = new Set();
                      disciplineToSubjects[item.discipline].add(item.subject);
                  }
              }
              if (item.board) boards.add(item.board);
              if (item.organ) organs.add(item.organ);
              if (item.role) roles.add(item.role);
              if (item.subject) {
                  subjects.add(item.subject);
                  if (item.sub_subject) {
                      if (!subjectToSubSubjects[item.subject]) subjectToSubSubjects[item.subject] = new Set();
                      subjectToSubSubjects[item.subject].add(item.sub_subject);
                  }
              }
              if (item.sub_subject) sub_subjects.add(item.sub_subject);
              if (item.source) sources.add(item.source);
          });

          const setToSortedArray = (s: Set<string>) => [...s].filter(v => v && v.length > 0).sort();
          
          const disciplineToSubjectsArr: Record<string, string[]> = {};
          Object.keys(disciplineToSubjects).forEach(k => {
              disciplineToSubjectsArr[k] = setToSortedArray(disciplineToSubjects[k]);
          });

          const subjectToSubSubjectsArr: Record<string, string[]> = {};
          Object.keys(subjectToSubSubjects).forEach(k => {
              subjectToSubSubjectsArr[k] = setToSortedArray(subjectToSubSubjects[k]);
          });

          setFilterOptions({
              disciplines: setToSortedArray(disciplines),
              boards: setToSortedArray(boards),
              organs: setToSortedArray(organs),
              roles: setToSortedArray(roles),
              subjects: setToSortedArray(subjects),
              sub_subjects: setToSortedArray(sub_subjects),
              sources: setToSortedArray(sources),
              disciplineToSubjects: disciplineToSubjectsArr,
              subjectToSubSubjects: subjectToSubSubjectsArr
          });
      }
  };

  const loadQuestions = async (overrideFilters?: QBFilters, page = 1) => {
    setLoading(true);
    const filtersToUse = overrideFilters || filters;
    const cleanFilters: QBFilters = {
        ...filtersToUse,
        page,
        pageSize
    };
    
    // Cleaning empty filters
    Object.entries(cleanFilters).forEach(([key, value]) => {
        if (value === '' || value === undefined || value === false) {
            // @ts-ignore
            delete cleanFilters[key];
        }
    });

    try {
        const { questions: data, totalCount: count } = await QuestionBankService.fetchQuestions(cleanFilters, studentId);
        setQuestions(data);
        setTotalCount(count);
        setCurrentPage(page);
        
        // Reset states for the new batch of questions
        resetQuestionState();
        
        // Expand the first question by default if it's a new load
        if (data.length > 0) {
            setExpandedQuestions({ [data[0].id]: true });
            loadComments(data[0].id);
        }
    } catch (error) {
        console.error("Error loading questions:", error);
        showAlert('Erro', 'Não foi possível carregar as questões.');
    } finally {
        setLoading(false);
        if(window.innerWidth < 768) setShowFilters(false);
    }
  };

  const loadStats = async () => {
    const s = await QuestionBankService.getUserStats(studentId);
    // @ts-ignore
    setStats(s);
  };

  const resetQuestionState = () => {
    setSelectedAlts({});
    setAnsweredQuestions({});
    setResolutions({});
    setLoadingResolutions({});
    setExpandedQuestions({});
    setQuestionComments({});
    setNewComments({});
  };

  const handleAnswer = async (qId: string) => {
    const selectedAlt = selectedAlts[qId];
    if (!selectedAlt || answeredQuestions[qId]) return;
    
    const question = questions.find(q => q.id === qId);
    if (!question) return;

    const isCorrect = question.alternatives.find(a => a.id === selectedAlt)?.is_correct || false;
    
    setAnsweredQuestions(prev => ({ ...prev, [qId]: true }));
    
    try {
        await QuestionBankService.submitAnswer(studentId, {
            question_id: qId,
            selected_alternative_id: selectedAlt,
            is_correct: isCorrect,
            time_spent_seconds: 0
        });
        loadStats();
        if (onUpdateStats) {
            let discipline = question.discipline;
            let subject = question.subject;
            let subSubject = question.sub_subject;

            // Fix hierarchy mapping
            if (discipline === 'ASPECTOS GEOGráficos') {
                discipline = 'GEOGRAFIA DE ALAGOAS';
                subject = 'ASPECTOS GEOGráficos';
            }

            const hierarchy = [discipline, subject, subSubject].filter(Boolean).join('|');
            onUpdateStats(isCorrect ? 1 : 0, isCorrect ? 0 : 1, hierarchy);
        }
    } catch (error) {
        console.error("Error submitting answer:", error);
    }
  };

  const fetchResolution = async (qId: string) => {
    if (resolutions[qId]) return;
    setLoadingResolutions(prev => ({ ...prev, [qId]: true }));
    try {
        const resData = await QuestionBankService.fetchResolution(qId);
        setResolutions(prev => ({ 
            ...prev, 
            [qId]: resData || { comment_text: "O professor não disponibilizou o gabarito comentado para esta tarefa." } 
        }));
    } catch (error) {
        console.error(error);
    } finally {
        setLoadingResolutions(prev => ({ ...prev, [qId]: false }));
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadQuestions(filters, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => {
        const newState = { ...prev, [qId]: !prev[qId] };
        if (newState[qId] && !questionComments[qId]) {
            loadComments(qId);
        }
        return newState;
    });
  };

  const handleFilterChange = (key: keyof QBFilters, value: any) => {
    setFilters(prev => {
        const newFilters = { ...prev, [key]: value };
        
        // Reset dependent filters when parent changes
        if (key === 'discipline') {
            newFilters.subject = [];
            newFilters.sub_subject = [];
        } else if (key === 'subject') {
            newFilters.sub_subject = [];
        }
        
        return newFilters;
    });
  };

  // Derived filter options based on current selections
  const availableSubjects = React.useMemo(() => {
    if (!filters.discipline || (filters.discipline as string[]).length === 0) return [];
    const subjects = new Set<string>();
    (filters.discipline as string[]).forEach(d => {
      const s = filterOptions.disciplineToSubjects[d];
      if (s) s.forEach(subject => subjects.add(subject));
    });
    return [...subjects].sort();
  }, [filters.discipline, filterOptions.disciplineToSubjects]);

  const availableSubSubjects = React.useMemo(() => {
    if (!filters.subject || (filters.subject as string[]).length === 0) return [];
    const subSubjects = new Set<string>();
    (filters.subject as string[]).forEach(s => {
      const ss = filterOptions.subjectToSubSubjects[s];
      if (ss) ss.forEach(sub => subSubjects.add(sub));
    });
    return [...subSubjects].sort();
  }, [filters.subject, filterOptions.subjectToSubSubjects]);

  // --- Notebook Logic ---
  const handleCreateNotebook = async () => {
      if (!newNotebookName) return;
      await QuestionBankService.createNotebook(studentId, newNotebookName);
      setNewNotebookName('');
      loadNotebooks();
  };

  const handleAddToNotebook = async (notebookId: string) => {
      // Logic to add the first expanded question or a specific one
      const qId = Object.keys(expandedQuestions).find(id => expandedQuestions[id]);
      if(!qId) {
          showAlert('Aviso', 'Expanda uma questão para adicioná-la ao caderno.');
          return;
      }
      await QuestionBankService.addQuestionToNotebook(studentId, notebookId, qId);
      setShowNotebookModal(false);
      showAlert('Sucesso', 'Questão adicionada ao caderno com sucesso!');
      loadNotebooks(); // Refresh counts
  };

  const handleDeleteNotebook = async (notebookId: string) => {
      showConfirm('Excluir Caderno', 'Tem certeza que deseja excluir este caderno?', async () => {
          await QuestionBankService.deleteNotebook(studentId, notebookId);
          loadNotebooks();
          if(selectedNotebookForFilter === notebookId) {
              setSelectedNotebookForFilter(null);
              setFilters(prev => ({...prev, notebookId: undefined}));
              loadQuestions({...filters, notebookId: undefined});
          }
      });
  };

  const openNotebook = (notebookId: string) => {
      setSelectedNotebookForFilter(notebookId);
      const newFilters = { ...filters, notebookId: notebookId, only_mistakes: false }; // Reset other special filters
      setFilters(newFilters);
      setActiveTab('QUESTIONS');
      loadQuestions(newFilters);
  };

  const handleRequestProfessorAnswer = async (qId: string) => {
    try {
        const existingComments = await QuestionBankService.getComments(qId);
        const alreadyRequested = existingComments.some(c => c.comment_text === '[PROF_GABARITO_REQ]' && c.user_id === studentId);
        
        if (alreadyRequested) {
            showAlert('Aviso', 'Você já solicitou o gabarito do professor para esta questão.');
            return;
        }

        await QuestionBankService.addComment({
            question_id: qId,
            user_id: studentId,
            user_name: userName,
            comment_text: '[PROF_GABARITO_REQ]'
        });
        showAlert('Sucesso', 'Solicitação enviada com sucesso.');
    } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao solicitar gabarito.');
    }
  };

  const handleReportQuestion = async () => {
    const qId = questions[0]?.id; // Fallback or logic to get current question ID
    if (!qId || !reportDescription.trim()) return;
    setIsReporting(true);
    try {
      await QuestionBankService.createReport({
        question_id: qId,
        user_id: studentId,
        user_name: userName,
        report_type: reportType,
        description: reportDescription,
        status: 'PENDING'
      });
      setShowReportModal(false);
      setReportDescription('');
      showAlert('Sucesso', 'Denúncia enviada com sucesso. Nossa equipe irá analisar.');
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao enviar denúncia.');
    } finally {
      setIsReporting(false);
    }
  };

  // Processamento de dados para o gráfico de ondas (Precisão Global)
  const accuracyWaveData = React.useMemo(() => {
      if (!stats.history || stats.history.length === 0) return [];
      
      const grouped: Record<string, { total: number, correct: number }> = {};
      
      // Datas de filtro
      const startDate = precisionDateFilter.start ? new Date(precisionDateFilter.start) : null;
      const endDate = precisionDateFilter.end ? new Date(precisionDateFilter.end) : null;
      
      // Ajuste para incluir o final do dia na data final
      if (endDate) endDate.setHours(23, 59, 59, 999);

      // Agrupar por data com filtro
      stats.history.forEach((h: any) => {
          const itemDate = new Date(h.created_at);
          
          // Aplicar Filtro de Data
          if (startDate && itemDate < startDate) return;
          if (endDate && itemDate > endDate) return;

          const dateStr = itemDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          if (!grouped[dateStr]) grouped[dateStr] = { total: 0, correct: 0 };
          grouped[dateStr].total++;
          if (h.is_correct) grouped[dateStr].correct++;
      });

      // Transformar em array e calcular porcentagem
      // Ordena pelas chaves (datas) pode ser necessário dependendo de como as keys são geradas, mas o sort do gráfico cuida disso ou o input original
      return Object.keys(grouped).map(date => ({
          date,
          accuracy: Math.round((grouped[date].correct / grouped[date].total) * 100)
      }));
  }, [stats.history, precisionDateFilter]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-4 lg:p-8 font-sans">
      
      {/* Header */}
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Crosshair className="text-red-600" size={32}/> 
            CAMPO DE <span className="text-red-600">TIRO</span>
        </h1>
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Treinamento Intensivo de Questões</p>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('QUESTIONS')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'QUESTIONS' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <List size={18}/> Questões
            </button>
            <button 
                onClick={() => setActiveTab('NOTEBOOKS')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'NOTEBOOKS' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <Book size={18}/> Cadernos de Erros
            </button>
            <button 
                onClick={() => setActiveTab('PERFORMANCE')} 
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-bold text-sm uppercase tracking-wide border-b-2 transition-all ${activeTab === 'PERFORMANCE' ? 'bg-zinc-800 border-red-600 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
                <BarChart2 size={18}/> Desempenho
            </button>
        </div>
      </header>

      {/* --- TAB: Questões --- */}
      {activeTab === 'QUESTIONS' && (
          <div className="animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl mb-8 overflow-hidden shadow-lg">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex justify-between items-center p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors"
                >
                    <span className="font-bold text-sm uppercase flex items-center gap-2 text-zinc-300">
                        <Search size={16} /> 
                        {selectedNotebookForFilter ? `Filtrando pelo Caderno: ${notebooks.find(n => n.id === selectedNotebookForFilter)?.name}` : 'Parâmetros da Tarefa (Filtros)'}
                    </span>
                    {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showFilters && (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#0c0c0e]">
                        {selectedNotebookForFilter && (
                            <div className="col-span-4 bg-red-900/20 border border-red-600 p-3 rounded flex justify-between items-center mb-2">
                                <span className="text-red-200 text-sm font-bold flex items-center gap-2"><Book size={16}/> Você está resolvendo o caderno: {notebooks.find(n => n.id === selectedNotebookForFilter)?.name}</span>
                                <button onClick={() => { setSelectedNotebookForFilter(null); setFilters(prev => ({...prev, notebookId: undefined})); }} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Sair do Caderno</button>
                            </div>
                        )}

                        <input 
                            placeholder="Busca estratégica (palavra-chave)..." 
                            className="col-span-1 md:col-span-2 lg:col-span-4 bg-zinc-950 border border-zinc-800 p-3 rounded text-sm text-white focus:border-red-600 outline-none uppercase placeholder:normal-case"
                            value={filters.keyword}
                            onChange={e => handleFilterChange('keyword', e.target.value)}
                        />
                        
                        {/* SELECTS POPULADOS COM DADOS REAIS */}
                        <MultiSelect 
                            label="Disciplina"
                            options={filterOptions.disciplines}
                            selected={filters.discipline as string[] || []}
                            onChange={val => handleFilterChange('discipline', val)}
                            placeholder="Todas"
                        />
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Banca</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.board}
                                onChange={e => handleFilterChange('board', e.target.value)}
                            >
                                <option value="">Todas</option>
                                {filterOptions.boards.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Órgão</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.organ}
                                onChange={e => handleFilterChange('organ', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.organs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Cargo</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.role}
                                onChange={e => handleFilterChange('role', e.target.value)}
                            >
                                <option value="">Todos</option>
                                {filterOptions.roles.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <MultiSelect 
                            label="Assunto"
                            options={availableSubjects}
                            selected={filters.subject as string[] || []}
                            onChange={val => handleFilterChange('subject', val)}
                            placeholder="Todos"
                        />
                        <MultiSelect 
                            label="Subassunto"
                            options={availableSubSubjects}
                            selected={filters.sub_subject as string[] || []}
                            onChange={val => handleFilterChange('sub_subject', val)}
                            placeholder="Todos"
                        />
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Ano</label>
                            <input 
                                type="number"
                                placeholder="Ex: 2024"
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.year || ''}
                                onChange={e => handleFilterChange('year', e.target.value ? Number(e.target.value) : undefined)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Dificuldade</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.difficulty || ''}
                                onChange={e => handleFilterChange('difficulty', e.target.value || undefined)}
                            >
                                <option value="">Todas</option>
                                <option value="EASY">Fácil (Recruta)</option>
                                <option value="MEDIUM">Médio (Padrão)</option>
                                <option value="HARD">Difícil (Caveira)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.type || ''}
                                onChange={e => handleFilterChange('type', e.target.value || undefined)}
                            >
                                <option value="">Todos</option>
                                <option value="ABCDE">Múltipla Escolha (ABCDE)</option>
                                <option value="ABCD">Múltipla Escolha (ABCD)</option>
                                <option value="CERTO_ERRADO">Certo / Errado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Status</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.status || 'ALL'}
                                onChange={e => handleFilterChange('status', e.target.value)}
                            >
                                <option value="ALL">Todas</option>
                                <option value="SOLVED">Resolvidas</option>
                                <option value="UNSOLVED">Não Resolvidas</option>
                                <option value="CORRECT">Acertos</option>
                                <option value="INCORRECT">Erros</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Fonte</label>
                            <select 
                                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white mt-1 focus:border-red-600 outline-none"
                                value={filters.source}
                                onChange={e => handleFilterChange('source', e.target.value)}
                            >
                                <option value="">Todas</option>
                                {filterOptions.sources.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                            <button 
                                onClick={() => loadQuestions(filters, 1)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 uppercase tracking-wider disabled:opacity-50"
                                disabled={loading}
                            >
                                <Filter size={18} /> 
                                {loading ? 'Buscando...' : `Executar Varredura (${totalCount} Questões)`}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Question Display */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse text-zinc-500">
                    <RefreshCw size={40} className="animate-spin mb-4 text-red-600"/>
                    <p className="uppercase tracking-widest font-bold">Carregando munição estratégica...</p>
                </div>
            ) : questions.length > 0 ? (
                <div className="max-w-4xl mx-auto space-y-6">
                    {questions.map((q, qIdx) => {
                        const qCode = `Q-${q.id.slice(0, 5).toUpperCase()}`;
                        const isExpanded = expandedQuestions[q.id];
                        const isAnswered = answeredQuestions[q.id];
                        const selectedAlt = selectedAlts[q.id];
                        const resolution = resolutions[q.id];
                        const comments = questionComments[q.id] || [];
                        const newComment = newComments[q.id] || '';
                        const isLoadingComments = loadingComments[q.id];
                        const isLoadingResolution = loadingResolutions[q.id];

                        return (
                            <div key={q.id} className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl bg-[#0c0c0e] transition-all hover:border-zinc-700">
                                {/* Question Header / Summary */}
                                <div 
                                    onClick={() => toggleExpand(q.id)}
                                    className="p-4 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center cursor-pointer hover:bg-zinc-900 transition-colors"
                                >
                                    <div className="flex gap-2 flex-wrap items-center">
                                        <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-900/50 font-mono uppercase">{qCode}</span>
                                        <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Alvo {(currentPage - 1) * pageSize + qIdx + 1}</span>
                                        <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{q.board}</span>
                                        <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{q.year}</span>
                                        <span className="bg-zinc-900 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 uppercase">{q.discipline}</span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${q.difficulty === 'HARD' ? 'bg-red-900/30 text-red-500 border-red-900' : q.difficulty === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-900' : 'bg-green-900/30 text-green-500 border-green-900'}`}>
                                            {q.difficulty === 'EASY' ? 'Fácil' : q.difficulty === 'MEDIUM' ? 'Médio' : 'Difícil'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {isAnswered && (
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${q.alternatives.find(a => a.id === selectedAlt)?.is_correct ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                                {q.alternatives.find(a => a.id === selectedAlt)?.is_correct ? 'Acerto' : 'Erro'}
                                            </span>
                                        )}
                                        {isExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="animate-fade-in">
                                        {/* Statement */}
                                        <div className="p-6 md:p-8 border-b border-zinc-800">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Enunciado</span>
                                                {q.source && <span className="text-[10px] text-zinc-600 uppercase font-mono">Fonte: {q.source}</span>}
                                            </div>
                                            <p className="text-lg text-zinc-200 leading-relaxed font-serif whitespace-pre-wrap">
                                                {q.statement}
                                            </p>
                                        </div>

                                        {/* Alternatives */}
                                        <div className="bg-[#0c0c0e] p-6 space-y-3">
                                            {q.alternatives.map(alt => {
                                                let statusClass = "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900";
                                                
                                                if (isAnswered) {
                                                    if (alt.is_correct) statusClass = "bg-green-900/20 border-green-600 text-green-400";
                                                    else if (selectedAlt === alt.id && !alt.is_correct) statusClass = "bg-red-900/20 border-red-600 text-red-400 opacity-80";
                                                    else statusClass = "opacity-40 border-zinc-800 grayscale";
                                                } else if (selectedAlt === alt.id) {
                                                    statusClass = "bg-zinc-800 border-red-600 text-white shadow-lg";
                                                }

                                                return (
                                                    <button
                                                        key={alt.id}
                                                        disabled={isAnswered}
                                                        onClick={() => setSelectedAlts(prev => ({ ...prev, [q.id]: alt.id }))}
                                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex gap-4 items-start ${statusClass}`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${isAnswered && alt.is_correct ? 'bg-green-600 border-green-600 text-white' : 'border-zinc-600 text-zinc-500'}`}>
                                                            {alt.label}
                                                        </div>
                                                        <span className="flex-1">{alt.text}</span>
                                                        {isAnswered && alt.is_correct && <CheckCircle size={20} className="flex-shrink-0 text-green-500" />}
                                                        {isAnswered && selectedAlt === alt.id && !alt.is_correct && <XCircle size={20} className="flex-shrink-0 text-red-500" />}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Actions */}
                                        <div className="bg-zinc-900/80 p-6 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setShowReportModal(true)}
                                                    className="text-zinc-500 hover:text-red-500 flex items-center gap-1 text-[10px] font-bold uppercase transition bg-zinc-900/50 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800"
                                                >
                                                    <Flag size={12}/> Reportar
                                                </button>
                                                <button 
                                                    onClick={() => handleRequestProfessorAnswer(q.id)}
                                                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1 text-[10px] font-bold uppercase transition bg-zinc-900/50 border border-blue-900/30 px-2 py-1 rounded hover:bg-zinc-900/10"
                                                >
                                                    <BookOpen size={12}/> Gabarito do Professor
                                                </button>
                                                <button 
                                                    onClick={() => setShowNotebookModal(true)}
                                                    className="text-zinc-400 hover:text-white flex items-center gap-1 text-[10px] font-bold uppercase transition bg-zinc-900 border border-zinc-800 px-3 py-1 rounded hover:bg-zinc-800"
                                                >
                                                    <Bookmark size={14}/> + Caderno
                                                </button>
                                            </div>

                                            {!isAnswered ? (
                                                <button 
                                                    onClick={() => handleAnswer(q.id)}
                                                    disabled={!selectedAlt}
                                                    className={`w-full md:w-auto px-10 py-3 rounded-lg font-bold text-white transition-all shadow-lg uppercase tracking-wider ${selectedAlt ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-800 cursor-not-allowed text-zinc-500'}`}
                                                >
                                                    Confirmar Disparo
                                                </button>
                                            ) : (
                                                <div className="flex gap-4">
                                                    {!resolution && (
                                                        <button 
                                                            onClick={() => fetchResolution(q.id)}
                                                            disabled={isLoadingResolution}
                                                            className="px-6 py-3 rounded-lg font-bold border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-wide"
                                                        >
                                                            {isLoadingResolution ? <RefreshCw className="animate-spin" size={18}/> : <Book size={18}/>}
                                                            Solicitar Apoio
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Resolution */}
                                        {resolution && (
                                            <div className="bg-yellow-900/5 p-6 border-t border-zinc-800 border-l-4 border-l-yellow-600">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Shield className="text-yellow-500" size={18}/>
                                                    <h3 className="text-yellow-500 font-bold uppercase text-xs tracking-wider">Resumo Explicativo</h3>
                                                </div>
                                                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-serif text-lg">{resolution.comment_text}</p>
                                                {resolution.video_url && (
                                                    <a href={resolution.video_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold uppercase text-xs">
                                                        <Video size={16}/> Ver Vídeo de Instrução
                                                    </a>
                                                )}
                                                
                                                {resolution.legal_basis && (
                                                    <div className="mt-6 pt-6 border-t border-zinc-800/50">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <Book className="text-blue-500" size={18}/>
                                                            <h3 className="text-blue-500 font-bold uppercase text-xs tracking-wider">Gabarito do Professor</h3>
                                                        </div>
                                                        <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-serif text-lg">{resolution.legal_basis}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Comments */}
                                        <div className="bg-zinc-950/50 border-t border-zinc-800 p-6">
                                            <div className="flex items-center gap-2 mb-6">
                                                <MessageSquare size={16} className="text-blue-500" />
                                                <h3 className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Mural de Discussão</h3>
                                            </div>

                                            <div className="flex flex-col gap-3 mb-6">
                                                {replyingTo?.questionId === q.id && (
                                                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-400">
                                                        <span>Respondendo a <strong className="text-zinc-200">{replyingTo.userName}</strong></span>
                                                        <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <textarea 
                                                        value={newComment}
                                                        onChange={e => setNewComments(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        placeholder={replyingTo?.questionId === q.id ? "Escreva sua resposta..." : "Deixe seu comentário..."}
                                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none min-h-[60px]"
                                                    />
                                                    <button 
                                                        onClick={() => handleAddComment(q.id)}
                                                        disabled={!newComment.trim()}
                                                        className="self-end p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {isLoadingComments ? (
                                                    <RefreshCw size={16} className="animate-spin mx-auto text-zinc-700" />
                                                ) : comments.length > 0 ? (
                                                    comments.map(comment => {
                                                        const renderComment = (c: QBComment, depth = 0) => {
                                                            const cUserName = c.users?.name || c.user_name;
                                                            const cUserAvatar = c.users?.avatar;
                                                            const cUserRole = c.users?.role;
                                                            const isLiked = c.likes?.some(l => l.user_id === studentId);
                                                            const likesCount = c.likes?.length || 0;
                                                            
                                                            return (
                                                                <div key={c.id} className={`flex flex-col gap-3 ${depth > 0 ? 'ml-8 mt-3' : ''}`}>
                                                                    <div className="flex gap-3">
                                                                        {cUserAvatar ? (
                                                                            <img src={cUserAvatar} alt={cUserName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-700" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 text-[10px] font-bold text-zinc-400">
                                                                                {cUserName.slice(0, 2).toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-[10px] font-bold text-zinc-300">{cUserName}</span>
                                                                                {cUserRole && cUserRole !== 'STUDENT' && (
                                                                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">
                                                                                        {cUserRole === 'MASTER_ADMIN' ? 'Admin' : cUserRole === 'PROFESSOR' ? 'Professor' : cUserRole}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-[10px] text-zinc-600">{new Date(c.created_at).toLocaleDateString()}</span>
                                                                            </div>
                                                                            <p className="text-xs text-zinc-400 bg-zinc-900/30 p-2 rounded border border-zinc-800">
                                                                                {c.comment_text}
                                                                            </p>
                                                                            <div className="flex items-center gap-4 mt-2">
                                                                                <button 
                                                                                    onClick={() => handleToggleLike(c.id, q.id)}
                                                                                    className={`text-[10px] font-bold flex items-center gap-1 transition ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                                                >
                                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                                                                    {likesCount}
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => setReplyingTo({ questionId: q.id, commentId: c.id, userName: cUserName })}
                                                                                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition"
                                                                                >
                                                                                    Responder
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {c.replies && c.replies.length > 0 && (
                                                                        <div className="flex flex-col">
                                                                            {c.replies.map(reply => renderComment(reply, depth + 1))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        };

                                                        return renderComment(comment);
                                                    })
                                                ) : (
                                                    <p className="text-center text-[10px] text-zinc-600 italic">Nenhum comentário ainda.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Págination */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages || 1}</span>
                            <span className="ml-4 text-zinc-600">|</span>
                            <span className="ml-4">Total: <span className="text-red-500">{totalCount}</span> Alvos</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronLeft size={16} className="mr-[-8px]"/><ChevronLeft size={16}/>
                            </button>
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 text-xs font-bold uppercase flex items-center gap-1"
                            >
                                <ChevronLeft size={16}/> Ant.
                            </button>
                            
                            <div className="flex items-center gap-1 px-2">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum = currentPage;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 text-xs font-bold uppercase flex items-center gap-1"
                            >
                                Próx. <ChevronRight size={16}/>
                            </button>
                            <button 
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronRight size={16}/><ChevronRight size={16} className="ml-[-8px]"/>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-zinc-500 flex flex-col items-center border-2 border-dashed border-zinc-800 rounded-xl bg-[#0c0c0e]">
                    <Target size={48} className="mb-4 text-zinc-700"/>
                    <p className="mb-2 text-xl font-bold text-zinc-400 uppercase tracking-widest">Área Limpa</p>
                    <p className="text-sm">Nenhum alvo encontrado com os parâmetros atuais.</p>
                    <button onClick={() => setShowFilters(true)} className="mt-4 text-red-500 font-bold hover:underline uppercase text-xs">Reconfigurar Parâmetros</button>
                </div>
            )}
          </div>
      )}

      {/* --- TAB: CADERNOS DE ERROS --- */}
      {activeTab === 'NOTEBOOKS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
              {/* Left Col: List */}
              <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-fit">
                  <h3 className="text-white font-bold uppercase text-sm mb-4 flex items-center gap-2"><Book size={16}/> Meus Cadernos</h3>
                  
                  {/* Create New */}
                  <div className="flex gap-2 mb-6">
                      <input 
                          value={newNotebookName}
                          onChange={e => setNewNotebookName(e.target.value)}
                          placeholder="Novo Caderno..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white outline-none focus:border-red-600"
                      />
                      <button onClick={handleCreateNotebook} className="bg-red-600 text-white p-2 rounded hover:bg-red-700"><Plus size={18}/></button>
                  </div>

                  {/* List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {notebooks.map(nb => (
                          <div key={nb.id} className="group flex justify-between items-center p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-600 transition">
                              <div onClick={() => openNotebook(nb.id)} className="cursor-pointer flex-1">
                                  <p className="font-bold text-sm text-zinc-200 group-hover:text-white">{nb.name}</p>
                                  <p className="text-xs text-zinc-500">{nb.questionIds.length} questões</p>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => openNotebook(nb.id)} className="text-zinc-500 hover:text-green-500" title="Abrir"><Play size={16}/></button>
                                  <button onClick={() => handleDeleteNotebook(nb.id)} className="text-zinc-500 hover:text-red-500" title="Excluir"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                      {notebooks.length === 0 && <p className="text-zinc-500 text-xs text-center italic py-4">Nenhum caderno criado.</p>}
                  </div>
              </div>

              {/* Right Col: Instructions */}
              <div className="md:col-span-2 bg-[#0c0c0e] border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <Book size={48} className="text-zinc-700 mb-4"/>
                  <h2 className="text-xl font-bold text-white mb-2 uppercase">Gestão de Cadernos</h2>
                  <p className="text-zinc-400 text-sm max-w-md">
                      Crie cadernos personalizados para organizar seus erros ou tópicos prioritários.
                      Para adicionar uma questão, clique no ícone <span className="inline-flex items-center gap-1 bg-zinc-800 px-1 rounded text-xs font-bold text-white"><Bookmark size={10}/> + CADERNO</span> presente no cartão da questão durante a resolução.
                  </p>
                  <button onClick={() => setActiveTab('QUESTIONS')} className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded font-bold uppercase text-xs tracking-wide">
                      Ir para Questões
                  </button>
              </div>
          </div>
      )}

      {/* --- TAB: DESEMPENHO --- */}
      {activeTab === 'PERFORMANCE' && (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* General Stats */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center justify-center">
                      <div className="w-full flex justify-between items-center mb-4">
                          <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Desempenho</h3>
                          <div className="flex gap-2">
                              <div className="relative">
                                  <input 
                                      type="date" 
                                      className="bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 outline-none focus:border-red-600"
                                      value={precisionDateFilter.start}
                                      onChange={(e) => setPrecisãonDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                  />
                              </div>
                              <div className="relative">
                                  <input 
                                      type="date" 
                                      className="bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 outline-none focus:border-red-600"
                                      value={precisionDateFilter.end}
                                      onChange={(e) => setPrecisãonDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                  />
                              </div>
                          </div>
                      </div>
                      <div className="w-full h-40">
                          <PrecisãonWaveChart data={accuracyWaveData} />
                      </div>
                      <p className="text-2xl font-black text-white mt-4">{stats.accuracy.toFixed(1)}%</p>
                      <p className="text-zinc-500 text-xs">de aproveitamento médio</p>
                  </div>

                  {/* Volume */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-center">
                      <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-6">Volume de Fogo</h3>
                      <div className="space-y-4">
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Questões Resolvidas</span>
                                  <span className="text-white font-bold">{stats.total}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{width: '100%'}}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Acertos</span>
                                  <span className="text-green-500 font-bold">{stats.correct}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-green-600" style={{width: `${stats.accuracy}%`}}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span className="text-zinc-300">Erros</span>
                                  <span className="text-red-500 font-bold">{stats.total - stats.correct}</span>
                              </div>
                              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-red-600" style={{width: `${100 - stats.accuracy}%`}}></div></div>
                          </div>
                      </div>
                  </div>

                  {/* Evolution (Placeholder for now as existing data structure in stats might be simple) */}
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                      <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Evolução Recente</h3>
                      {stats.history && stats.history.length > 0 ? (
                          <div className="h-40">
                              {/* Reuse generic chart or simple list */}
                              <div className="space-y-2">
                                  {stats.history.slice(-5).reverse().map((h: any, i: number) => (
                                      <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-1">
                                          <span className="text-zinc-500">{new Date(h.created_at).toLocaleDateString()}</span>
                                          <span className={`font-bold ${h.is_correct ? 'text-green-500' : 'text-red-500'}`}>{h.is_correct ? 'ACERTO' : 'ERRO'}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <p className="text-zinc-600 text-xs italic">Sem dados suficientes para gerar gráfico de evolução.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: Add to Notebook */}
      {showNotebookModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold uppercase text-sm">Adicionar ao Caderno</h3>
                      <button onClick={() => setShowNotebookModal(false)}><XCircle className="text-zinc-500 hover:text-white"/></button>
                  </div>
                  
                  {/* Create New Inside Modal */}
                  <div className="flex gap-2 mb-4">
                      <input 
                          value={newNotebookName}
                          onChange={e => setNewNotebookName(e.target.value)}
                          placeholder="Criar novo..."
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white outline-none focus:border-red-600"
                      />
                      <button onClick={handleCreateNotebook} className="bg-zinc-800 text-white p-2 rounded hover:bg-zinc-700 border border-zinc-700"><Plus size={18}/></button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notebooks.map(nb => (
                          <button 
                              key={nb.id} 
                              onClick={() => handleAddToNotebook(nb.id)}
                              className="w-full text-left p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-red-600 transition flex justify-between items-center group"
                          >
                              <span className="font-bold text-zinc-300 group-hover:text-white text-sm">{nb.name}</span>
                              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{nb.questionIds.length} Qs</span>
                          </button>
                      ))}
                      {notebooks.length === 0 && <p className="text-zinc-500 text-xs text-center italic">Nenhum caderno disponível.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
              <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Flag size={16} className="text-red-500"/> Reportar Erro na Questão</h3>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white"><XCircle size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-400 italic">Identificou algum erro no gabarito, enunciado ou alternativas? Informe-nos para que possamos corrigir.</p>
              
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Tipo de Erro</label>
                <select 
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white outline-none focus:border-red-600"
                >
                  <option value="ERRO_GABARITO">Erro no Gabarito</option>
                  <option value="ERRO_ENUNCIADO">Erro no Enunciado</option>
                  <option value="ERRO_ALTERNATIVAS">Erro nas Alternativas</option>
                  <option value="QUESTAO_DESATUALIZADA">Questão Desatualizada</option>
                  <option value="OUTRO">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1 block">Descrição Detalhada</label>
                <textarea 
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Explique o erro encontrado..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-sm text-white outline-none focus:border-red-600 min-h-[100px] resize-none"
                />
              </div>

              <button 
                onClick={handleReportQuestion}
                disabled={isReporting || !reportDescription.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isReporting ? <RefreshCw className="animate-spin" size={18}/> : <Send size={18}/>}
                Enviar Denúncia
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={dialog?.isOpen || false}
        type={dialog?.type || 'alert'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        onConfirm={handlediçãogConfirm}
        onCancel={() => setDialog(null)}
        inputPlaceholder={dialog?.inputPlaceholder}
      />
    </div>
  );
};
