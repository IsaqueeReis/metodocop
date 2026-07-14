import React, { useState, useEffect } from 'react';
import { globalRepo, userProgressRepo } from '../services/repository';
import { User, Plan } from '../types';
import { PenTool, Map as MapIcon, Target, Activity, Plus, Trash2, Save, XCircle, Camera } from '../components/ui/Icons';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { StudentReportCard } from './StudentReportCard';

interface GestaoVIPPanelProps {
    studentId: string;
    users: User[];
    onClose: () => void;
    showAlert: (title: string, message: string) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const GestaoVIPPanel: React.FC<GestaoVIPPanelProps> = ({ studentId, users, onClose, showAlert, showConfirm }) => {
    const student = users.find(u => u.id === studentId);
    const [activeTab, setActiveTab] = useState<'redacao' | 'trilha' | 'missoes' | 'cop360' | 'relatorio'>('redacao');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // States for data
    const [redacoes, setRedacoes] = useState<any[]>([]);
    const [trilhas, setTrilhas] = useState<any[]>([]);
    const [missoes, setMissoes] = useState<any[]>([]);
    const [cop360, setCop360] = useState<any>({ reportUrl: '', notes: '' });

    useEffect(() => {
        const loadData = async () => {
            const loadedRedacoes = await userProgressRepo.get(studentId, 'redacoes_vip', []);
            const loadedTrilhas = await userProgressRepo.get(studentId, 'trilhas_vip', []);
            const loadedMissoes = await userProgressRepo.get(studentId, 'missoes_vip', []);
            const loadedCop360 = await userProgressRepo.get(studentId, 'cop360_vip', { reportUrl: '', notes: '' });
            
            setRedacoes(loadedRedacoes);
            setTrilhas(loadedTrilhas);
            setMissoes(loadedMissoes);
            setCop360(loadedCop360);
        };
        loadData();
    }, [studentId]);

    if (!student) return null;

    // Handlers for Redacao
    const addRedacao = async () => {
        const title = window.prompt("Tema da Redação:");
        if (!title) return;
        const newRedacao = { id: crypto.randomUUID(), title, date: new Date().toISOString(), score: 0, feedbackPdf: '', feedbackText: '' };
        const updated = [...redacoes, newRedacao];
        setRedacoes(updated);
        await userProgressRepo.set(studentId, 'redacoes_vip', updated);
    };

    const updateRedacao = async (id: string, field: string, value: any) => {
        const updated = redacoes.map(r => r.id === id ? { ...r, [field]: value } : r);
        setRedacoes(updated);
        await userProgressRepo.set(studentId, 'redacoes_vip', updated);
    };
    
    const removeRedacao = async (id: string) => {
        showConfirm('Confirmar', 'Excluir esta redação?', async () => {
            const updated = redacoes.filter(r => r.id !== id);
            setRedacoes(updated);
            await userProgressRepo.set(studentId, 'redacoes_vip', updated);
        });
    };

    // Handlers for Trilhas
    const addTrilha = async () => {
        const title = window.prompt("Título da Trilha/Semana:");
        if (!title) return;
        const newTrilha = { id: crypto.randomUUID(), title, dateAdded: new Date().toISOString(), content: '', link: '' };
        const updated = [...trilhas, newTrilha];
        setTrilhas(updated);
        await userProgressRepo.set(studentId, 'trilhas_vip', updated);
    };

    const updateTrilha = async (id: string, field: string, value: any) => {
        const updated = trilhas.map(t => t.id === id ? { ...t, [field]: value } : t);
        setTrilhas(updated);
        await userProgressRepo.set(studentId, 'trilhas_vip', updated);
    };

    const removeTrilha = async (id: string) => {
        showConfirm('Confirmar', 'Excluir esta trilha?', async () => {
            const updated = trilhas.filter(t => t.id !== id);
            setTrilhas(updated);
            await userProgressRepo.set(studentId, 'trilhas_vip', updated);
        });
    };

    // Handlers for Missoes
    const addMissao = async () => {
        const title = window.prompt("Título da Missão:");
        if (!title) return;
        const newMissao = { id: crypto.randomUUID(), title, description: '', status: 'PENDING', dueDate: '' };
        const updated = [...missoes, newMissao];
        setMissoes(updated);
        await userProgressRepo.set(studentId, 'missoes_vip', updated);
    };

    const updateMissao = async (id: string, field: string, value: any) => {
        const updated = missoes.map(m => m.id === id ? { ...m, [field]: value } : m);
        setMissoes(updated);
        await userProgressRepo.set(studentId, 'missoes_vip', updated);
    };

    const removeMissao = async (id: string) => {
        showConfirm('Confirmar', 'Excluir esta missão?', async () => {
            const updated = missoes.filter(m => m.id !== id);
            setMissoes(updated);
            await userProgressRepo.set(studentId, 'missoes_vip', updated);
        });
    };

    // Handler for COP 360
    const saveCop360 = async () => {
        await userProgressRepo.set(studentId, 'cop360_vip', cop360);
        showAlert('Sucesso', 'Painel COP 360 atualizado para o aluno.');
    };

    const handleDownloadReport = async () => {
        const element = document.getElementById('student-report-card');
        if (!element) return;
        
        setIsGeneratingImage(true);
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000',
                scale: 2, // Maior qualidade
                useCORS: true
            });
            const dataUrl = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.download = `Relatorio_Tatico_${student.name.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
            showAlert('Sucesso', 'Foto do relatório gerada e baixada com sucesso!');
        } catch (err) {
            console.error('Erro ao gerar imagem:', err);
            showAlert('Erro', 'Não foi possível gerar a foto.');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-zinc-950 p-6 flex justify-between items-center border-b border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            Gestão VIP: {student.name}
                        </h2>
                        <p className="text-zinc-500 text-sm">{student.email} | Individualizado</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 bg-zinc-800 rounded-full transition">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Tabs Sidebar */}
                    <div className="w-64 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-2">
                        <button onClick={() => setActiveTab('redacao')} className={`p-4 rounded-xl flex items-center gap-3 font-bold transition ${activeTab === 'redacao' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                            <PenTool size={18} /> Redação com IA
                        </button>
                        <button onClick={() => setActiveTab('trilha')} className={`p-4 rounded-xl flex items-center gap-3 font-bold transition ${activeTab === 'trilha' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                            <MapIcon size={18} /> Trilha / Mentoria
                        </button>
                        <button onClick={() => setActiveTab('missoes')} className={`p-4 rounded-xl flex items-center gap-3 font-bold transition ${activeTab === 'missoes' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                            <Target size={18} /> Sala de Missões
                        </button>
                        <button onClick={() => setActiveTab('cop360')} className={`p-4 rounded-xl flex items-center gap-3 font-bold transition ${activeTab === 'cop360' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}>
                            <Activity size={18} /> Painel COP 360°
                        </button>
                        <button onClick={() => setActiveTab('relatorio')} className={`p-4 rounded-xl flex items-center gap-3 font-bold transition mt-4 border ${activeTab === 'relatorio' ? 'bg-blue-900/30 text-blue-500 border-blue-500/50' : 'border-zinc-800 text-blue-400/70 hover:bg-zinc-800 hover:text-blue-400'}`}>
                            <Camera size={18} /> Gerar Relatório (Foto)
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
                        
                        {activeTab === 'redacao' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><PenTool size={20}/> Redações do Aluno</h3>
                                    <button onClick={addRedacao} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"><Plus size={16}/> Adicionar Redação</button>
                                </div>
                                <div className="space-y-4">
                                    {redacoes.map(r => (
                                        <div key={r.id} className="bg-zinc-900/80 backdrop-blur-md border border-white/10 p-6 rounded-xl flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-4">
                                                    <input type="text" value={r.title} onChange={e => updateRedacao(r.id, 'title', e.target.value)} className="bg-transparent text-lg font-bold text-white border-b border-zinc-700 outline-none focus:border-white w-full" placeholder="Tema..." />
                                                </div>
                                                <button onClick={() => removeRedacao(r.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Nota (0 a 100)</label>
                                                    <input type="number" value={r.score} onChange={e => updateRedacao(r.id, 'score', Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none focus:border-white" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Link PDF Correção</label>
                                                    <input type="text" value={r.feedbackPdf} onChange={e => updateRedacao(r.id, 'feedbackPdf', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none focus:border-white" placeholder="https://..." />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Feedback em Texto</label>
                                                <textarea value={r.feedbackText} onChange={e => updateRedacao(r.id, 'feedbackText', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none h-24 focus:border-white" placeholder="Comentários sobre a redação..."></textarea>
                                            </div>
                                        </div>
                                    ))}
                                    {redacoes.length === 0 && <p className="text-zinc-500 italic">Nenhuma redação cadastrada para este aluno.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'trilha' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><MapIcon size={20}/> Trilhas & Mentoria</h3>
                                    <button onClick={addTrilha} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"><Plus size={16}/> Nova Trilha</button>
                                </div>
                                <div className="space-y-4">
                                    {trilhas.map(t => (
                                        <div key={t.id} className="bg-zinc-900/80 backdrop-blur-md border border-white/10 p-6 rounded-xl flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-4">
                                                    <input type="text" value={t.title} onChange={e => updateTrilha(t.id, 'title', e.target.value)} className="bg-transparent text-lg font-bold text-white border-b border-zinc-700 outline-none focus:border-white w-full" placeholder="Ex: Semana 1 - Direito Penal" />
                                                </div>
                                                <button onClick={() => removeTrilha(t.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Link de Material (PDF/Vídeo)</label>
                                                <input type="text" value={t.link} onChange={e => updateTrilha(t.id, 'link', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none focus:border-white" placeholder="https://..." />
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Instruções / Conteúdo</label>
                                                <textarea value={t.content} onChange={e => updateTrilha(t.id, 'content', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none h-32 focus:border-white" placeholder="Descreva as tarefas da semana..."></textarea>
                                            </div>
                                        </div>
                                    ))}
                                    {trilhas.length === 0 && <p className="text-zinc-500 italic">Nenhuma trilha cadastrada para este aluno.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'missoes' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Target size={20}/> Missões Especiais</h3>
                                    <button onClick={addMissao} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition"><Plus size={16}/> Nova Missão</button>
                                </div>
                                <div className="space-y-4">
                                    {missoes.map(m => (
                                        <div key={m.id} className="bg-zinc-900/80 backdrop-blur-md border border-white/10 p-6 rounded-xl flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 pr-4">
                                                    <input type="text" value={m.title} onChange={e => updateMissao(m.id, 'title', e.target.value)} className="bg-transparent text-lg font-bold text-white border-b border-zinc-700 outline-none focus:border-white w-full" placeholder="Título da Missão" />
                                                </div>
                                                <button onClick={() => removeMissao(m.id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Status</label>
                                                    <select value={m.status} onChange={e => updateMissao(m.id, 'status', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none focus:border-white">
                                                        <option value="PENDING">Pendente (Em andamento)</option>
                                                        <option value="COMPLETED">Missão Cumprida</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Prazo (Opcional)</label>
                                                    <input type="date" value={m.dueDate} onChange={e => updateMissao(m.id, 'dueDate', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none focus:border-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500 font-bold uppercase block mb-1">Descrição Detalhada</label>
                                                <textarea value={m.description} onChange={e => updateMissao(m.id, 'description', e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded outline-none h-24 focus:border-white" placeholder="Detalhes de como cumprir a missão..."></textarea>
                                            </div>
                                        </div>
                                    ))}
                                    {missoes.length === 0 && <p className="text-zinc-500 italic">Nenhuma missão cadastrada para este aluno.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'cop360' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Activity size={20}/> Painel COP 360°</h3>
                                    <button onClick={saveCop360} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition"><Save size={16}/> Salvar COP 360</button>
                                </div>
                                <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 p-6 rounded-xl flex flex-col gap-6">
                                    <div>
                                        <label className="text-sm font-bold text-white block mb-2">Link do Relatório (Ex: Data Studio, Metabase, Imagem, PDF)</label>
                                        <p className="text-xs text-zinc-500 mb-2">Se for um link de imagem ou PDF, o sistema tentará renderizar. Se for um painel complexo, forneceremos um botão para o aluno abrir.</p>
                                        <input type="text" value={cop360.reportUrl} onChange={e => setCop360({...cop360, reportUrl: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg outline-none focus:border-white" placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-white block mb-2">Notas / Avaliação Geral do Mentor</label>
                                        <textarea value={cop360.notes} onChange={e => setCop360({...cop360, notes: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 text-white p-3 rounded-lg outline-none focus:border-white h-48" placeholder="Escreva aqui o panorama geral do desempenho do aluno..."></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'relatorio' && (
                            <div className="space-y-6 animate-fade-in flex flex-col items-center pb-20">
                                <div className="w-full flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Camera size={20}/> Relatório Tático Visual</h3>
                                    <button 
                                        onClick={handleDownloadReport} 
                                        disabled={isGeneratingImage}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
                                    >
                                        {isGeneratingImage ? 'Gerando Imagem...' : <><Download size={20}/> Baixar Foto do Relatório</>}
                                    </button>
                                </div>

                                <div className="w-full overflow-x-auto pb-8 flex justify-center bg-black/50 p-8 rounded-2xl border border-zinc-800">
                                    {/* Envolver num container para escalar para visualização, mas manter o tamanho real no html2canvas */}
                                    <div className="scale-90 origin-top shadow-2xl">
                                        <StudentReportCard 
                                            student={student} 
                                            redacoes={redacoes} 
                                            missoes={missoes} 
                                            cop360={cop360} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
