
import React, { useState, useEffect } from 'react';
import { MentorshipStorage } from './storage';
import { linkBankStorage, LinkItem } from './LinkBankPanel';
import { MentorshipPlan, MentorshipTask, TASK_TYPES, DAYS_OF_WEEK } from './types';
import { supabase } from '../services/supabase';
import { RevisionItem } from '../types';
import { Check, X, Clock, AlertTriangle, Shield, RefreshCw, Calendar, ArrowLeft, ArrowRight, FastForward, Trash2, ShieldAlert, ShieldCheck, Star, Award, Medal, Crown, ChevronUp, ChevronsUp, Hexagon, Circle, Sun, LayoutDashboard, Target, BookOpen, Dumbbell, Settings, LogOut, Bell, User, Megaphone, Trophy, Quote, Box, Video, FileText, ChevronLeft, ChevronRight, CheckCircle, Layers, EyeOff } from 'lucide-react';
import { Dialog, DialogType } from '../components/ui/Dialog';

// Utility to fix mojibake/broken encoding in Portuguese text from DB
const fixEncoding = (text: string): string => {
    if (!text) return text;
    return text
        .replace(/\u00c3\u00a7/g, '\u00e7').replace(/\u00c3\u0087/g, '\u00c7')
        .replace(/\u00c3\u00a3/g, '\u00e3').replace(/\u00c3\u0192/g, '\u00c3')
        .replace(/\u00c3\u00b5/g, '\u00f5').replace(/\u00c3\u0095/g, '\u00d5')
        .replace(/\u00c3\u00a1/g, '\u00e1').replace(/\u00c3\u0081/g, '\u00c1')
        .replace(/\u00c3\u00a9/g, '\u00e9').replace(/\u00c3\u0089/g, '\u00c9')
        .replace(/\u00c3\u00b3/g, '\u00f3').replace(/\u00c3\u0093/g, '\u00d3')
        .replace(/\u00c3\u00ba/g, '\u00fa').replace(/\u00c3\u009a/g, '\u00da')
        .replace(/\u00c3\u00a2/g, '\u00e2').replace(/\u00c3\u0082/g, '\u00c2')
        .replace(/\u00c3\u00aa/g, '\u00ea').replace(/\u00c3\u0160/g, '\u00ca')
        .replace(/\u00c3\u00b4/g, '\u00f4').replace(/\u00c3\u201c/g, '\u00d4')
        .replace(/\u00c3\u00ad/g, '\u00ed').replace(/\u00c3\u008d/g, '\u00cd')
        .replace(/\u00c3\u00a0/g, '\u00e0')
        .replace(/\u00c3\u00b1/g, '\u00f1')
        // Hardcoded fixes for permanently corrupted data in DB
        .replace(/REDAÇíO/gi, 'REDAÇÃO')
        .replace(/TíÂ.*TICA/gi, 'TÁTICA');
};

// Busca links diretamente do Supabase (sem depender de import externo)
const fetchLinksForSubject = async (subjectName: string, description: string = ''): Promise<{ resumo: string, questoes: string, aula: string } | null> => {
    try {
        const sub = subjectName.toLowerCase().trim();
        const desc = description.toLowerCase().trim();

        // 1. Buscar sequências do edital
        const { data: seqData } = await supabase.from('app_config').select('value').eq('key', 'link_sequences').single();
        const sequences = (seqData?.value as any[]) || [];

        for (const seq of sequences) {
            for (const item of (seq.items || [])) {
                const topicName = (item.topicName || '').toLowerCase().trim();
                const subjName = (item.subjectName || '').toLowerCase().trim();

                if (topicName === sub || sub.includes(topicName) || topicName.includes(sub) ||
                    subjName === sub || sub.includes(subjName) || subjName.includes(sub) ||
                    (topicName && desc.includes(topicName)) || (subjName && desc.includes(subjName))) {
                    if (item.resumoUrl || item.questoesUrl || item.aulaUrl) {
                        return { resumo: item.resumoUrl || '', questoes: item.questoesUrl || '', aula: item.aulaUrl || '' };
                    }
                }
            }
        }

        // 2. Buscar links gerais
        const { data: linkData } = await supabase.from('app_config').select('value').eq('key', 'link_bank_items').single();
        const links = (linkData?.value as any[]) || [];

        for (const link of links) {
            const linkName = (link.title || '').toLowerCase().trim();
            if (linkName === sub || sub.includes(linkName) || linkName.includes(sub) || (linkName && desc.includes(linkName))) {
                if (link.resumoUrl || link.questoesUrl || link.aulaUrl) {
                    return { resumo: link.resumoUrl || '', questoes: link.questoesUrl || '', aula: link.aulaUrl || '' };
                }
            }
        }

        return null;
    } catch (e) {
        console.error('[LinkBank] Erro ao buscar links:', e);
        return null;
    }
};

const RankBadge = ({ rankName, colorClass }: { rankName: string, colorClass: string }) => {
    const getIcon = () => {
        const imageName = rankName === 'Soldado' ? 'SOLDADO' :
            rankName === 'Cabo' ? 'CABO' :
                rankName === '3º Sargento' ? '3º SARGENTO' :
                    rankName === '2º Sargento' ? '2º SARGENTO' :
                        rankName === '1º Sargento' ? '1º SARGENTO' :
                            rankName === 'Subtenente' ? 'SUBTENENTE' :
                                rankName === 'Aspirante' ? 'ASPIRANTE' :
                                    rankName === '2º Tenente' ? '2º TENENTE' :
                                        rankName === '1º Tenente' ? '1º TENENTE' :
                                            rankName === 'Capitão' ? 'CAPITÃO' :
                                                rankName === 'Major' ? 'MAJOR' :
                                                    rankName === 'Tenente Coronel' ? 'TENENTE CORONEL' :
                                                        rankName === 'Coronel' ? 'CORONEL' : 'SOLDADO';
        return <img src={`/ICONES DE PATENTES/DIVISA ${imageName}.png`} alt={rankName} className="w-16 h-16 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />;
    };

    return (
        <div className={`flex items-center justify-center ${colorClass}`}>
            {getIcon()}
        </div>
    );
};

export const StudentMentorshipPanel = ({
    studentId,
    revisions = [],
    editalProgressInfo = { completed: 0, total: 100 },
    commandMissage
}: {
    studentId: string,
    revisions: RevisionItem[],
    editalProgressInfo?: { completed: number, total: number },
    commandMissage?: string
}) => {
    const [plan, setPlan] = useState<MentorshipPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [todayDate] = useState(new Date());

    // Estado para o Modal de Conclusão Estratégica
    const [taskToComplete, setTaskToComplete] = useState<MentorshipTask | null>(null);
    const [taskLinks, setTaskLinks] = useState<{ resumo: string, questoes: string, aula: string } | null>(null);

    // Mapa de links pré-carregados para TODAS as metas
    const [linksMap, setLinksMap] = useState<Record<string, { resumo: string, questoes: string, aula: string }>>({});

    // Estado para o Modal de Replanejamento
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [delayedTasksCount, setDelayedTasksCount] = useState(0);

    // Estado para o Modal de Reset
    const [showResetModal, setShowResetModal] = useState(false);

    // Estado para o Modal de Adiantar Metas
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);

    // Estado para Metas Atrasadas
    const [showLateTasksConfig, setShowLateTasksConfig] = useState(false);
    const [extraTasksPerDay, setExtraTasksPerDay] = useState(1);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [previewTaskIndex, setPreviewTaskIndex] = useState<number | null>(null);

    const [globalGoals, setGlobalGoals] = useState<any[]>([]);
    
    useEffect(() => {
        MentorshipStorage.getGlobalGoalsMetadata().then(data => setGlobalGoals(data));
    }, []);

    const [globalLinks, setGlobalLinks] = useState<LinkItem[]>([]);

    const [weekOffset, setWeekOffset] = useState(0);

    // --- SISTEMA DE DIÁLOGO CUSTOMIZADO ---
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


    const weekDayIndex = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1;
    const currentDayName = DAYS_OF_WEEK[weekDayIndex];

    const y = todayDate.getFullYear();
    const m = String(todayDate.getMonth() + 1).padStart(2, '0');
    const d = String(todayDate.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;

    useEffect(() => {
        linkBankStorage.getLinks().then(setGlobalLinks);
        const loadPlan = async () => {
            try {
                setLoading(true);
                const loadedPlan = await MentorshipStorage.initPlan(studentId, 'Aluno');
                setPlan(loadedPlan);
                setError(null);

                // Pré-carregar TODOS os links do Banco de Links para cada meta
                if (loadedPlan && loadedPlan.tasks.length > 0) {
                    try {
                        const { data: seqData } = await supabase.from('app_config').select('value').eq('key', 'link_sequences').single();
                        const sequences = (seqData?.value as any[]) || [];
                        const { data: linkData } = await supabase.from('app_config').select('value').eq('key', 'link_bank_items').single();
                        const bankLinks = (linkData?.value as any[]) || [];

                        const map: Record<string, { resumo: string, questoes: string, aula: string }> = {};

                        for (const task of loadedPlan.tasks) {
                            // Se a tarefa já tem links próprios (direcionamento do admin)
                            if (task.resumoUrl || task.questoesUrl || task.aulaUrl) {
                                map[task.id] = { resumo: task.resumoUrl || '', questoes: task.questoesUrl || '', aula: task.aulaUrl || '' };
                                continue;
                            }

                            const sub = task.subject.toLowerCase().trim();
                            const desc = (task.description || '').toLowerCase().trim();
                            let found = false;

                            // Buscar nas sequências
                            for (const seq of sequences) {
                                for (const item of (seq.items || [])) {
                                    const topicName = (item.topicName || '').toLowerCase().trim();
                                    const subjName = (item.subjectName || '').toLowerCase().trim();
                                    if (topicName === sub || sub.includes(topicName) || topicName.includes(sub) ||
                                        subjName === sub || sub.includes(subjName) || subjName.includes(sub) ||
                                        (topicName && desc.includes(topicName)) || (subjName && desc.includes(subjName))) {
                                        if (item.resumoUrl || item.questoesUrl || item.aulaUrl) {
                                            map[task.id] = { resumo: item.resumoUrl || '', questoes: item.questoesUrl || '', aula: item.aulaUrl || '' };
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                if (found) break;
                            }

                            // Buscar nos links gerais
                            if (!found) {
                                for (const link of bankLinks) {
                                    const linkName = (link.title || '').toLowerCase().trim();
                                    if (linkName === sub || sub.includes(linkName) || linkName.includes(sub) || (linkName && desc.includes(linkName))) {
                                        if (link.resumoUrl || link.questoesUrl || link.aulaUrl) {
                                            map[task.id] = { resumo: link.resumoUrl || '', questoes: link.questoesUrl || '', aula: link.aulaUrl || '' };
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        setLinksMap(map);
                    } catch (e) {
                        console.error('[LinkBank] Erro ao pré-carregar links:', e);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar plano:", err);
                setError("Não foi possível carregar os dados da tarefa. Verifique sua conexão.");
            } finally {
                setLoading(false);
            }
        };
        loadPlan();
    }, [studentId]);

    // Abre o modal ao invés de concluir direto
    const handleTaskClick = async (task: MentorshipTask) => {
        if (!plan) return;

        // Se já estiver completa, apenas permite desmarcar (sem modal)
        if (task.isCompleted) {
            toggleTaskStatus(task.id, false);
        } else {
            // Regra: Só pode cumprir metas de HOJE ou ATRASADAS
            // BYPASS para Ciclos: A meta ativa do ciclo sempre pode ser concluída!
            const isCicloMode = plan.studyMode === 'CICLOS';
            const allTasksTemp = plan.tasks || [];
            const cicloTasksTemp = isCicloMode ? allTasksTemp : [];
            const activeCicloTaskTemp = isCicloMode ? cicloTasksTemp.find(t => !t.isCompleted) : null;
            const isTargetActiveCiclo = isCicloMode && activeCicloTaskTemp && task.id === activeCicloTaskTemp.id;

            if (task.date && task.date > isoDate && !isTargetActiveCiclo) {
                showAlert("Acesso Negado", "Esta tarefa está agendada para o futuro. Você deve adiantar seus assuntos se quiser chegar nela hoje.");
                return;
            }
            setTaskToComplete(task);

            // Verificar links: primeiro o mapa pré-carregado, depois busca direta
            const preloaded = linksMap[task.id];
            if (preloaded) {
                setTaskLinks(preloaded);
            } else if (task.resumoUrl || task.questoesUrl || task.aulaUrl) {
                setTaskLinks({ resumo: task.resumoUrl || '', questoes: task.questoesUrl || '', aula: task.aulaUrl || '' });
            } else {
                setTaskLinks(null);
                const result = await fetchLinksForSubject(task.subject, task.description || '');
                if (result) setTaskLinks(result);
            }
        }
    };

    const handleLateTaskSpread = async () => {
        if (!plan) return;

        const lateTasks = plan.tasks.filter(t => t.date && t.date < isoDate && !t.isCompleted);
        if (lateTasks.length === 0) return;

        const updatedTasks = [...plan.tasks];

        // Distribuir metas atrasadas nos próximos dias
        let currentOffset = 0;
        let tasksAddedToday = 0;

        lateTasks.forEach((task) => {
            if (tasksAddedToday >= extraTasksPerDay) {
                currentOffset++;
                tasksAddedToday = 0;
            }

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + currentOffset);

            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            const newDateStr = `${y}-${m}-${d}`;

            const dayIndex = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
            const newDayName = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];

            // Atualizar a tarefa na lista
            const taskIdx = updatedTasks.findIndex(t => t.id === task.id);
            if (taskIdx !== -1) {
                updatedTasks[taskIdx] = {
                    ...task,
                    date: newDateStr,
                    dayOfWeek: newDayName,
                    description: `${task.description} [Atrasada]`
                };
            }

            tasksAddedToday++;
        });

        const updatedPlan = { ...plan, tasks: updatedTasks };
        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
            showAlert("Reforço Integrado", `As ${lateTasks.length} metas atrasadas foram redistribuídas (${extraTasksPerDay} por dia) no seu cronograma.`);
            setShowLateTasksConfig(false);
        } catch (err) {
            console.error("Erro ao salvar redistribuição:", err);
            setPlan(plan);
        }
    };

    const calculateXP = (type: string) => {
        switch (type) {
            case 'SIMULADO': return 100;
            case 'AULA': return 50;
            case 'REVISAO': return 40;
            case 'Questões': return 30;
            case 'LEI_SECA': return 20;
            case 'META_EXTRA': return 10;
            default: return 10;
        }
    };

    const toggleTaskStatus = async (taskId: string, status: boolean) => {
        if (!plan) return;

        const task = plan.tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTasks = plan.tasks.map(t =>
            t.id === taskId ? { ...t, isCompleted: status } : t
        );

        const xpAmount = calculateXP(task.type);
        let newXp = plan.xp || 0;

        if (status) {
            newXp += xpAmount;
            // Dispatch global events for 1h study time and intelligent revision
            window.dispatchEvent(new CustomEvent('ADD_STUDY_TIME', {
                detail: { subjectName: task.subject, hours: 1 }
            }));

            // Use a description for revision topic if available, otherwise just use the subject
            const topic = task.description ? task.description.replace(/^MENSAGEM DO MENTOR:\s*/i, '').replace(/^Tópico:\s*/i, '').trim() : "Tópico Geral";
            window.dispatchEvent(new CustomEvent('CREATE_REVISION', {
                detail: { subjectName: task.subject, topic }
            }));
            window.dispatchEvent(new CustomEvent('COMPLETE_TOPIC_FROM_MENTORIA', {
                detail: { subjectName: task.subject, topicName: topic }
            }));
            showAlert('Meta Cumprida!', `Você ganhou +${xpAmount} XP para a sua progressão.`);

        } else {
            newXp = Math.max(0, newXp - xpAmount);
        }

        const updatedPlan = { ...plan, tasks: updatedTasks, xp: newXp };
        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
        } catch (err) {
            console.error("Erro ao salvar progresso:", err);
            showAlert("Erro de Conexão", "Não foi possível salvar seu progresso. Verifique sua conexão com a internet.");
            // Revert state
            setPlan(plan);
        }
    };

    const moveTask = (taskId: string, targetDateStr: string) => {
        if (!plan) return;
        const updatedTasks = plan.tasks.map(t => {
            if (t.id === taskId) {
                const dateObj = new Date(targetDateStr + 'T12:00:00');
                const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
                const newDayOfWeek = DAYS_OF_WEEK[dayIndex < 0 ? 6 : dayIndex];
                return { ...t, date: targetDateStr, dayOfWeek: newDayOfWeek };
            }
            return t;
        });
        setPlan({ ...plan, tasks: updatedTasks });
    };

    const saveEditedSchedule = async () => {
        setIsEditingSchedule(false);
        if (!plan) return;
        try {
            await MentorshipStorage.savePlan(plan);
            showAlert("Sucesso", "Cronograma salvo com sucesso!");
        } catch (err) {
            console.error(err);
            showAlert("Erro", "Falha ao salvar as alterações.");
        }
    };

    const handleCompleteRevision = async (revId: string) => {
        if (!plan) return;

        // Update local XP state so UI reflects the change immediately
        const xpAmount = calculateXP('REVISAO');
        const newXp = (plan.xp || 0) + xpAmount;
        setPlan({ ...plan, xp: newXp });
    };

    const handleRescheduleClick = () => {
        if (!plan) return;

        // 1. Identificar atrasos (com data definida, no passado, não concluídas)
        const delayedTasks = plan.tasks.filter(t => {
            if (!t.date) return false; // Ignora tarefas genéricas sem data
            return t.date < isoDate && !t.isCompleted;
        });

        if (delayedTasks.length === 0) {
            showAlert("Aviso", "Nenhuma tarefa atrasada encontrada, aluno! Mantenha o padrão.");
            return;
        }

        setDelayedTasksCount(delayedTasks.length);
        setShowRescheduleModal(true);
    };

    const confirmReschedule = async () => {
        if (!plan) return;

        const delayedTasks = plan.tasks.filter(t => {
            if (!t.date) return false;
            return t.date < isoDate && !t.isCompleted;
        });

        // 2. Identificar dias de estudo ativos (baseado no plano existente)
        const activeWeekDays = Array.from(new Set(plan.tasks.map(t => t.dayOfWeek)));
        const validDays = activeWeekDays.length > 0 ? activeWeekDays : DAYS_OF_WEEK;

        // 3. Encontrar próximas datas válidas (Next 7 study days)
        let availableDates: string[] = [];
        let dateCursor = new Date(todayDate);
        dateCursor.setHours(12, 0, 0, 0);
        // Começa a partir de hoje

        while (availableDates.length < 7) {
            const dayName = DAYS_OF_WEEK[dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1];
            if (validDays.includes(dayName)) {
                const yStr = dateCursor.getFullYear();
                const mStr = String(dateCursor.getMonth() + 1).padStart(2, '0');
                const dStr = String(dateCursor.getDate()).padStart(2, '0');
                availableDates.push(`${yStr}-${mStr}-${dStr}`);
            }
            dateCursor.setDate(dateCursor.getDate() + 1);
            if (dateCursor.getTime() > todayDate.getTime() + 30 * 24 * 60 * 60 * 1000) break; // Safety 30 days
        }

        if (availableDates.length === 0) {
            // Fallback
            const tomorrow = new Date(todayDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            availableDates.push(tomorrow.toLocaleDateString('pt-BR').split('/').reverse().join('-'));
        }

        // 4. Atualizar as tarefas
        let dateIdx = 0;
        const updatedTasks = plan.tasks.map(t => {
            if (delayedTasks.find(dt => dt.id === t.id)) {
                const targetDate = availableDates[dateIdx % availableDates.length];
                dateIdx++;

                const d = new Date(targetDate + 'T12:00:00');
                const newDayName = DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];

                return {
                    ...t,
                    originalDate: t.originalDate || t.date,
                    date: targetDate,
                    dayOfWeek: newDayName,
                    description: (t.description || '') + ' [Replanejado]',
                };
            }
            return t;
        });

        // 5. Salvar
        const updatedPlan = { ...plan, tasks: updatedTasks };
        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
        } catch (err) {
            console.error("Erro ao salvar replanejamento:", err);
            showAlert("Erro de Conexão", "Não foi possível salvar o replanejamento. Verifique sua conexão.");
            setPlan(plan);
        }

        setShowRescheduleModal(false);
    };

    const confirmResetPlan = async () => {
        if (!plan) return;

        // 1. Identificar tarefas de origem
        const sourceTasks = plan.originalTasks && plan.originalTasks.length > 0
            ? plan.originalTasks
            : plan.tasks;

        if (sourceTasks.length === 0) return showAlert("Erro", "Não há tarefas para resetar.");

        // 2. Agrupar tarefas por Matéria/Tipo para redistribuição inteligente
        const tasksBySubject: Record<string, MentorshipTask[]> = {};
        sourceTasks.forEach(t => {
            // Chave de agendamento: Prioriza tipos especiais, senão usa a matéria
            let key = t.subject;
            const lowerSubject = t.subject.toLowerCase();

            if (t.type === 'SIMULADO') key = 'Simulado';
            else if (t.type === 'REVISAO') key = 'Revisão';
            else if (t.type === 'LEI_SECA') key = 'Lei Seca';
            else if (t.type === 'META_EXTRA') key = 'Meta Extra';
            else if (lowerSubject.includes('redação') || lowerSubject.includes('redacao')) key = 'Redação';

            if (!tasksBySubject[key]) tasksBySubject[key] = [];
            tasksBySubject[key].push({
                ...t,
                isCompleted: false,
                description: t.description?.replace(/ \[Replanejado\]| \[Adiantado\]| \[Atrasada\]/g, '') || ''
            });
        });

        // 3. Preparar a redistribuição respeitando o cronograma semanal (Subject-Aware)
        const updatedTasks: MentorshipTask[] = [];
        let dateCursor = new Date();
        dateCursor.setHours(12, 0, 0, 0);

        const schedule = plan.weeklySchedule || {};
        const hasSchedule = Object.values(schedule).some(s => Array.isArray(s) && (s as string[]).length > 0);

        if (!hasSchedule) {
            // Fallback: Se não houver cronograma, distribui sequencialmente nos dias de estudo originais
            sourceTasks.forEach((t, idx) => {
                const d = new Date(dateCursor);
                d.setDate(d.getDate() + idx);
                const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
                const yStr = d.getFullYear();
                const mStr = String(d.getMonth() + 1).padStart(2, '0');
                const dStr = String(d.getDate()).padStart(2, '0');

                updatedTasks.push({
                    ...t,
                    isCompleted: false,
                    date: `${yStr}-${mStr}-${dStr}`,
                    dayOfWeek: DAYS_OF_WEEK[dayIndex],
                    description: t.description?.replace(/ \[Replanejado\]| \[Adiantado\]| \[Atrasada\]/g, '') || ''
                });
            });
        } else {
            let totalTasks = sourceTasks.length;
            let assignedCount = 0;
            let safetyCounter = 0;

            // Cópia para não mutar o original durante o shift()
            const workingQueues = { ...tasksBySubject };

            while (assignedCount < totalTasks && safetyCounter < 1000) {
                const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                const dayName = DAYS_OF_WEEK[dayIndex];

                let subjectsForToday: string[] = [];

                if (dayName === 'Domingo') {
                    // Domingo é exclusivo para Simulado, Redação e tarefas diárias
                    subjectsForToday = ['Simulado', 'Redação', 'Lei Seca', 'Meta Extra', 'Revisão'];
                } else {
                    // Dias normais: Cronograma + tarefas diárias
                    subjectsForToday = [...(schedule[dayName] || []), 'Lei Seca', 'Meta Extra', 'Revisão'];
                }

                if (subjectsForToday.length > 0) {
                    // Usar um Set para evitar duplicatas se o usuário colocou 'Lei Seca' no schedule manual
                    const uniqueSubjects = Array.from(new Set(subjectsForToday));

                    uniqueSubjects.forEach(subjKey => {
                        if (workingQueues[subjKey] && workingQueues[subjKey].length > 0) {
                            const t = workingQueues[subjKey].shift()!;
                            const yStr = dateCursor.getFullYear();
                            const mStr = String(dateCursor.getMonth() + 1).padStart(2, '0');
                            const dStr = String(dateCursor.getDate()).padStart(2, '0');

                            t.date = `${yStr}-${mStr}-${dStr}`;
                            t.dayOfWeek = dayName;
                            updatedTasks.push(t);
                            assignedCount++;
                        }
                    });
                }
                dateCursor.setDate(dateCursor.getDate() + 1);
                safetyCounter++;
            }

            // Se sobrarem tarefas (matérias não agendadas), anexa ao final
            Object.keys(workingQueues).forEach(subjKey => {
                const list = workingQueues[subjKey];
                list.forEach(t => {
                    const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                    const yStr = dateCursor.getFullYear();
                    const mStr = String(dateCursor.getMonth() + 1).padStart(2, '0');
                    const dStr = String(dateCursor.getDate()).padStart(2, '0');

                    t.date = `${yStr}-${mStr}-${dStr}`;
                    t.dayOfWeek = DAYS_OF_WEEK[dayIndex];
                    updatedTasks.push(t);
                    dateCursor.setDate(dateCursor.getDate() + 1);
                });
            });
        }

        const yStr = new Date().getFullYear();
        const mStr = String(new Date().getMonth() + 1).padStart(2, '0');
        const dStr = String(new Date().getDate()).padStart(2, '0');
        const newStartDateStr = `${yStr}-${mStr}-${dStr}`;

        const updatedPlan = {
            ...plan,
            tasks: updatedTasks,
            originalTasks: sourceTasks,
            xp: 0,
            startDate: newStartDateStr
        };

        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
            showAlert("Sucesso", "Plano reiniciado com sucesso! O Dia 1 é HOJE e o cronograma foi recalculado.");
        } catch (err) {
            console.error("Erro ao salvar reset:", err);
            showAlert("Erro de Conexão", "Não foi possível salvar o reset. Verifique sua conexão.");
            setPlan(plan);
        }
        setShowResetModal(false);
    };

    const handleDeletePlan = () => {
        showConfirm('Zona de Perigo', 'Tem certeza que deseja EXCLUIR todo o seu plano de estudos? Essa ação é irreversível e você perderá todo o histórico.', async () => {
            await MentorshipStorage.deletePlan(studentId);
            setPlan(null);
            window.location.reload();
        });
    };

    const handleAdvanceGoals = async (mode: 'rest' | 'shift') => {
        if (!plan) return;

        // Descobre o próximo dia móvel (pula o Domingo)
        let nextMovableDate = new Date(todayDate);
        nextMovableDate.setDate(nextMovableDate.getDate() + 1);
        if (nextMovableDate.getDay() === 0) {
            nextMovableDate.setDate(nextMovableDate.getDate() + 1);
        }
        const nextMovableIso = nextMovableDate.toLocaleDateString('pt-BR').split('/').reverse().join('-');

        let updatedTasks = [...plan.tasks];

        if (mode === 'rest') {
            // Traz as metas do próximo dia útil para hoje
            updatedTasks = updatedTasks.map(t => {
                if (t.date === nextMovableIso && t.dayOfWeek !== 'Domingo') {
                    return {
                        ...t,
                        originalDate: t.originalDate || t.date,
                        date: isoDate,
                        dayOfWeek: currentDayName,
                        description: (t.description || '') + ' [Adiantado]'
                    };
                }
                return t;
            });
        } else if (mode === 'shift') {
            // Shift all future tasks backward by 1 valid day
            updatedTasks = updatedTasks.map(t => {
                if (t.date && t.date > isoDate) {
                    const [y, m, d] = t.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);

                    // Se a tarefa originalmente cai no Domingo, ela é fixa e não se move
                    if (dateObj.getDay() === 0) {
                        return t;
                    }

                    // Adiantar 1 dia
                    dateObj.setDate(dateObj.getDate() - 1);

                    // Se o novo dia for Domingo (que é fixo), pula para o Sábado (adianta mais 1 dia)
                    if (dateObj.getDay() === 0) {
                        dateObj.setDate(dateObj.getDate() - 1);
                    }

                    const newIso = dateObj.toLocaleDateString('pt-BR').split('/').reverse().join('-');

                    // Proteção: não adiantar para antes de hoje
                    if (newIso < isoDate) {
                        return t;
                    }

                    const newDayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
                    const newDayName = DAYS_OF_WEEK[newDayIndex];

                    return {
                        ...t,
                        originalDate: t.originalDate || t.date,
                        date: newIso,
                        dayOfWeek: newDayName,
                        description: t.date === nextMovableIso ? (t.description || '') + ' [Adiantado]' : t.description
                    };
                }
                return t;
            });
        }

        const updatedPlan = { ...plan, tasks: updatedTasks };
        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
        } catch (err) {
            console.error("Erro ao salvar adiantamento:", err);
            showAlert("Erro de Conexão", "Não foi possível salvar o adiantamento. Verifique sua conexão.");
            setPlan(plan);
        }
        setShowAdvanceModal(false);
        showAlert("Sucesso", mode === 'rest' ? "Metas adiantadas! Amanhã está livre." : "Cronograma adiantado! O ritmo acelerou.");
    };

    // Helper para obter a data de um dia específico da semana atual (Locale Independent)
    const getWeekDate = (dayIndex: number, offset: number = 0) => {
        const diff = dayIndex - weekDayIndex + (offset * 7);
        const d = new Date(todayDate);
        d.setDate(todayDate.getDate() + diff);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const handleConfirmCompletion = async (needsMoreTime: boolean) => {
        if (!taskToComplete || !plan) return;

        let updatedTasks = [...plan.tasks];

        const xpAmount = calculateXP(taskToComplete.type);
        const newXp = (plan.xp || 0) + xpAmount;

        // 1. Marca a tarefa original como concluída
        updatedTasks = updatedTasks.map(t =>
            t.id === taskToComplete.id ? { ...t, isCompleted: true } : t
        );

        // Dispara eventos globais para 1h de estudo e revisão inteligente
        window.dispatchEvent(new CustomEvent('ADD_STUDY_TIME', {
            detail: { subjectName: taskToComplete.subject, hours: 1 }
        }));
        const topic = taskToComplete.description ? taskToComplete.description.replace(/^MENSAGEM DO MENTOR:\s*/i, '').replace(/^Tópico:\s*/i, '').trim() : "Tópico Geral";
        window.dispatchEvent(new CustomEvent('CREATE_REVISION', {
            detail: { subjectName: taskToComplete.subject, topic }
        }));

        // 2. Se precisa de mais tempo, reprograma e empurra as próximas
        if (needsMoreTime) {
            // ... (keep existing rescheduling logic, but use updatedTasks)
            // Find future tasks for the same subject
            const futureSubjectTasks = updatedTasks.filter(t =>
                t.subject === taskToComplete.subject &&
                t.date && t.date > isoDate &&
                !t.isCompleted
            ).sort((a, b) => a.date!.localeCompare(b.date!));

            // Determine which days of the week this subject is studied
            const subjectDaysOfWeek = Array.from(new Set(updatedTasks.filter(t => t.subject === taskToComplete.subject).map(t => t.dayOfWeek)));
            const validDays = subjectDaysOfWeek.length > 0 ? subjectDaysOfWeek : DAYS_OF_WEEK;

            let continuationDateIso = '';
            let continuationDayName = '';

            if (futureSubjectTasks.length > 0) {
                // The continuation task takes the slot of the FIRST future task
                continuationDateIso = futureSubjectTasks[0].date!;
                continuationDayName = futureSubjectTasks[0].dayOfWeek;

                // Shift all future tasks forward by one slot
                for (let i = 0; i < futureSubjectTasks.length; i++) {
                    const currentTask = futureSubjectTasks[i];
                    let nextDateIso = '';
                    let nextDayName = '';

                    if (i + 1 < futureSubjectTasks.length) {
                        // Take the date of the next task in the list
                        nextDateIso = futureSubjectTasks[i + 1].date!;
                        nextDayName = futureSubjectTasks[i + 1].dayOfWeek;
                    } else {
                        // This is the last task, find the next valid day after its current date
                        let dateCursor = new Date(currentTask.date! + 'T12:00:00');
                        dateCursor.setDate(dateCursor.getDate() + 1);

                        // Find next valid day
                        while (true) {
                            const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                            const dayName = DAYS_OF_WEEK[dayIndex];
                            if (validDays.includes(dayName)) {
                                nextDateIso = dateCursor.toLocaleDateString('pt-BR').split('/').reverse().join('-');
                                nextDayName = dayName;
                                break;
                            }
                            dateCursor.setDate(dateCursor.getDate() + 1);
                        }
                    }

                    // Update the task in the main array
                    const taskIndex = updatedTasks.findIndex(t => t.id === currentTask.id);
                    if (taskIndex !== -1) {
                        updatedTasks[taskIndex] = {
                            ...updatedTasks[taskIndex],
                            date: nextDateIso,
                            dayOfWeek: nextDayName
                        };
                    }
                }
            } else {
                // No future tasks, just find the next valid day after today
                let dateCursor = new Date(todayDate);
                dateCursor.setDate(dateCursor.getDate() + 1);
                while (true) {
                    const dayIndex = dateCursor.getDay() === 0 ? 6 : dateCursor.getDay() - 1;
                    const dayName = DAYS_OF_WEEK[dayIndex];
                    if (validDays.includes(dayName)) {
                        continuationDateIso = dateCursor.toLocaleDateString('pt-BR').split('/').reverse().join('-');
                        continuationDayName = dayName;
                        break;
                    }
                    dateCursor.setDate(dateCursor.getDate() + 1);
                }
            }

            // Create and insert the continuation task
            const continuationTask: MentorshipTask = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                dayOfWeek: continuationDayName,
                date: continuationDateIso,
                type: taskToComplete.type,
                subject: taskToComplete.subject,
                description: `${taskToComplete.description} (Reforço/Continuação)`,
                isCompleted: false
            };

            updatedTasks.push(continuationTask);

            const [y, m, d] = continuationDateIso.split('-').map(Number);
            const formattedDate = new Date(y, m - 1, d).toLocaleDateString('pt-BR');
            showAlert("Reforço Aprovado", `Ciente, aluno! Conteúdo reprogramado para ${continuationDayName} (${formattedDate}). As tarefas seguintes de ${taskToComplete.subject} foram adiadas.`);
        }

        const updatedPlan = { ...plan, tasks: updatedTasks, xp: newXp };
        setPlan(updatedPlan);
        try {
            await MentorshipStorage.savePlan(updatedPlan);
        } catch (err) {
            console.error("Erro ao salvar conclusão:", err);
            showAlert("Erro de Conexão", "Não foi possível salvar a conclusão da tarefa. Verifique sua conexão.");
            setPlan(plan);
        }
        setTaskToComplete(null);
    };

    const getRankInfo = () => {
        const completedXP = editalProgressInfo.completed * 100;
        let totalXP = editalProgressInfo.total * 100;
        if (totalXP === 0) totalXP = 1000;

        const ranks = [
            { name: 'Soldado', min: 0, color: 'text-zinc-500' },
            { name: 'Cabo', min: 0.08, color: 'text-zinc-400' },
            { name: '3º Sargento', min: 0.16, color: 'text-zinc-300' },
            { name: '2º Sargento', min: 0.24, color: 'text-zinc-300' },
            { name: '1º Sargento', min: 0.32, color: 'text-blue-400' },
            { name: 'Subtenente', min: 0.40, color: 'text-blue-500' },
            { name: 'Aspirante', min: 0.48, color: 'text-blue-600' },
            { name: '2º Tenente', min: 0.56, color: 'text-indigo-400' },
            { name: '1º Tenente', min: 0.64, color: 'text-indigo-500' },
            { name: 'Capitão', min: 0.72, color: 'text-purple-400' },
            { name: 'Major', min: 0.80, color: 'text-purple-500' },
            { name: 'Tenente Coronel', min: 0.90, color: 'text-red-400' },
            { name: 'Coronel', min: 1.00, color: 'text-red-500' }
        ];

        const percent = totalXP > 0 ? (completedXP / totalXP) : 0;

        let currentRankIndex = ranks.findIndex((r, idx) => {
            const nextR = ranks[idx + 1];
            return percent >= r.min && (!nextR || percent < nextR.min);
        });
        if (currentRankIndex === -1) currentRankIndex = ranks.length - 1;

        const currentRank = ranks[currentRankIndex];
        const nextRankDef = currentRankIndex < ranks.length - 1 ? ranks[currentRankIndex + 1] : null;

        const currentRankMinXP = Math.round(currentRank.min * totalXP);
        const nextRankMinXP = nextRankDef ? Math.round(nextRankDef.min * totalXP) : totalXP;

        let progress = 100;
        if (nextRankDef && nextRankMinXP > currentRankMinXP) {
            progress = ((completedXP - currentRankMinXP) / (nextRankMinXP - currentRankMinXP)) * 100;
        }

        const nextRank = nextRankDef ? {
            ...nextRankDef,
            min: nextRankMinXP
        } : null;

        return {
            currentRank: { ...currentRank, min: currentRankMinXP },
            nextRank,
            progress,
            currentXP: completedXP,
            totalXP
        };
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="glitch-logo-wrapper">
                    <img src="/METODO COP LOGO.png" alt="Método COP" className="main-logo" />
                    <img src="/METODO COP LOGO.png" alt="" className="glitch-layer red" aria-hidden="true" />
                    <img src="/METODO COP LOGO.png" alt="" className="glitch-layer blue" aria-hidden="true" />
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold loading-pulse-text">Inicializando sistema...</p>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-zinc-500 bg-[#09090b] min-h-screen">
                <AlertTriangle className="mb-4 text-red-600" size={48} />
                <h2 className="text-2xl font-bold font-heading uppercase text-white uppercase tracking-widest">Falha na Comunicação</h2>
                <p className="mt-2">{error || "Plano não encontrado."}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition"
                >
                    TENTAR NOVAMENTE
                </button>
            </div>
        );
    }

    const todaysMissage = plan.messages?.find(m => m.date === isoDate);

    const todaysTasks = (plan.tasks || []).filter(t => {
        if (t.date) return t.date === isoDate && !t.isCompleted;
        return false;
    });

    const lateTasks = (plan.tasks || []).filter(t => {
        if (t.date) return t.date < isoDate && !t.isCompleted;
        return false;
    });

    const completedCount = (plan.tasks || []).filter(t => t.date === isoDate && t.isCompleted).length;
    const totalCount = todaysTasks.length + completedCount;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const todaysRevisions = revisions.filter(r => r.scheduledDate === isoDate && !r.completed);

    const rankInfo = getRankInfo();

    const allTasks = plan.tasks || [];
    const totalAllTasks = allTasks.length;
    const completedAllTasks = allTasks.filter(t => t.isCompleted).length;
    const overallProgressPercent = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;
    const isPlanCompleted = totalAllTasks > 0 && overallProgressPercent === 100;

    const isCicloMode = plan.studyMode === 'CICLOS';
    const cicloTasks = isCicloMode ? allTasks : [];
    const activeCicloTask = isCicloMode ? cicloTasks.find(t => !t.isCompleted) : null;
    const nextCicloTasks = isCicloMode ? cicloTasks.filter(t => !t.isCompleted && t.id !== activeCicloTask?.id).slice(0, 5) : [];

    const RankIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
        const icons: any = {
            Shield, ShieldAlert, ShieldCheck, Star, Award, Medal, Crown
        };
        const IconComponent = icons[iconName] || Shield;
        return <IconComponent className={className} />;
    };

    return (
        <div className="min-h-screen relative text-white font-sans selection:bg-white selection:text-black pb-20 overflow-x-hidden">

            {/* Background Dinâmico Tecnológico e Luzes */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[#050505]"></div>
                <div className="absolute top-0 -left-[20%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute bottom-0 -right-[20%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '5s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/30 rounded-full blur-[150px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-[1800px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all hover:border-white/10">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700 uppercase tracking-tight flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                            PAINEL DO ALUNO
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1 font-medium">Bem-vindo de volta, combatente.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{currentDayName}</div>
                            <div className="text-sm font-bold text-white">{todayDate.toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div className="w-10 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center border border-white/10 text-zinc-400">
                            <Calendar size={20} />
                        </div>
                    </div>
                </header>

                {commandMissage && (
                    <div className="bg-red-950/20 backdrop-blur-md border border-red-900/30 p-6 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.15)] relative overflow-hidden group hover:border-red-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-3 mb-3 text-red-500 font-black uppercase tracking-widest text-xs relative z-10">
                            <Megaphone size={18} className="animate-pulse" />
                            <span>Aviso da Coordenação</span>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-zinc-300 relative z-10" dangerouslySetInnerHTML={{__html: commandMissage}} />
                    </div>
                )}


                {todaysTasks.length > 0 && todaysTasks.every(t => t.isCompleted) && (
                    <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.3)] border border-green-400/50 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse-subtle">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                                <Trophy size={28} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Missão Cumprida!</h3>
                                <p className="text-green-100 font-medium">Pode deitar a cabeça no travesseiro com a consciência tranquila.</p>
                            </div>
                        </div>
                        <CheckCircle size={40} className="text-white/50 hidden md:block" />
                    </div>
                )}


                {/* CENTRAL DE COMANDO */}
                <section className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all hover:border-white/10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                    <div className="absolute -right-10 -bottom-10 opacity-5">
                        <RankBadge rankName={rankInfo.currentRank.name} colorClass="text-white w-64 h-64" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 transition-transform group-hover:scale-[1.02]">
                        <RankBadge rankName={rankInfo.currentRank.name} colorClass={rankInfo.currentRank.color} />
                        <div>
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Patente Atual</h2>
                            <div className={`text-4xl md:text-5xl font-black uppercase tracking-tight ${rankInfo.currentRank.color}`} style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                                {rankInfo.currentRank.name}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                            <span className="text-white">XP Total: {rankInfo.currentXP} / {rankInfo.totalXP}</span>
                            <span className="text-zinc-500">{rankInfo.nextRank ? `${rankInfo.nextRank.min} XP` : 'MÁXIMO'}</span>
                        </div>
                        <div className="h-3 bg-zinc-900/80 backdrop-blur-xl rounded-full shadow-inner overflow-hidden border border-white/10 relative">
                            <div
                                className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                                style={{ width: `${rankInfo.progress}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 blur-[2px]"></div>
                            </div>
                        </div>
                    </div>

                    {rankInfo.nextRank && (
                        <div className="flex justify-between items-center mt-3 text-xs font-bold text-zinc-500 uppercase tracking-wide">
                            <span>Progresso para promoção</span>
                            <span className="text-zinc-400">Faltam <span className="text-white">{rankInfo.nextRank.min - rankInfo.currentXP} XP</span> para <span className={rankInfo.nextRank.color}>{rankInfo.nextRank.name}</span></span>
                        </div>
                    )}

                    <div className="relative z-10 mt-8 pt-8 border-t border-white/5">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                            <span className="text-white">Progresso do Plano de Estudo</span>
                            <span className={isPlanCompleted ? "text-green-500" : "text-zinc-500"}>{overallProgressPercent}% CONCLUÍDO</span>
                        </div>
                        <div className="h-4 bg-zinc-900/80 backdrop-blur-xl rounded-full shadow-inner overflow-hidden border border-white/10 relative">
                            <div
                                className={`h-full transition-all duration-1000 ease-out relative ${isPlanCompleted ? 'bg-gradient-to-r from-green-700 via-green-500 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]'}`}
                                style={{ width: `${overallProgressPercent}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 blur-[2px]"></div>
                            </div>
                        </div>
                        {isPlanCompleted && (
                            <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <h3 className="text-green-500 font-black uppercase text-lg">Tarefa Concluída!</h3>
                                    <p className="text-green-400/80 text-sm font-medium">Parabéns, combatente! Você concluiu 100% do seu plano de estudo. Excelente trabalho!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
                {(() => {
                    const hasValidMessage = todaysMissage && todaysMissage.content && todaysMissage.content !== '<p><br></p>' && todaysMissage.content.trim() !== '';
                    if (!hasValidMessage) return null;
                    return (
                        <section className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all hover:border-white/10 group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <h2 className="text-red-500 font-bold uppercase tracking-tight text-xl mb-4 flex items-center gap-2" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                Ordem do Dia
                            </h2>
                            <div className="relative z-10">
                                <p className="text-lg md:text-xl text-white font-medium leading-relaxed italic" dangerouslySetInnerHTML={{ __html: todaysMissage.content }} />
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/10 rounded-full border border-white/20 flex items-center justify-center font-bold text-xs text-zinc-300">MT</div>
                                    <span className="text-xs text-zinc-500 uppercase font-bold">Mentor Estratégico</span>
                                </div>
                            </div>
                        </section>
                    );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section className="lg:col-span-2 space-y-6">
                        {isCicloMode ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-4">
                                    <RefreshCw size={18} className="text-red-600" />
                                    <h3 className="text-white font-bold uppercase text-sm tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                        Dashboard do Ciclo
                                    </h3>
                                </div>

                                
{/* RODA ORBITAL (WHEEL OF STUDY) - COM GLOW E DINAMISMO */}
{(() => {
    const uniqueSubjects: string[] = [];
    for (const t of cicloTasks) {
        if (!uniqueSubjects.includes(t.subject)) {
            uniqueSubjects.push(t.subject);
        }
    }
    if (uniqueSubjects.length === 0) uniqueSubjects.push("Vazio");

    const activeSubject = activeCicloTask?.subject;
    const activeIndex = uniqueSubjects.indexOf(activeSubject || "");
    
    // Determining which task is currently on display (preview or active)
    const activeCicloTaskIndex = cicloTasks.findIndex(t => t.id === activeCicloTask?.id);
    const displayedTaskIndex = previewTaskIndex !== null ? previewTaskIndex : activeCicloTaskIndex;
    const displayedTask = cicloTasks[displayedTaskIndex] || activeCicloTask;
    const displayedSubjectIndex = uniqueSubjects.indexOf(displayedTask?.subject || "");
    const isPreviewingFuture = displayedTaskIndex > activeCicloTaskIndex;
    
    const sliceAngle = 360 / uniqueSubjects.length;
    // Rotate so displayedSubject is at the top (-90 deg)
    const rotationOffset = displayedSubjectIndex !== -1 ? -(displayedSubjectIndex * sliceAngle) - 90 : -90;

    const navLeft = () => {
        if (displayedTaskIndex > 0) setPreviewTaskIndex(displayedTaskIndex - 1);
    };
    const navRight = () => {
        if (displayedTaskIndex < cicloTasks.length - 1) setPreviewTaskIndex(displayedTaskIndex + 1);
    };

    // Find Links from Global Bank if not found in preloaded
    let dLinks = { resumo: displayedTask?.resumoUrl || '', questoes: displayedTask?.questoesUrl || '', aula: displayedTask?.aulaUrl || '' };
    if (globalLinks.length > 0 && displayedTask) {
        const matchingLink = globalLinks.find(l => 
            l.subject === displayedTask.subject && 
            l.topics.some(t => displayedTask.description && displayedTask.description.includes(t))
        );
        if (matchingLink) {
            if (matchingLink.resumoUrl) dLinks.resumo = matchingLink.resumoUrl;
            if (matchingLink.questoesUrl) dLinks.questoes = matchingLink.questoesUrl;
            if (matchingLink.aulaUrl) dLinks.aula = matchingLink.aulaUrl;
        }
    }

    return (
        <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-center py-4 relative mb-4 overflow-hidden">
                <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] relative group">
                    <div
                        className="w-full h-full relative transition-transform duration-1000 ease-out"
                        style={{ transform: `rotate(${rotationOffset}deg)` }}
                    >
                        {/* THE RING (VITRIFICADO) */}
                        <div className="absolute inset-[24px] sm:inset-[30px] rounded-full border border-white/20 backdrop-blur-md shadow-[0_0_40px_rgba(255,255,255,0.05)]"></div>

                        {/* PLANETS */}
                        {uniqueSubjects.map((subj, i) => {
                            const isCenter = i === displayedSubjectIndex;
                            const isActualActive = i === activeIndex;
                            const angle = (i * 360) / uniqueSubjects.length;
                            const rad = angle * (Math.PI / 180);
                            const cx = 50 + 40.5 * Math.cos(rad);
                            const cy = 50 + 40.5 * Math.sin(rad);
                            const shortName = subj.substring(0, 3).toUpperCase();

                            return (
                                <div
                                    key={`planet-${subj}`}
                                    onClick={() => {
                                        const firstOfSubj = cicloTasks.findIndex(t => t.subject === subj);
                                        if (firstOfSubj !== -1) setPreviewTaskIndex(firstOfSubj);
                                    }}
                                    className={`cursor-pointer absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-700 backdrop-blur-md ${isCenter ? 'animate-pulse-subtle' : 'hover:scale-110'}`}
                                    style={{
                                        left: `${cx}%`, top: `${cy}%`,
                                        width: isCenter ? '42px' : '28px',
                                        height: isCenter ? '42px' : '28px',
                                        backgroundColor: isCenter ? 'rgba(220,38,38,0.9)' : (isActualActive ? 'rgba(34,197,94,0.7)' : 'rgba(24,24,27,0.8)'),
                                        border: `1px solid ${isCenter ? 'rgba(252,165,165,0.8)' : 'rgba(255,255,255,0.1)'}`,
                                        boxShadow: isCenter ? '0 0 30px rgba(220,38,38,0.8)' : '0 0 10px rgba(0,0,0,0.5)',
                                        zIndex: isCenter ? 10 : 1
                                    }}
                                >
                                    <span
                                        className={`text-[9px] font-black tracking-widest transition-colors duration-500 ${isCenter ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-zinc-400'}`}
                                        style={{ transform: `rotate(${-rotationOffset}deg)` }}
                                    >
                                        {shortName}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* CENTER (MISSÃO) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-[84px] h-[84px] rounded-full border border-red-500/50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                            <span className="text-[8px] uppercase text-red-400 font-bold tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                                {isPreviewingFuture ? 'Preview' : 'Missão'}
                            </span>
                            <span className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                {displayedTaskIndex + 1}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* DASHBOARD PANEL - GLASSMORPHISM */}
            {displayedTask ? (
                <div className="bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl border border-white/10 w-full max-w-4xl mx-auto shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-center text-center px-6 sm:px-12 pb-10 pt-8">

                        {/* TARGET SUBJECT & ARROWS */}
                        <div className="w-full flex justify-between items-center mb-10 relative">
                            <button onClick={navLeft} className="w-10 h-10 z-10 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-white hover:text-red-400 transition-all duration-300 hover:bg-white/[0.1] hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>

                            <div className="flex flex-col items-center max-w-[70%]">
                                <div className="border border-red-900/50 rounded-full px-4 py-1.5 mb-4 bg-red-950/30 shadow-[0_0_15px_rgba(220,38,38,0.15)] backdrop-blur-md">
                                    <span className="text-[9px] uppercase text-red-500 font-bold tracking-widest flex items-center gap-1.5 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> 
                                        Alvo {displayedTaskIndex + 1} de {cicloTasks.length}
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-3xl font-black uppercase text-white tracking-widest leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                                    {displayedTask.subject.replace(/Ç/g, "Ç")}
                                </h2>
                            </div>

                            <button onClick={navRight} className="w-10 h-10 z-10 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-white hover:text-red-400 transition-all duration-300 hover:bg-white/[0.1] hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>

                        {/* DETAILS BLOCKS */}
                        <div className="w-full space-y-3 mb-10">
                            <div className="border border-white/10 bg-black/50 rounded-xl p-5 text-left transition-all duration-300 hover:bg-black/70 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md">
                                <span className="text-[9px] uppercase text-zinc-400 font-bold tracking-widest flex items-center gap-1.5 mb-2.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Tópicos
                                </span>
                                
                                            <p className="text-white font-bold leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{displayedTask.description}</p>
                                            {globalGoals.find(g => g.subject === displayedTask.subject && g.topic === displayedTask.description)?.specificMessage && (
                                                <div className="mt-4 bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                                                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                                    <div>
                                                        <span className="text-red-400 font-bold text-xs uppercase tracking-wider block mb-1">Instrução Específica</span>
                                                        <p className="text-red-100 text-sm leading-relaxed">{globalGoals.find(g => g.subject === displayedTask.subject && g.topic === displayedTask.description)?.specificMessage}</p>
                                                    </div>
                                                </div>
                                            )}

                            </div>
                            
                            <div className="border border-white/10 bg-black/50 rounded-xl p-5 text-left transition-all duration-300 hover:bg-black/70 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md">
                                <span className="text-[9px] uppercase text-zinc-400 font-bold tracking-widest flex items-center gap-1.5 mb-2.5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Missão
                                </span>
                                <p className="text-zinc-300 leading-relaxed text-sm">{displayedTask.description}</p>
                            </div>
                        </div>

                        {/* LINKS BUBBLES */}
                        <div className="flex flex-wrap justify-center gap-4 mb-10 w-full">
                            {dLinks.resumo ? (
                                <a href={dLinks.resumo} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] border border-white/10 rounded-2xl bg-white/[0.03] p-4 flex flex-col items-center hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></div>
                                    <span className="text-white font-bold text-sm">Resumo</span>
                                </a>
                            ) : (
                                <div className="flex-1 min-w-[140px] border border-white/5 rounded-2xl bg-black/40 p-4 flex flex-col items-center opacity-50">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></div>
                                    <span className="text-zinc-500 font-bold text-sm">Sem Resumo</span>
                                </div>
                            )}

                            {dLinks.questoes ? (
                                <a href={dLinks.questoes} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] border border-white/10 rounded-2xl bg-white/[0.03] p-4 flex flex-col items-center hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>
                                    <span className="text-white font-bold text-sm">Questões</span>
                                </a>
                            ) : (
                                <div className="flex-1 min-w-[140px] border border-white/5 rounded-2xl bg-black/40 p-4 flex flex-col items-center opacity-50">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg></div>
                                    <span className="text-zinc-500 font-bold text-sm">Sem Questões</span>
                                </div>
                            )}

                            {dLinks.aula ? (
                                <a href={dLinks.aula} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] border border-white/10 rounded-2xl bg-white/[0.03] p-4 flex flex-col items-center hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>
                                    <span className="text-white font-bold text-sm">Videoaula</span>
                                </a>
                            ) : (
                                <div className="flex-1 min-w-[140px] border border-white/5 rounded-2xl bg-black/40 p-4 flex flex-col items-center opacity-50">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center mb-3"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>
                                    <span className="text-zinc-500 font-bold text-sm">Sem Aula</span>
                                </div>
                            )}
                        </div>

                        {/* ACTION BUTTON */}
                        <div className="w-full flex flex-col items-center">
                            {isPreviewingFuture ? (
                                <div className="bg-zinc-900/50 border border-zinc-700/50 text-zinc-400 font-bold uppercase text-[11px] tracking-widest px-12 py-5 rounded-xl flex items-center gap-2 mb-6 w-full sm:w-auto justify-center backdrop-blur-md cursor-not-allowed">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Mera Visualização (Tarefa Futura)
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleTaskClick(activeCicloTask)}
                                        className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[11px] tracking-widest px-12 py-5 rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:shadow-[0_0_45px_rgba(220,38,38,0.7)] hover:-translate-y-1 active:scale-95 flex items-center gap-2 mb-6 w-full sm:w-auto justify-center"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Missão Cumprida
                                    </button>

                                    <button
                                        onClick={() => handleTaskClick(activeCicloTask)}
                                        className="text-[9px] uppercase text-zinc-500 font-bold tracking-widest hover:text-zinc-300 transition-colors"
                                    >
                                        Não terminei o tópico, mas quero trocar de matéria
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-4xl mx-auto w-full">
                    <div className="flex flex-col items-center justify-center py-12">
                        <span className="text-5xl mb-4 animate-bounce">🏆</span>
                        <h3 className="text-xl uppercase text-green-400 font-black tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Ciclo Concluído</h3>
                        <p className="text-xs text-zinc-400 font-medium">Você venceu todas as missões deste ciclo. Reinicie ou altere seu planejamento para gerar mais tarefas.</p>
                    </div>
                </div>
            )}
        </div>
    )
})()}
{/* BLOCK END */}
                            </div>
                        ) : (
                            <div className="space-y-6">

                                {/* QUADRO DE METAS ATRASADAS */}
                                {lateTasks.length > 0 && (
                                    <div className="bg-red-950/20 backdrop-blur-md border border-red-900/50 rounded-2xl p-6 animate-pulse-subtle shadow-[0_0_20px_rgba(220,38,38,0.05)]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-red-500 font-bold uppercase text-xl flex items-center gap-2 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                                                <ShieldAlert size={20} />
                                                Tarefas em Atraso ({lateTasks.length})
                                            </h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowLateTasksConfig(true)}
                                                    className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-4 rounded-full uppercase transition-all shadow-[0_0_10px_rgba(220,38,38,0.3)] hover:scale-105"
                                                >
                                                    Incluir no Cronograma
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {lateTasks.map(task => (
                                                <div key={task.id} className="bg-black/40 backdrop-blur-md border border-white/5 p-3 rounded-xl flex justify-between items-center group transition-all hover:border-red-500/50 hover:bg-black/60">
                                                    <div>
                                                        <p className="text-white text-sm font-bold group-hover:text-red-400 transition-colors">{task.subject.replace(/Ç/g, "Ç").replace(/ã/g, "ã").replace(/í/g, "í").replace(/á/g, "á").replace(/é/g, "é").replace(/í/g, "Í").replace(/ó/g, "ó").replace(/ú/g, "ú").replace(/â/g, "â").replace(/ê/g, "ê").replace(/ô/g, "ô").replace(/õ/g, "õ").replace(/ç/g, "ç")}</p>
                                                        <p className="text-[10px] text-zinc-500 uppercase">{task.date?.split('-').reverse().join('/')} • {TASK_TYPES.find(tt => tt.type === task.type)?.label}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleTaskClick(task)}
                                                        className="bg-zinc-800/80 backdrop-blur-md hover:bg-red-600 text-zinc-400 hover:text-white p-2 rounded transition-all text-[10px] font-bold uppercase border border-white/5 hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                                    >
                                                        Cumprir Agora
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-4 italic">"O aluno que não domina seu tempo é dominado pelo inimigo."</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-bold uppercase text-2xl flex items-center gap-2 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                                        Tarefas de Hoje
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {/* Botões ocultos para alunos: Excluir, Resetar, Replanejar */}
                                        <button
                                            onClick={() => setShowAdvanceModal(true)}
                                            className="text-xs font-bold uppercase text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-105"
                                            title="Adiantar Metas"
                                        >
                                            <FastForward size={14} /> Adiantar
                                        </button>
                                        <span className="text-xs font-bold uppercase text-blue-100 bg-blue-900/50 backdrop-blur-md px-4 py-2 rounded-xl border border-blue-500/50 shadow-inner">
                                            {completedCount}/{totalCount} Concluídas
                                        </span>
                                    </div>
                                </div>

                                <div className="h-2 w-full bg-zinc-900/80 backdrop-blur-xl rounded-full overflow-hidden mb-6 border border-white/10 relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-500 ease-out relative shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                                        style={{ width: `${progressPercent}%` }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30 blur-[1px]"></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {todaysTasks.length === 0 && (
                                        <div className="p-8 text-center bg-black/50 backdrop-blur-md/30 rounded-xl border border-white/5 border-dashed text-zinc-500">
                                            Sem tarefas agendadas para hoje. Aproveite para revisar ou descansar.
                                        </div>
                                    )}

                                    {todaysTasks.map(task => {
                                        const typeInfo = TASK_TYPES.find(t => t.type === task.type);
                                        const hasLinks = !!(task.resumoUrl || task.questoesUrl || task.aulaUrl);
                                        const hasMentorMsg = task.description?.includes('MENSAGEM DO MENTOR:');
                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => handleTaskClick(task)}
                                                className={`
                        group relative rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden
                        ${task.isCompleted
                                                        ? 'bg-zinc-950/40 backdrop-blur-md border-white/5 opacity-40 grayscale'
                                                        : 'bg-black/30 backdrop-blur-2xl border-white/[0.08] hover:border-red-500/40 hover:shadow-[0_0_50px_rgba(220,38,38,0.12),0_4px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1'
                                                    }
                      `}
                                                style={{ backdropFilter: task.isCompleted ? 'blur(12px)' : 'blur(24px) saturate(180%)' }}
                                            >
                                                {/* Glass Shine Effect */}
                                                {!task.isCompleted && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
                                                )}
                                                {/* Hover Glow */}
                                                {!task.isCompleted && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/[0.06] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                                )}
                                                {/* Type Color Strip */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeInfo?.color || 'bg-gray-500'} rounded-l-2xl`} />

                                                <div className="p-5 pl-4">
                                                    <div className="flex items-start gap-4 pl-2">
                                                        <div className={`mt-1 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${task.isCompleted ? 'bg-red-600 border-red-600 shadow-[0_0_12px_rgba(220,38,38,0.4)]' : 'bg-transparent border-zinc-600/60 group-hover:border-red-500/60 group-hover:shadow-[0_0_8px_rgba(220,38,38,0.2)]'}`}>
                                                            {task.isCompleted && <Check width={14} height={14} stroke="white" strokeWidth={4} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start gap-3">
                                                                <h4 className={`font-bold text-lg uppercase tracking-tight leading-tight ${task.isCompleted ? 'text-zinc-500 line-through' : 'text-white group-hover:text-red-400 transition-colors duration-300'}`} style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                                                                    {fixEncoding(task.subject)}
                                                                </h4>
                                                                <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border shadow-lg ${task.isCompleted ? 'text-zinc-600 bg-zinc-900/40 border-white/5' : 'text-zinc-400 bg-black/50 backdrop-blur-xl border-white/[0.08]'}`}>
                                                                    {typeInfo?.label}
                                                                </span>
                                                            </div>

                                                            {/* Mensagem do Mentor */}
                                                            {hasMentorMsg && !task.isCompleted && (
                                                                <div className="mt-3 bg-blue-500/[0.08] backdrop-blur-sm border border-blue-500/20 rounded-xl p-3">
                                                                    <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-1 flex items-center gap-1.5">
                                                                        <Megaphone size={12} /> Mensagem do Mentor
                                                                    </p>
                                                                    <p className="text-xs text-blue-200/80 leading-relaxed">
                                                                        {fixEncoding(task.description?.replace('MENSAGEM DO MENTOR: ', '').split('\n')[0] || '')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Descrição normal (se não for mensagem de mentor) */}
                                                            {task.description && !hasMentorMsg && <p className={`text-sm mt-2 leading-relaxed ${task.isCompleted ? 'text-zinc-600' : 'text-zinc-400'}`}>{fixEncoding(task.description)}</p>}
                                                            {/* Global specific message */}
                                                            {(() => {
                                                                const globalMsg = globalGoals.find(g => g.subject === task.subject && g.topic === task.description)?.specificMessage;
                                                                if (globalMsg && !task.isCompleted) {
                                                                    return (
                                                                        <div className="mt-3 bg-red-900/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                                                                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={14} />
                                                                            <div>
                                                                                <span className="text-red-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">Instrução Específica</span>
                                                                                <p className="text-red-100 text-xs leading-relaxed">{globalMsg}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}


                                                            {/* Link Buttons diretamente no card - usa linksMap pré-carregado */}
                                                            {(() => {
                                                                const tLinks = linksMap[task.id];
                                                                const hasAnyLinks = !!(tLinks?.resumo || tLinks?.questoes || tLinks?.aula || task.resumoUrl || task.questoesUrl || task.aulaUrl);
                                                                if (!hasAnyLinks || task.isCompleted) return null;
                                                                const rUrl = tLinks?.resumo || task.resumoUrl || '';
                                                                const qUrl = tLinks?.questoes || task.questoesUrl || '';
                                                                const aUrl = tLinks?.aula || task.aulaUrl || '';
                                                                return (
                                                                    <div className="flex items-center gap-2 mt-3">
                                                                        {rUrl && (
                                                                            <a href={rUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 bg-blue-500/[0.08] hover:bg-blue-500/[0.15] backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                                                                                <FileText size={12} /> Resumo
                                                                            </a>
                                                                        )}
                                                                        {qUrl && (
                                                                            <a href={qUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-green-400 hover:text-green-300 bg-green-500/[0.08] hover:bg-green-500/[0.15] backdrop-blur-sm px-3 py-1.5 rounded-lg border border-green-500/20 hover:border-green-400/40 transition-all duration-300 hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                                                                                <Target size={12} /> Questões
                                                                            </a>
                                                                        )}
                                                                        {aUrl && (
                                                                            <a href={aUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 bg-purple-500/[0.08] hover:bg-purple-500/[0.15] backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                                                                                <Video size={12} /> Aula
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Revisões DO DIA */}
                                {todaysRevisions.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <h3 className="text-white font-bold uppercase text-lg flex items-center gap-2 mb-6">
                                            <RefreshCw size={20} className="text-blue-500" />
                                            Revisões do Dia
                                        </h3>
                                        <div className="space-y-3">
                                            {todaysRevisions.map(rev => (
                                                <div
                                                    key={rev.id}
                                                    onClick={() => handleCompleteRevision(rev.id)}
                                                    className="group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden bg-black/50 backdrop-blur-md border-white/10 hover:border-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.1)]"
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                                    <div className="flex items-start gap-4 pl-2">
                                                        <div className="mt-1 w-6 h-6 rounded border flex items-center justify-center transition-colors bg-transparent border-zinc-600 group-hover:border-blue-500">
                                                            <Check width={14} height={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={4} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-bold text-lg text-white">
                                                                    {rev.subject}
                                                                </h4>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                                                                        Revis�o {rev.stage}d
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {rev.topic && <p className="text-sm mt-1 text-zinc-400">{rev.topic}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="bg-black/50 backdrop-blur-md/20 border border-white/5 rounded-xl p-6 h-fit">
                        <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest mb-4">Pr�ximos Passos</h3>
                        <div className="space-y-4">
                            {DAYS_OF_WEEK.map((day, idx) => {
                                if (idx < weekDayIndex) return null;
                                const isToday = day === currentDayName;
                                const targetDate = new Date(todayDate);
                                targetDate.setDate(todayDate.getDate() + (idx - weekDayIndex));

                                const y = targetDate.getFullYear();
                                const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                                const d = String(targetDate.getDate()).padStart(2, '0');
                                const targetIso = `${y}-${m}-${d}`;

                                const tasksForDay = plan.tasks.filter(t => {
                                    if (t.date) return t.date === targetIso;
                                    return false;
                                });

                                return (
                                    <div key={day} className={`flex justify-between items-center py-2 border-b border-white/5 ${isToday ? 'opacity-100' : 'opacity-60'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-bold w-10 ${isToday ? 'text-red-500' : 'text-zinc-500'}`}>{day.substring(0, 3)}</span>
                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-700"></div>
                                        </div>
                                        <span className="text-xs font-mono text-zinc-400">{tasksForDay.length} tarefas</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5"><p className="text-xs text-zinc-600 text-center leading-relaxed">"A disciplina é a ponte entre metas e realizações."</p></div>
                    </section>
                </div>

                {!isCicloMode && (
                    <div className="w-full">
                        {/* CRONOGRAMA SEMANAL */}
                        <div className="mt-8 border-t border-white/5 pt-8 w-full">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h3 className="text-white font-bold uppercase text-xl tracking-tight flex items-center gap-2">
                                    <Calendar size={24} className="text-red-600" />
                                    Cronograma Semanal
                                </h3>
                                <div className="flex items-center gap-4">
                                    {isEditingSchedule ? (
                                        <button onClick={saveEditedSchedule} className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-green-600/20">Concluir Edição</button>
                                    ) : (
                                        <button onClick={() => setIsEditingSchedule(true)} className="bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition border border-white/10">Alterar Cronograma</button>
                                    )}
                                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-inner">
                                        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Semana Anterior">
                                            <ArrowLeft size={16} />
                                        </button>
                                        <span className="text-xs font-mono font-bold text-zinc-300 px-2 min-w-[100px] text-center">
                                            {weekOffset === 0 ? 'Semana Atual' : (weekOffset > 0 ? `+${weekOffset} Semana(s)` : `${weekOffset} Semana(s)`)}
                                        </span>
                                        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition" title="Próxima Semana">
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 xl:grid-cols-7 2xl:grid-cols-7 gap-4">
                                {DAYS_OF_WEEK.map((day, idx) => {
                                    const dateStr = getWeekDate(idx, weekOffset);
                                    const isToday = day === currentDayName && weekOffset === 0;

                                    const dayTasks = plan.tasks.filter(t => {
                                        if (!t.date) return false;
                                        return t.date === dateStr;
                                    });

                                    return (
                                        <div
                                            key={day}
                                            className={`p-4 rounded-xl border flex flex-col ${isToday ? 'bg-black/60 backdrop-blur-xl border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20' : 'bg-black/40 backdrop-blur-xl border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)]'} min-h-[300px] hover:border-white/20 transition-all ${isEditingSchedule ? 'border-dashed border-zinc-600 bg-zinc-900/30' : ''}`}
                                            onDragOver={(e) => { if (isEditingSchedule) e.preventDefault(); }}
                                            onDrop={(e) => {
                                                if (!isEditingSchedule) return;
                                                e.preventDefault();
                                                const taskId = e.dataTransfer.getData("taskId");
                                                if (taskId) moveTask(taskId, dateStr);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2 pointer-events-none">
                                                <span className={`font-bold uppercase text-sm ${isToday ? 'text-red-500' : 'text-zinc-400'}`}>{day}</span>
                                                <span className="text-[10px] text-zinc-600 font-mono">{dateStr.split('-').reverse().slice(0, 2).join('/')}</span>
                                            </div>
                                            {dayTasks.length > 0 ? (
                                                <div className="space-y-3 flex-1">
                                                    {dayTasks.map(t => {
                                                        const tType = TASK_TYPES.find(tt => tt.type === t.type);
                                                        return (
                                                            <div
                                                                key={t.id}
                                                                draggable={isEditingSchedule}
                                                                onDragStart={(e) => {
                                                                    if (!isEditingSchedule) return;
                                                                    e.dataTransfer.setData("taskId", t.id);
                                                                    e.currentTarget.style.opacity = '0.5';
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    e.currentTarget.style.opacity = '1';
                                                                }}
                                                                onClick={() => {
                                                                    if (isEditingSchedule) return;
                                                                    if (t.date && t.date <= isoDate) {
                                                                        handleTaskClick(t);
                                                                    } else {
                                                                        showAlert("Tarefa Futura", `Assunto: ${fixEncoding(t.subject)}\nData: ${dateStr.split('-').reverse().join('/')}\n\nEsta tarefa só poderá ser cumprida quando chegar o dia ou se você adiantar seus assuntos.`);
                                                                    }
                                                                }}
                                                                className={`text-[11px] p-3 rounded-lg border transition-colors ${isEditingSchedule ? 'cursor-grab active:cursor-grabbing hover:border-blue-500' : 'cursor-pointer hover:border-red-500'} ${t.isCompleted ? 'bg-black/40 backdrop-blur-xl border-white/5 shadow-inner text-zinc-600 line-through' : 'bg-zinc-900/80 backdrop-blur-md border-white/5 text-white shadow-inner flex flex-col gap-1'}`}
                                                            >
                                                                <div className="flex items-start gap-1.5 mb-1 pointer-events-none">
                                                                    <div className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${tType?.color || 'bg-gray-500'}`}></div>
                                                                    <span className="font-bold leading-relaxed block break-words">
                                                                        {fixEncoding(t.subject)}
                                                                    </span>
                                                                </div>
                                                                <div className="opacity-70 text-[10px] uppercase font-bold tracking-widest pl-3 pointer-events-none">{tType?.label}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-zinc-600 text-[11px] font-bold tracking-widest uppercase italic flex-1">Descanso</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                )}
                {/* MODAL CONFIGURAR METAS ATRASADAS */}
                {showLateTasksConfig && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Integrar Atrasos</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Escolha quantas tarefas extras você deseja adicionar ao seu cronograma diário até zerar os atrasos.
                            </p>

                            <div className="space-y-4 mb-8">
                                <label className="block text-xs font-bold text-zinc-500 uppercase">Tarefas extras por dia</label>
                                <div className="flex items-center gap-4">
                                    {[1, 2, 3, 4].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setExtraTasksPerDay(num)}
                                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${extraTasksPerDay === num ? 'bg-red-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                                        >
                                            +{num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLateTasksConfig(false)}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleLateTaskSpread}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg"
                                >
                                    CONFIRMAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE CONCLUSÃO TÁTICA */}
                {taskToComplete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                        <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 max-w-md w-full shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(220,38,38,0.05)] relative overflow-hidden" style={{ backdropFilter: 'blur(40px) saturate(180%)' }}>

                            {/* Glass Shine */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none rounded-3xl" />

                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-black/60 backdrop-blur-xl rounded-full border-2 border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                                    <Shield size={24} fill="currentColor" />
                                </div>
                            </div>

                            <div className="text-center mb-8 mt-4 relative z-10">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Relatório de Combate</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Aluno, você já terminou ou precisa estudar mais alguma coisa sobre <br />
                                    <span className="text-white font-bold bg-white/[0.06] backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10 inline-block mt-2">{fixEncoding(taskToComplete.subject)}</span> <br />
                                    <span className="text-zinc-500 text-xs mt-2 inline-block">na próxima aula?</span>
                                </p>

                                {/* Mensagem do Mentor (se houver) */}
                                {taskToComplete.description?.includes('MENSAGEM DO MENTOR:') && (
                                    <div className="mt-5 bg-blue-500/[0.06] backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 text-left">
                                        <p className="text-[10px] uppercase font-bold text-blue-400 tracking-widest mb-2 flex items-center gap-1.5">
                                            <Megaphone size={12} /> Mensagem do Mentor
                                        </p>
                                        <p className="text-sm text-blue-200/80 leading-relaxed">
                                            {fixEncoding(taskToComplete.description?.replace('MENSAGEM DO MENTOR: ', '').split('\n')[0] || '')}
                                        </p>
                                    </div>
                                )}

                                {/* Botões de Links - SEMPRE visíveis quando existirem */}
                                {(taskLinks || taskToComplete.resumoUrl || taskToComplete.questoesUrl || taskToComplete.aulaUrl) && (
                                    <div className="mt-6">
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.15em] mb-3">Material de Apoio</p>
                                        <div className="flex gap-3 justify-center">
                                            {(taskLinks?.resumo || taskToComplete.resumoUrl) && (
                                                <a href={taskLinks?.resumo || taskToComplete.resumoUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-all duration-300 bg-blue-500/[0.06] hover:bg-blue-500/[0.12] backdrop-blur-sm p-4 rounded-2xl border border-blue-500/15 hover:border-blue-400/40 w-28 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                        <FileText size={20} className="text-blue-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Resumo</span>
                                                </a>
                                            )}
                                            {(taskLinks?.questoes || taskToComplete.questoesUrl) && (
                                                <a href={taskLinks?.questoes || taskToComplete.questoesUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-all duration-300 bg-green-500/[0.06] hover:bg-green-500/[0.12] backdrop-blur-sm p-4 rounded-2xl border border-green-500/15 hover:border-green-400/40 w-28 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                                        <Target size={20} className="text-green-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Questões</span>
                                                </a>
                                            )}
                                            {(taskLinks?.aula || taskToComplete.aulaUrl) && (
                                                <a href={taskLinks?.aula || taskToComplete.aulaUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-all duration-300 bg-purple-500/[0.06] hover:bg-purple-500/[0.12] backdrop-blur-sm p-4 rounded-2xl border border-purple-500/15 hover:border-purple-400/40 w-28 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                                        <Video size={20} className="text-purple-400" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Aula</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 relative z-10">
                                <button
                                    onClick={() => handleConfirmCompletion(false)}
                                    className="w-full bg-green-600/90 hover:bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.25)] group border border-green-500/30"
                                >
                                    <Check size={20} className="group-hover:scale-110 transition-transform" />
                                    <div className="text-left">
                                        <span className="block text-sm uppercase tracking-wide font-black">Tarefa Concluída</span>
                                        <span className="block text-[10px] font-normal opacity-70">Conteúdo dominado. Finalizar.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleConfirmCompletion(true)}
                                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 border border-white/[0.08] hover:border-yellow-500/30 group hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]"
                                >
                                    <Clock size={20} className="text-yellow-500 group-hover:rotate-12 transition-transform" />
                                    <div className="text-left">
                                        <span className="block text-sm uppercase tracking-wide">Solicitar Reforço</span>
                                        <span className="block text-[10px] font-normal text-zinc-500 group-hover:text-zinc-300 transition-colors">Reprogramar continuação para amanhã.</span>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setTaskToComplete(null)}
                                className="mt-8 text-zinc-600 hover:text-red-500 text-xs font-bold uppercase tracking-[0.15em] w-full text-center transition-colors relative z-10"
                            >
                                Cancelar Relatório
                            </button>
                        </div>
                    </div>
                )}
                {/* MODAL DE REPLANEJAMENTO */}
                {showRescheduleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">

                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-yellow-600 shadow-lg">
                                    <RefreshCw size={24} />
                                </div>
                            </div>

                            <div className="text-center mb-8 mt-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Revisão Estratégica</h3>
                                <p className="text-zinc-300 text-sm leading-relaxed">
                                    Identificamos <span className="text-red-500 font-bold">{delayedTasksCount} tarefas atrasadas</span>.
                                    <br /><br />
                                    Deseja redistribuir essas tarefas automaticamente nos próximos dias de estudo para recuperar o atraso sem sobrecarga?
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={confirmReschedule}
                                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                                >
                                    <RefreshCw size={18} />
                                    CONFIRMAR REPLANEJAMENTO
                                </button>

                                <button
                                    onClick={() => setShowRescheduleModal(false)}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors border border-white/10"
                                >
                                    MANTER COMO ESTÁ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL DE RESET */}
                {showResetModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">

                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-red-600 shadow-lg">
                                    <AlertTriangle size={24} />
                                </div>
                            </div>

                            <div className="text-center mb-8 mt-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Reiniciar Ciclo</h3>
                                <p className="text-zinc-300 text-sm leading-relaxed">
                                    Tem certeza que deseja <span className="text-red-500 font-bold">reiniciar todo o progresso</span> do seu plano de estudos?
                                    <br /><br />
                                    Todas as tarefas serão marcadas como não concluídas. Essa ação não pode ser desfeita.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={confirmResetPlan}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                                >
                                    <RefreshCw size={18} className="rotate-180" />
                                    CONFIRMAR RESET
                                </button>

                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-colors border border-white/10"
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL DE ADIANTAR METAS */}
                {showAdvanceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-black/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">

                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full border-4 border-[#09090b] flex items-center justify-center text-blue-600 shadow-lg">
                                    <FastForward size={24} />
                                </div>
                            </div>

                            <div className="text-center mb-8 mt-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">Adiantar Cronograma</h3>
                                <p className="text-zinc-300 text-sm leading-relaxed">
                                    Deseja puxar as tarefas de amanhã para hoje?
                                    <br /><br />
                                    Escolha como o sistema deve reorganizar os dias seguintes.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleAdvanceGoals('rest')}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border border-white/10 hover:border-green-600 group"
                                >
                                    <div className="text-left flex-1 pl-4">
                                        <span className="block text-sm uppercase tracking-wide text-green-500 group-hover:text-green-400">Adiantar e Folgar Amanhã</span>
                                        <span className="block text-[10px] font-normal text-zinc-400">Traz as metas de amanhã para hoje. Amanhã fica livre.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleAdvanceGoals('shift')}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 border border-white/10 hover:border-blue-600 group"
                                >
                                    <div className="text-left flex-1 pl-4">
                                        <span className="block text-sm uppercase tracking-wide text-blue-500 group-hover:text-blue-400">Adiantar Sem Folga</span>
                                        <span className="block text-[10px] font-normal text-zinc-400">Puxa toda a fila de estudos. O dia de amanhã será preenchido pelo dia seguinte.</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setShowAdvanceModal(false)}
                                    className="w-full mt-4 text-zinc-600 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
