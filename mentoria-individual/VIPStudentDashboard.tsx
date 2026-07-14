import React, { useEffect, useState } from 'react';
import { userProgressRepo } from '../services/repository';
import { User } from '../types';
import { PenTool, Map as MapIcon, Target, Activity, FileText, CheckCircle, Clock } from '../components/ui/Icons';

interface VIPStudentDashboardProps {
    user: User;
    activeTab: 'redacao' | 'trilha' | 'missoes' | 'cop360';
}

export const VIPStudentDashboard: React.FC<VIPStudentDashboardProps> = ({ user, activeTab }) => {
    const [redacoes, setRedacoes] = useState<any[]>([]);
    const [trilhas, setTrilhas] = useState<any[]>([]);
    const [missoes, setMissoes] = useState<any[]>([]);
    const [cop360, setCop360] = useState<any>({ reportUrl: '', notes: '' });

    useEffect(() => {
        const loadData = async () => {
            const loadedRedacoes = await userProgressRepo.get(user.id, 'redacoes_vip', []);
            const loadedTrilhas = await userProgressRepo.get(user.id, 'trilhas_vip', []);
            const loadedMissoes = await userProgressRepo.get(user.id, 'missoes_vip', []);
            const loadedCop360 = await userProgressRepo.get(user.id, 'cop360_vip', { reportUrl: '', notes: '' });
            
            setRedacoes(loadedRedacoes);
            setTrilhas(loadedTrilhas);
            setMissoes(loadedMissoes);
            setCop360(loadedCop360);
        };
        loadData();
    }, [user.id, activeTab]); // Reload when tab changes

    return (
        <div className="w-full relative overflow-x-hidden min-h-screen">
            {/* Background Dinâmico Tecnológico e Luzes */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 -left-[20%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }}></div>
                <div className="absolute bottom-0 -right-[20%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '5s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-800/30 rounded-full blur-[150px]"></div>
            </div>

            {activeTab === 'redacao' && (
                <div className="space-y-6 relative z-10 animate-fade-in px-4">
                    <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700 tracking-tight uppercase flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                        <PenTool className="text-blue-500" size={32}/>
                        Minhas Redações (Mentoria)
                    </h2>
                    <p className="text-zinc-500">Acompanhe as correções e feedbacks individualizados do seu mentor.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {redacoes.map(r => (
                            <div key={r.id} className="bg-black/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all hover:-translate-y-1 group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white">{r.title}</h3>
                                    <div className="bg-zinc-800 px-3 py-1 rounded-full text-white font-bold text-sm">
                                        Nota: {r.score}/100
                                    </div>
                                </div>
                                <div className="text-sm text-zinc-400 mb-4 whitespace-pre-wrap">
                                    {r.feedbackText || <span className="italic">Sem comentários em texto.</span>}
                                </div>
                                {r.feedbackPdf && (
                                    <a href={r.feedbackPdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-500 px-4 py-2 rounded-lg font-bold hover:bg-blue-600/30 transition">
                                        <FileText size={16} /> Abrir Correção em PDF
                                    </a>
                                )}
                            </div>
                        ))}
                        {redacoes.length === 0 && (
                            <div className="col-span-2 text-center py-12 bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl shadow-2xl">
                                <PenTool size={48} className="mx-auto text-zinc-600 mb-4" />
                                <p className="text-zinc-500 font-bold">Nenhuma redação corrigida foi enviada para você ainda.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'trilha' && (
                <div className="space-y-6 relative z-10 animate-fade-in px-4">
                    <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700 tracking-tight uppercase flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                        <MapIcon className="text-emerald-500" size={32}/>
                        Trilha & Mentoria VIP
                    </h2>
                    <p className="text-zinc-500">Seu caminho de aprovação, traçado individualmente pelo mentor.</p>

                    <div className="space-y-4 mt-6">
                        {trilhas.map((t, index) => (
                            <div key={t.id} className="bg-black/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all hover:-translate-y-1 group relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                <div className="flex justify-between items-start mb-4 pl-4">
                                    <div>
                                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1">Passo {index + 1}</span>
                                        <h3 className="text-xl font-bold text-white">{t.title}</h3>
                                    </div>
                                </div>
                                <div className="text-zinc-300 mb-4 whitespace-pre-wrap pl-4">
                                    {t.content}
                                </div>
                                {t.link && (
                                    <div className="pl-4 mt-4">
                                        <a href={t.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold hover:bg-emerald-600/30 transition">
                                            <MapIcon size={16} /> Acessar Material
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                        {trilhas.length === 0 && (
                            <div className="text-center py-12 bg-black/60 backdrop-blur-md border border-zinc-800/50 rounded-xl shadow-2xl">
                                <MapIcon size={48} className="mx-auto text-zinc-600 mb-4" />
                                <p className="text-zinc-500 font-bold">A sua Trilha VIP está sendo preparada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'missoes' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700 tracking-tight uppercase flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                        <Target className="text-red-500" size={32}/>
                        Sala de Missões Especiais
                    </h2>
                    <p className="text-zinc-500">Missões delegadas exclusivamente a você.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {missoes.map(m => {
                            const isCompleted = m.status === 'COMPLETED';
                            return (
                            <div key={m.id} className={`bg-black/40 backdrop-blur-xl border p-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:-translate-y-1 group relative overflow-hidden ${isCompleted ? 'border-green-900/50 opacity-70' : 'border-red-900/50 hover:border-red-500'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`text-lg font-bold ${isCompleted ? 'text-green-500 line-through' : 'text-white'}`}>{m.title}</h3>
                                    {isCompleted ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded"><CheckCircle size={14}/> CUMPRIDA</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded"><Clock size={14}/> PENDENTE</span>
                                    )}
                                </div>
                                <p className="text-sm text-zinc-400 mb-4 whitespace-pre-wrap">{m.description}</p>
                                {m.dueDate && (
                                    <p className="text-xs font-bold text-zinc-500 uppercase">Prazo: {new Date(m.dueDate).toLocaleDateString('pt-BR')}</p>
                                )}
                            </div>
                        )})}
                        {missoes.length === 0 && (
                            <div className="col-span-2 text-center py-12 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                <Target size={48} className="mx-auto text-zinc-600 mb-4" />
                                <p className="text-zinc-500 font-bold">Você não possui missões ativas.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'cop360' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-700 tracking-tight uppercase flex items-center gap-3" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
                        <Activity className="text-yellow-500" size={32}/>
                        Painel COP 360°
                    </h2>
                    <p className="text-zinc-500">Sua visão geral de inteligência e performance estratégica.</p>

                    <div className="mt-6 flex flex-col gap-6">
                        {cop360.notes && (
                            <div className="bg-black/40 backdrop-blur-xl border border-yellow-900/50 p-6 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.1)] relative overflow-hidden group hover:border-yellow-500/30 transition-all">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 to-orange-500"></div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Activity className="text-yellow-500" size={18}/> Avaliação Estratégica do Mentor</h3>
                                <p className="text-zinc-300 whitespace-pre-wrap">{cop360.notes}</p>
                            </div>
                        )}

                        {cop360.reportUrl ? (
                            <div className="bg-black/40 backdrop-blur-xl border border-white/5 p-2 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] h-[600px] flex flex-col">
                                <div className="p-4 bg-zinc-900/80 rounded-t-xl border-b border-white/5 flex justify-between items-center">
                                    <span className="font-bold text-white flex items-center gap-2"><Target size={16} className="text-blue-500"/> Relatório de BI Interativo</span>
                                    <a href={cop360.reportUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-400 hover:text-blue-300 underline bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/30 hover:border-blue-500/50 transition-all">Abrir em Nova Aba</a>
                                </div>
                                <iframe src={cop360.reportUrl} className="w-full flex-1 rounded-b-xl border-none bg-zinc-950" title="Relatório COP 360"></iframe>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                <Activity size={48} className="mx-auto text-zinc-600 mb-4" />
                                <p className="text-zinc-500 font-bold">O seu Relatório COP 360° ainda não foi disponibilizado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
