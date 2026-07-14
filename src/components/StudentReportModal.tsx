import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ShieldAlert, Target, Clock, Brain, Trophy } from 'lucide-react';
import html2canvas from 'html2canvas';

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    stats?: {
        totalStudyTime?: number;
        questionsAnswered?: number;
        correctAnswers?: number;
    };
    planId?: string;
}

interface StudentReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: User | null;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({ isOpen, onClose, student }) => {
    const [analysisText, setAnalysisText] = useState("Com base na sua performance recente, notamos um excelente avanço! Continue focado nas matérias-base e mantenha a constância nos simulados. Você está no caminho certo para a aprovação.");
    const [isDownloading, setIsDownloading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !student) return null;

    const handleDownload = async () => {
        if (!reportRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // High resolution
                backgroundColor: '#09090b',
                logging: false,
                useCORS: true
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `Relatorio_${student.name.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Erro ao gerar imagem:", err);
            alert("Ocorreu um erro ao gerar a imagem do relatório.");
        } finally {
            setIsDownloading(false);
        }
    };

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const totalTime = student.stats?.totalStudyTime || 0;
    const qAnswered = student.stats?.questionsAnswered || 0;
    const qCorrect = student.stats?.correctAnswers || 0;
    const accuracy = qAnswered > 0 ? Math.round((qCorrect / qAnswered) * 100) : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-w-[1400px] w-full max-h-[90vh]"
                >
                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 bg-zinc-900/50 border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShieldAlert className="text-red-500" /> Relatório
                            </h2>
                            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-bold text-zinc-400">Direcionamento / Análise</label>
                            <textarea 
                                value={analysisText}
                                onChange={(e) => setAnalysisText(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:border-red-500 min-h-[150px] resize-none"
                                placeholder="Digite a análise personalizada para o aluno..."
                            />
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/10">
                            <button 
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition disabled:opacity-50 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                            >
                                {isDownloading ? (
                                    <span className="animate-pulse">Gerando Foto...</span>
                                ) : (
                                    <><Download size={20} /> Baixar Foto do Relatório</>
                                )}
                            </button>
                            <p className="text-xs text-zinc-500 mt-4 text-center">
                                O relatório será baixado no formato A4 Paisagem (Alta Qualidade).
                            </p>
                        </div>
                    </div>

                    {/* Report Preview Area */}
                    <div className="flex-1 bg-black/80 overflow-auto p-4 flex justify-center items-start">
                        {/* A4 Landscape Container */}
                        <div 
                            ref={reportRef}
                            className="bg-[#050505] text-white relative shadow-2xl shrink-0 overflow-hidden"
                            style={{ 
                                width: '297mm', 
                                height: '210mm',
                                padding: '12mm'
                            }}
                        >
                            {/* Watermark Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                                <img src="https://i.ibb.co/HpqZMgsQ/image.png" alt="" className="w-[600px] grayscale" crossOrigin="anonymous" />
                            </div>

                            {/* Header */}
                            <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-zinc-800 rounded-full border-4 border-red-900/50 flex items-center justify-center text-4xl font-bold shadow-lg overflow-hidden">
                                        {student.avatarUrl ? (
                                            <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" crossOrigin="anonymous"/>
                                        ) : (
                                            student.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-black tracking-tight text-white">{student.name}</h1>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="bg-red-900/30 text-red-500 px-3 py-1 rounded-full text-sm font-bold border border-red-900/50">
                                                {student.planId === 'vip' ? 'MÉTODO COP VIP' : 'MÉTODO COP'}
                                            </span>
                                            <span className="text-zinc-500 text-sm">{student.email}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <img src="https://i.ibb.co/HpqZMgsQ/image.png" alt="Logo" className="w-16 h-auto" crossOrigin="anonymous"/>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Relatório de Desempenho</p>
                                    <p className="text-sm font-bold text-red-500">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-8 relative z-10 h-[calc(100%-140px)]">
                                {/* Left Column: Stats */}
                                <div className="col-span-1 flex flex-col gap-6">
                                    <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                            <Clock size={28} />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 text-sm font-bold uppercase">Horas de Voo</p>
                                            <p className="text-3xl font-black text-white">{formatTime(totalTime)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                                            <Target size={28} />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 text-sm font-bold uppercase">Questões Resolvidas</p>
                                            <p className="text-3xl font-black text-white">{qAnswered}</p>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                                        <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                            <Trophy size={28} />
                                        </div>
                                        <div>
                                            <p className="text-zinc-400 text-sm font-bold uppercase">Precisão Global</p>
                                            <p className="text-3xl font-black text-white">{accuracy}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Analysis */}
                                <div className="col-span-2 flex flex-col gap-6">
                                    <div className="flex-1 bg-zinc-900/40 p-8 rounded-2xl border border-white/5 flex flex-col relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <Brain size={120} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Brain className="text-red-500" /> Direcionamento Tático do Comando
                                        </h3>
                                        <div className="prose prose-invert prose-lg max-w-none relative z-10 text-zinc-300">
                                            {analysisText.split('\n').map((para, i) => (
                                                <p key={i} className="mb-4">{para}</p>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-red-900/10 p-6 rounded-2xl border border-red-500/20 text-center mt-auto">
                                        <p className="text-red-400 font-bold tracking-widest uppercase text-sm">"Treinamento Difícil, Combate Fácil."</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
