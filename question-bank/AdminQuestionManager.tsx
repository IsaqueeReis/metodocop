
import React, { useState, useEffect } from 'react';
import { Play, Loader2, PlusCircle, Save, Trash2, Edit3, CheckCircle, XCircle, Zap, Folder, FileText, ChevronRight, ChevronDown, Search, ArrowLeft, Flag, Check, MessageSquare, RefreshCw, User } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionBankService } from './service';
import { Difficulty, QuestionType, QBQuestion, QBReport } from './types';
import { Dialog, DialogType } from '../components/ui/Dialog';
import { supabase } from '../services/supabase';

export const AdminQuestionManager = () => {
  const [viewMode, setViewMode] = useState<'generator' | 'explorer' | 'reports' | 'gabaritos'>('generator');
  const [board, setBoard] = useState('');
  const [type, setType] = useState<QuestionType>('ABCDE');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [discipline, setDiscipline] = useState('');
  const [subject, setSubject] = useState('');
  const [subSubject, setSubSubject] = useState('');
  const [role, setRole] = useState('Geral');
  const [organ, setOrgan] = useState('Inédita');
  const [count, setCount] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  // Filter Options Data
  const [filterOptions, setFilterOptions] = useState<{
      disciplines: string[];
      subjects: string[];
      sub_subjects: string[];
      disciplineToSubjects: Record<string, string[]>;
      subjectToSubSubjects: Record<string, string[]>;
  }>({ 
      disciplines: [], subjects: [], sub_subjects: [],
      disciplineToSubjects: {}, subjectToSubSubjects: {}
  });

  // Derived filter options based on current selections
  const availableSubjects = React.useMemo(() => {
    if (!discipline) return [];
    return filterOptions.disciplineToSubjects[discipline] || [];
  }, [discipline, filterOptions.disciplineToSubjects]);

  const availableSubSubjects = React.useMemo(() => {
    if (!subject) return [];
    return filterOptions.subjectToSubSubjects[subject] || [];
  }, [subject, filterOptions.subjectToSubSubjects]);

  // Explorer States
  const [allQuestions, setAllQuestions] = useState<QBQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<QBQuestion | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Reports States
  const [reports, setReports] = useState<QBReport[]>([]);
  const [gabaritosRequests, setGabaritosRequests] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');

  const [dialog, setDialog] = useState<{
      isOpen: boolean;
      type: DialogType;
      title: string;
      message: string;
      onConfirm?: (value?: string) => void;
      onCancel?: () => void;
      inputPlaceholder?: string;
  } | null>(null);

  useEffect(() => {
    loadFilterOptions();
    if (viewMode === 'explorer') {
      loadAllQuestions();
    } else if (viewMode === 'reports') {
      loadReports();
    } else if (viewMode === 'gabaritos') {
      loadGabaritosRequests();
    }
  }, [viewMode]);

  const loadFilterOptions = async () => {
    const { data } = await supabase.from('qb_questions').select('discipline, subject, sub_subject').eq('is_active', true);
    if (data) {
        const safeData = data as Record<string, any>[];
        
        const disciplines = new Set<string>();
        const subjects = new Set<string>();
        const sub_subjects = new Set<string>();
        
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
            if (item.subject) {
                subjects.add(item.subject);
                if (item.sub_subject) {
                    if (!subjectToSubSubjects[item.subject]) subjectToSubSubjects[item.subject] = new Set();
                    subjectToSubSubjects[item.subject].add(item.sub_subject);
                }
            }
            if (item.sub_subject) sub_subjects.add(item.sub_subject);
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
            subjects: setToSortedArray(subjects),
            sub_subjects: setToSortedArray(sub_subjects),
            disciplineToSubjects: disciplineToSubjectsArr,
            subjectToSubSubjects: subjectToSubSubjectsArr
        });
    }
  };

  const loadGabaritosRequests = async () => {
    setLoading(true);
    try {
        const { data } = await supabase.from('qb_comments').select('*').eq('comment_text', '[PROF_GABARITO_REQ]');
        if (data && data.length > 0) {
            const grouped = data.reduce((acc: any, c: any) => {
                if (!acc[c.question_id]) acc[c.question_id] = { question_id: c.question_id, count: 0, comments: [] };
                acc[c.question_id].count += 1;
                acc[c.question_id].comments.push(c);
                return acc;
            }, {});
            
            const sorted = Object.values(grouped).sort((a: any, b: any) => b.count - a.count);
            
            // Fetch question details for each request
            const qIds = sorted.map((req: any) => req.question_id);
            const { data: questionsData } = await supabase.from('qb_questions').select('id, discipline, subject').in('id', qIds);
            
            if (questionsData) {
                sorted.forEach((req: any) => {
                    const q = questionsData.find(q => q.id === req.question_id);
                    if (q) {
                        req.discipline = q.discipline;
                        req.subject = q.subject;
                    }
                });
            }
            
            setGabaritosRequests(sorted);
        } else {
            setGabaritosRequests([]);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await QuestionBankService.getAllReports();
      setReports(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: 'RESOLVED' | 'PENDING') => {
    try {
      await QuestionBankService.updateReportStatus(reportId, status);
      loadReports();
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao atualizar status do reporte.');
    }
  };

  const loadAllQuestions = async () => {
    setLoading(true);
    try {
      const questions = await QuestionBankService.getAllQuestions();
      setAllQuestions(questions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionCode = (id: string) => `Q-${id.slice(0, 5).toUpperCase()}`;

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) ? prev.filter(f => f !== folderId) : [...prev, folderId]
    );
  };

  const showAlert = (title: string, message: string) => {
    setDialog({ isOpen: true, type: 'alert', title, message, onConfirm: undefined, onCancel: () => setDialog(null) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, type: 'confirm', title, message, onConfirm: () => onConfirm(), onCancel: () => setDialog(null) });
  };

  const showPrompt = (title: string, message: string, placeholder: string, onConfirm: (val: string) => void) => {
    setDialog({ isOpen: true, type: 'prompt', title, message, inputPlaceholder: placeholder, onConfirm: (val) => onConfirm(val || ''), onCancel: () => setDialog(null) });
  };

  const handleDeleteQuestion = async (id: string) => {
    showConfirm('Excluir Questão', 'Tem certeza que deseja excluir esta questão permanentemente?', async () => {
      setLoading(true);
      try {
        await QuestionBankService.deleteQuestion(id);
        showAlert('Sucesso', 'Questão excluída com sucesso.');
        setSelectedQuestion(null);
        loadAllQuestions();
      } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao excluir questão.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleRenameDiscipline = async (oldName: string) => {
    showPrompt('Renomear Matéria', `Novo nome para "${oldName}":`, oldName, async (newName) => {
      if (!newName || newName === oldName) return;
      setLoading(true);
      try {
        await QuestionBankService.renameDiscipline(oldName, newName);
        showAlert('Sucesso', 'Matéria renomeada com sucesso.');
        loadAllQuestions();
      } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao renomear matéria.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleRenameSubject = async (discipline: string, oldName: string) => {
    showPrompt('Renomear Assunto', `Novo nome para "${oldName}":`, oldName, async (newName) => {
      if (!newName || newName === oldName) return;
      setLoading(true);
      try {
        await QuestionBankService.renameSubject(discipline, oldName, newName);
        showAlert('Sucesso', 'Assunto renomeado com sucesso.');
        loadAllQuestions();
      } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao renomear assunto.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteDiscipline = async (name: string) => {
    showConfirm('Excluir Matéria', `Tem certeza que deseja excluir a matéria "${name}" e TODAS as suas questões?`, async () => {
      setLoading(true);
      try {
        await QuestionBankService.deleteDiscipline(name);
        showAlert('Sucesso', 'Matéria excluída com sucesso.');
        loadAllQuestions();
      } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao excluir matéria.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteSubject = async (discipline: string, name: string) => {
    showConfirm('Excluir Assunto', `Tem certeza que deseja excluir o assunto "${name}" e TODAS as suas questões?`, async () => {
      setLoading(true);
      try {
        await QuestionBankService.deleteSubject(discipline, name);
        showAlert('Sucesso', 'Assunto excluído com sucesso.');
        loadAllQuestions();
      } catch (error) {
        console.error(error);
        showAlert('Erro', 'Erro ao excluir assunto.');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSelectQuestionForEdit = async (q: QBQuestion) => {
    setLoading(true);
    try {
      const res = await QuestionBankService.fetchResolution(q.id);
      setSelectedQuestion({ ...q, resolution: res || { comment_text: '', legal_basis: '' } });
      setIsEditing(true);
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao carregar resolução da questão.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!selectedQuestion) return;
    setLoading(true);
    try {
      await QuestionBankService.updateQuestion(selectedQuestion.id, selectedQuestion);
      
      // Se adicionou gabarito do professor, resolve os pedidos
      if (selectedQuestion.resolution?.legal_basis) {
          await supabase.from('qb_comments').delete().eq('question_id', selectedQuestion.id).eq('comment_text', '[PROF_GABARITO_REQ]');
          // Reload requests
          loadGabaritosRequests();
      }

      showAlert('Sucesso', 'Questão atualizada com sucesso!');
      setIsEditing(false);
      loadAllQuestions();
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao atualizar questão.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!board || !discipline || !subject) {
      showAlert('Aviso', 'Por favor, preencha Banca, Matéria e Assunto.');
      return;
    }

    setLoading(true);
    setStreamingText('');
    try {
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Chave da API Gemini não encontrada. Verifique as configurações do ambiente.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let typeDescription = '';
      if (type === 'CERTO_ERRADO') typeDescription = 'Certo ou Errado (2 alternativas)';
      else if (type === 'ABCD') typeDescription = 'Múltipla escolha com 4 alternativas (A, B, C, D)';
      else typeDescription = 'Múltipla escolha com 5 alternativas (A, B, C, D, E)';

      const prompt = `Você é um especialista em concursos públicos de alto nível. Crie ${count} questões inéditas e extremamente rigorosas.
Banca: ${board}
Órgão: ${organ}
Cargo: ${role}
Matéria: ${discipline}
Assunto: ${subject}
${subSubject ? `Subassunto: ${subSubject}` : ''}
Dificuldade: ${difficulty === 'EASY' ? 'Fácil' : difficulty === 'MEDIUM' ? 'Média' : 'Difícil'}
Modalidade: ${typeDescription}

${customPrompt ? `PEDIDO ADICIONAL DO USUÁRIO: ${customPrompt}` : ''}

INSTRUÇÕES CRÍTICAS DE QUALIDADE:
1. ESTILO DA BANCA: As questões devem mimetizar PERFEITAMENTE o estilo, vocêbulário técnico, profundidade e as "pegadinhas" típicas da banca ${board}.
2. GABARITO COMENTADO: A justificativa deve ser uma aula. Explique por que a correta está certa e por que CADA UMA das incorretas está errada.
3. FONTES REAIS E CITAÇÕES: Você DEVE citar fontes reais e oficiais. 
   - Se for Direito: Cite Artigos da Constituição, Leis (ex: Lei 8.112/90), Jurisprudência do STF/STJ (Informativos, Súmulas).
   - Se for outra matéria: Cite autores renomados, manuais técnicos ou normas oficiais.
   - Formato da citação: "Conforme o Art. X da Lei Y...", "Segundo a doutrina de Z...", "De acordo com o entendimento fixado pelo STF no RE...".
4. ESTRUTURA: Se houver subassunto (${subSubject}), a questão deve ser focada especificamente nele dentro do contexto do assunto principal. O subassunto é uma ramificação específica do assunto principal.
5. ORIGINALIDADE: As questões devem ser inéditas, mas baseadas no rigor das provas reais da banca.

Retorne um array JSON de objetos com as seguintes chaves:
- statement: O enunciado completo e bem estruturado.
- alternatives: Array de objetos com { label (A, B, C, etc ou C, E), text (texto da alternativa), is_correct (boolean) }. Apenas UMA alternativa deve ser true.
- justification: O comentário detalhado com as citações de fontes reais.`;

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                statement: { type: Type.STRING },
                alternatives: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING },
                      is_correct: { type: Type.BOOLEAN }
                    },
                    required: ["label", "text", "is_correct"]
                  }
                },
                justification: { type: Type.STRING }
              },
              required: ["statement", "alternatives", "justification"]
            }
          }
        }
      });

      let fullText = '';
      for await (const chunk of response) {
        const text = chunk.text;
        fullText += text;
        setStreamingText(fullText);
      }

      if (!fullText) {
        throw new Error('Nenhuma resposta recebida da IA.');
      }

      const data = JSON.parse(fullText);
      setGeneratedQuestions(data);
      setIsReviewing(true);
      
    } catch (error: any) {
      console.error('Erro na geração administrativa:', error);
      showAlert('Erro', `Ocorreu um erro ao gerar as questões: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      for (const q of generatedQuestions) {
        await QuestionBankService.createQuestion({
          ...q,
          type,
          board,
          discipline,
          subject,
          sub_subject: subSubject,
          difficulty,
          year: new Date().getFullYear(),
          organ,
          role,
        });
      }
      showAlert('Sucesso', `${generatedQuestions.length} questões salvas com sucesso no banco de dados!`);
      setGeneratedQuestions([]);
      setIsReviewing(false);
    } catch (error) {
      console.error(error);
      showAlert('Erro', 'Erro ao salvar as questões no banco.');
    } finally {
      setLoading(false);
    }
  };

  const removeGeneratedQuestion = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

    if (viewMode === 'gabaritos') {
    return (
        <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900 min-h-[600px]">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-6">Gabaritos Solicitados</h2>
            <div className="space-y-2">
                {gabaritosRequests.map((req: any) => (
                    <div key={req.question_id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold text-white uppercase">{req.discipline || 'Desconhecido'}</p>
                            <p className="text-sm text-zinc-400 uppercase">{req.subject || 'Sem assunto'}</p>
                            <p className="text-xs text-zinc-500 mt-1">Questão: {getQuestionCode(req.question_id)} • Solicitações: <span className="text-red-500 font-bold">{req.count}</span></p>
                        </div>
                        <button 
                            onClick={async () => {
                                let q = allQuestions.find(q => q.id === req.question_id);
                                if (!q) {
                                    const { data } = await supabase.from('qb_questions').select('*').eq('id', req.question_id).single();
                                    if (data) q = data as any;
                                }
                                if (q) {
                                    handleSelectQuestionForEdit(q);
                                    setViewMode('explorer');
                                } else {
                                    showAlert('Erro', 'Questão não encontrada.');
                                }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold"
                        >
                            Responder
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  if (viewMode === 'explorer') {
    const groupedQuestions = allQuestions.reduce((acc: any, q) => {
      if (!acc[q.discipline]) acc[q.discipline] = {};
      if (!acc[q.discipline][q.subject]) acc[q.discipline][q.subject] = [];
      acc[q.discipline][q.subject].push(q);
      return acc;
    }, {});

    return (
      <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900 min-h-[600px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Folder size={20} className="text-blue-500" />
              Explorador ({allQuestions.length} Questões)
            </h2>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => setViewMode('explorer')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition ${viewMode === 'explorer' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Questões
              </button>
              <button 
                onClick={() => setViewMode('reports')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition ${viewMode === 'reports' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Reports
              </button>
              <button 
                onClick={() => setViewMode('gabaritos')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition ${viewMode === 'gabaritos' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Gabaritos
              </button>
            </div>
          </div>
          <button 
            onClick={() => setViewMode('generator')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold transition flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Novo Gerador IA
          </button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por código, enunciado ou assunto..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 transition outline-none"
          />
        </div>

        {selectedQuestion ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-fade-in">
            <button 
              onClick={() => { setSelectedQuestion(null); setIsEditing(false); }}
              className="mb-4 text-zinc-500 hover:text-white flex items-center gap-2 transition"
            >
              <ArrowLeft size={18} /> Voltar para a lista
            </button>

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50 font-bold uppercase mb-2 inline-block">
                  {getQuestionCode(selectedQuestion.id)}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedQuestion.discipline} - {selectedQuestion.subject}</h3>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="p-2 text-zinc-500 hover:text-white transition"><XCircle size={20} /></button>
                    <button onClick={handleUpdateQuestion} className="p-2 text-green-500 hover:text-green-400 transition"><Save size={20} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleSelectQuestionForEdit(selectedQuestion)} className="p-2 text-zinc-500 hover:text-blue-500 transition"><Edit3 size={20} /></button>
                    <button onClick={() => handleDeleteQuestion(selectedQuestion.id)} className="p-2 text-zinc-500 hover:text-red-500 transition"><Trash2 size={20} /></button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <textarea 
                  value={selectedQuestion.statement}
                  onChange={e => setSelectedQuestion({...selectedQuestion, statement: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-4 text-white min-h-[150px]"
                />
                <div className="space-y-2">
                  {selectedQuestion.alternatives.map((alt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input 
                        type="checkbox" 
                        checked={alt.is_correct} 
                        onChange={e => {
                          const newAlts = selectedQuestion.alternatives.map((a, i) => i === idx ? {...a, is_correct: e.target.checked} : {...a, is_correct: false});
                          setSelectedQuestion({...selectedQuestion, alternatives: newAlts});
                        }}
                      />
                      <span className="w-8 text-center font-bold text-zinc-500">{alt.label}</span>
                      <input 
                        value={alt.text}
                        onChange={e => {
                          const newAlts = selectedQuestion.alternatives.map((a, i) => i === idx ? {...a, text: e.target.value} : a);
                          setSelectedQuestion({...selectedQuestion, alternatives: newAlts});
                        }}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-white"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-bold text-zinc-400 mb-2">Gabarito do Professor</label>
                  <textarea 
                    value={selectedQuestion.resolution?.legal_basis || ''}
                    onChange={e => setSelectedQuestion({...selectedQuestion, resolution: { ...selectedQuestion.resolution, comment_text: selectedQuestion.resolution?.comment_text || '', legal_basis: e.target.value }})}
                    placeholder="Insira o gabarito comentado pelo professor aqui..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-4 text-white min-h-[100px]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedQuestion.statement}</p>
                <div className="space-y-2">
                  {selectedQuestion.alternatives.map((alt, idx) => (
                    <div key={idx} className={`p-4 rounded border ${alt.is_correct ? 'bg-green-900/10 border-green-800/50 text-green-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                      <span className="font-bold mr-3">{alt.label})</span>
                      {alt.text}
                    </div>
                  ))}
                </div>
                {selectedQuestion.resolution?.legal_basis && (
                  <div className="mt-6 p-4 bg-blue-900/10 border border-blue-900/50 rounded-lg">
                    <h4 className="font-bold text-blue-400 mb-2 uppercase text-xs tracking-wider">Gabarito do Professor</h4>
                    <p className="text-zinc-300 whitespace-pre-wrap">{selectedQuestion.resolution.legal_basis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {Object.keys(groupedQuestions).map(disc => (
              <div key={disc} className="border border-zinc-800 rounded-lg overflow-hidden">
                <div 
                  onClick={() => toggleFolder(disc)}
                  className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Folder size={18} className="text-yellow-500" />
                    <span className="font-bold text-white">{disc}</span>
                  </div>
                  <div className="flex items-center gap-2 mr-4 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRenameDiscipline(disc); }}
                      className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded transition"
                      title="Renomear Matéria"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteDiscipline(disc); }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                      title="Excluir Matéria"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {expandedFolders.includes(disc) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                
                {expandedFolders.includes(disc) && (
                  <div className="bg-zinc-950 p-2 space-y-1">
                    {Object.keys(groupedQuestions[disc]).map(subj => (
                      <div key={subj} className="ml-4">
                        <div 
                          onClick={() => toggleFolder(`${disc}-${subj}`)}
                          className="w-full flex items-center justify-between p-2 hover:bg-zinc-900 rounded transition text-sm cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Folder size={16} className="text-zinc-500" />
                            <span className="text-zinc-300">{subj}</span>
                            <span className="text-[10px] bg-zinc-800 px-1.5 rounded text-zinc-500">{groupedQuestions[disc][subj].length}</span>
                          </div>
                          <div className="flex items-center gap-2 mr-4 opacity-0 group-hover:opacity-100 transition">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRenameSubject(disc, subj); }}
                              className="p-1 text-zinc-600 hover:text-blue-400 hover:bg-zinc-800 rounded transition"
                              title="Renomear Assunto"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteSubject(disc, subj); }}
                              className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                              title="Excluir Assunto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {expandedFolders.includes(`${disc}-${subj}`) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>

                        {expandedFolders.includes(`${disc}-${subj}`) && (
                          <div className="mt-1 space-y-1 ml-4">
                            {groupedQuestions[disc][subj]
                              .filter((q: QBQuestion) => 
                                q.statement.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                getQuestionCode(q.id).toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .map((q: QBQuestion) => (
                                <button 
                                  key={q.id}
                                  onClick={() => setSelectedQuestion(q)}
                                  className="w-full flex items-center justify-between p-2 hover:bg-zinc-800 rounded transition text-xs group"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={14} className="text-zinc-600 shrink-0" />
                                    <span className="text-zinc-500 font-mono shrink-0">{getQuestionCode(q.id)}</span>
                                    <span className="text-zinc-400 truncate">{q.statement.slice(0, 60)}...</span>
                                  </div>
                                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-white transition" />
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(groupedQuestions).length === 0 && (
              <div className="text-center py-20 text-zinc-600">
                <Folder size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma questão encontrada no banco.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'reports') {
    const filteredReports = reports.filter(r => {
      if (reportFilter === 'ALL') return true;
      return r.status === reportFilter;
    });

    return (
      <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900 min-h-[600px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4 items-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flag size={20} className="text-red-500" />
              Reports de Erros
            </h2>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => setViewMode('explorer')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition ${viewMode === 'explorer' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Questões
              </button>
              <button 
                onClick={() => setViewMode('reports')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition ${viewMode === 'reports' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Reports
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={reportFilter}
              onChange={e => setReportFilter(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-bold uppercase text-zinc-400 outline-none"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendentes</option>
              <option value="RESOLVED">Resolvidos</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredReports.map(report => (
            <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${report.status === 'RESOLVED' ? 'bg-green-900/20 text-green-500 border-green-900/50' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50'}`}>
                    {report.status === 'RESOLVED' ? 'Resolvido' : 'Pendente'}
                  </span>
                  <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50 font-mono font-bold">
                    {report.question_code || `Q-${report.question_id.slice(0, 5).toUpperCase()}`}
                  </span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-bold uppercase">
                    {report.report_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  {report.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleUpdateReportStatus(report.id, 'RESOLVED')}
                      className="p-1.5 bg-green-900/20 text-green-500 hover:bg-green-900/40 rounded transition"
                      title="Marcar como Resolvido"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdateReportStatus(report.id, 'PENDING')}
                      className="p-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition"
                      title="Marcar como Pendente"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const q = allQuestions.find(q => q.id === report.question_id);
                      if (q) {
                        setSelectedQuestion(q);
                        setViewMode('explorer');
                      } else {
                        showAlert('Aviso', 'Questão não encontrada no cache. Tente recarregar o explorador.');
                      }
                    }}
                    className="p-1.5 bg-blue-900/20 text-blue-500 hover:bg-blue-900/40 rounded transition"
                    title="Ver Questão"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MessageSquare size={14} className="text-zinc-600 mt-1 shrink-0" />
                  <p className="text-sm text-zinc-300 leading-relaxed">{report.description}</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase">
                  <span className="flex items-center gap-1"><User size={10}/> {report.user_name || 'Aluno'}</span>
                  <span>{new Date(report.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-20 text-zinc-600">
              <Flag size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhum reporte encontrado para este filtro.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isReviewing) {
    return (
      <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Revisar Questões Geradas ({generatedQuestions.length})
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setGeneratedQuestions([]);
                setIsReviewing(false);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-500 rounded font-bold transition flex items-center gap-2"
            >
              <XCircle size={18} />
              Descartar Todas
            </button>
            <button 
              onClick={handleSaveAll}
              disabled={loading || generatedQuestions.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Aprovar e Salvar no Banco
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {generatedQuestions.map((q, idx) => (
            <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
              <button 
                onClick={() => removeGeneratedQuestion(idx)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
              
              <div className="mb-4">
                <span className="text-[10px] bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50 font-bold uppercase mb-2 inline-block">
                  Questão {idx + 1}
                </span>
                <p className="text-white font-medium leading-relaxed">{q.statement}</p>
              </div>

              <div className="space-y-2 mb-4">
                {q.alternatives.map((alt: any, aIdx: number) => (
                  <div 
                    key={aIdx} 
                    className={`p-3 rounded border flex items-center gap-3 ${alt.is_correct ? 'bg-green-900/20 border-green-800/50' : 'bg-zinc-950 border-zinc-800'}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${alt.is_correct ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {alt.label}
                    </span>
                    <span className={alt.is_correct ? 'text-green-400' : 'text-zinc-300'}>{alt.text}</span>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                  <Play size={12} className="text-red-500" /> Gabarito Comentado & Fontes
                </h4>
                <p className="text-sm text-zinc-400 italic leading-relaxed">{q.justification}</p>
              </div>
            </div>
          ))}

          {generatedQuestions.length === 0 && (
            <div className="text-center py-12 bg-zinc-900 rounded-xl border border-dashed border-zinc-800">
              <p className="text-zinc-500">Nenhuma questão para revisar. Volte e gere novamente.</p>
            </div>
          )}
        </div>

        <Dialog
          isOpen={dialog?.isOpen || false}
          type={dialog?.type || 'alert'}
          title={dialog?.title || ''}
          message={dialog?.message || ''}
          onConfirm={() => {
              if (dialog?.onConfirm) dialog.onConfirm();
              setDialog(null);
          }}
          onCancel={() => setDialog(null)}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#09090b] text-zinc-200 p-6 rounded-xl border border-zinc-900">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Play size={20} className="text-red-500" />
          Gerador de Questões Inéditas (IA)
        </h2>
        <button 
          onClick={() => setViewMode('explorer')}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-bold transition flex items-center gap-2"
        >
          <Folder size={18} />
          Explorar Banco
        </button>
      </div>
      
      <div className="space-y-4 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Banca (Ex: CEBRASPE, FGV)</label>
            <input value={board} onChange={e => setBoard(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1" placeholder="Banca" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Órgão (Opcional)</label>
            <input value={organ} onChange={e => setOrgan(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1" placeholder="Ex: Polícia Federal" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Cargo (Opcional)</label>
            <input value={role} onChange={e => setRole(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1" placeholder="Ex: Agente" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Matéria</label>
            <div className="relative mt-1">
              <input 
                list="disciplines-list"
                value={discipline} 
                onChange={e => {
                  setDiscipline(e.target.value);
                  setSubject('');
                  setSubSubject('');
                }} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white" 
                placeholder="Ex: Direito Constitucional" 
              />
              <datalist id="disciplines-list">
                {filterOptions.disciplines.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Assunto</label>
            <div className="relative mt-1">
              <input 
                list="subjects-list"
                value={subject} 
                onChange={e => {
                  setSubject(e.target.value);
                  setSubSubject('');
                }} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white" 
                placeholder="Ex: Direitos Fundamentais" 
              />
              <datalist id="subjects-list">
                {availableSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Subassunto (Opcional)</label>
            <div className="relative mt-1">
              <input 
                list="sub-subjects-list"
                value={subSubject} 
                onChange={e => setSubSubject(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white" 
                placeholder="Ex: Direito à Vida" 
              />
              <datalist id="sub-subjects-list">
                {availableSubSubjects.map(ss => <option key={ss} value={ss} />)}
              </datalist>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Dificuldade</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1">
              <option value="EASY">Fácil</option>
              <option value="MEDIUM">Média</option>
              <option value="HARD">Difícil</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value as QuestionType)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1">
              <option value="ABCDE">Múltipla Escolha (ABCDE)</option>
              <option value="ABCD">Múltipla Escolha (ABCD)</option>
              <option value="CERTO_ERRADO">Certo / Errado</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase">Quantidade</label>
            <input type="number" min="1" max="50" value={count} onChange={e => setCount(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white mt-1" />
            <p className="text-[10px] text-zinc-600 mt-1">Máximo de 50 por vez para garantir qualidade.</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
            <Zap size={12} className="text-yellow-500" />
            Pedido Personalizado para a IA (Prompt Customizado)
          </label>
          <textarea 
            value={customPrompt} 
            onChange={e => setCustomPrompt(e.target.value)} 
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-white mt-1 min-h-[100px] focus:border-red-500 transition outline-none" 
            placeholder="Ex: Foque em jurisprudência recente do STF sobre este tema. Use um tom mais acadêmico..."
          />
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4 transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
          {loading ? 'IA Criando Questões...' : 'Iniciar Geração em Tempo Real'}
        </button>

        {loading && streamingText && (
          <div className="mt-4 p-4 bg-black border border-zinc-800 rounded-lg font-mono text-[10px] text-zinc-500 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-blue-500 animate-pulse">
              <Zap size={12} /> <span>RECEBENDO DADOS DA IA...</span>
            </div>
            <div className="whitespace-pre-wrap break-all opacity-50 max-h-32 overflow-y-auto scrollbar-hide">
              {streamingText}
            </div>
          </div>
        )}
      </div>

      <Dialog
        isOpen={dialog?.isOpen || false}
        type={dialog?.type || 'alert'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        onConfirm={() => {
            if (dialog?.onConfirm) dialog.onConfirm();
            setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
};
