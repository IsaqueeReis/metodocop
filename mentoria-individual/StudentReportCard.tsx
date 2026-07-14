import React from 'react';
import { User } from '../types';
import { Crosshair, Shield, Activity, Target, Brain, Medal, Zap, AlertTriangle, PenTool } from 'lucide-react';

interface StudentReportCardProps {
    student: User;
    redacoes: any[];
    missoes: any[];
    cop360: any;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({ student, redacoes, missoes, cop360 }) => {
    
    // Calcula Média de Redações
    const redacoesAvaliadas = redacoes.filter(r => r.score > 0);
    const mediaRedacao = redacoesAvaliadas.length > 0 
        ? Math.round(redacoesAvaliadas.reduce((sum, r) => sum + r.score, 0) / redacoesAvaliadas.length)
        : 0;

    // Calcula Missões
    const missoesCumpridas = missoes.filter(m => m.status === 'COMPLETED').length;
    const totalMissoes = missoes.length;
    const taxaMissoes = totalMissoes > 0 ? Math.round((missoesCumpridas / totalMissoes) * 100) : 0;

    // Define cor/status baseado na média
    let statusGeral = "AGUARDANDO DADOS";
    let statusColor = "text-zinc-500";
    let bgStatusColor = "bg-zinc-500/20";
    let borderStatusColor = "border-zinc-500";

    if (mediaRedacao >= 80) {
        statusGeral = "ELITE - PRONTO PARA APROVAÇÃO";
        statusColor = "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
        bgStatusColor = "bg-red-500/10";
        borderStatusColor = "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
    } else if (mediaRedacao >= 60) {
        statusGeral = "APTO - MANTENHA O FOCO";
        statusColor = "text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]";
        bgStatusColor = "bg-green-500/10";
        borderStatusColor = "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
    } else if (mediaRedacao > 0) {
        statusGeral = "ALERTA - REFORÇO NECESSÁRIO";
        statusColor = "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]";
        bgStatusColor = "bg-yellow-500/10";
        borderStatusColor = "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
    }

    const dataAtual = new Date().toLocaleDateString('pt-BR');

    return (
        <div id="student-report-card" className="relative w-[800px] h-[800px] glass-panel rounded-xl overflow-hidden text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Background Decorativo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -ml-40 -mb-40 pointer-events-none"></div>
            
            {/* Texturas Táticas */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

            <div className="relative z-10 flex flex-col h-full p-10">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-8 mb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                            {student.avatar ? (
                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                    <Shield size={48} className="text-zinc-600" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-2">{student.name}</h1>
                            <div className="flex gap-3 items-center">
                                <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded text-sm font-bold uppercase tracking-widest border border-zinc-700">COP PREMIUM VIP</span>
                                <span className="text-zinc-500 text-sm font-bold uppercase">ID: {student.id.split('-')[0].toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-zinc-400 mb-2">
                            <Activity size={18} />
                            <span className="text-sm font-bold uppercase">Relatório Tático</span>
                        </div>
                        <div className="text-sm text-zinc-500 font-mono mb-2">DATA: {dataAtual}</div>
                        <div className="text-red-500 text-sm font-bold uppercase tracking-widest">Confidencial</div>
                    </div>
                </div>

                {/* Status Geral Destacado */}
                <div className={`border-l-4 ${borderStatusColor} ${bgStatusColor} p-6 mb-10 flex justify-between items-center rounded-r-xl shadow-lg`}>
                    <div>
                        <span className={`text-sm font-bold uppercase tracking-widest block mb-2 ${statusColor}`}>Avaliação de Combate</span>
                        <h2 className="text-2xl font-black text-white">{statusGeral}</h2>
                    </div>
                    {mediaRedacao >= 80 ? (
                        <Medal size={48} className={statusColor} />
                    ) : mediaRedacao >= 60 ? (
                        <Shield size={48} className={statusColor} />
                    ) : (
                        <AlertTriangle size={48} className={statusColor} />
                    )}
                </div>

                {/* Grid de Métricas */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                    {/* Bloco de Redações */}
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.04]"><PenTool size={100}/></div>
                        <div className="flex items-center gap-2 text-zinc-400 mb-6">
                            <Brain size={24} className="text-blue-500"/>
                            <span className="font-bold uppercase tracking-wider text-sm">Escrita & Redação</span>
                        </div>
                        <div className="flex items-end gap-4">
                            <div>
                                <span className="text-5xl font-black text-white">{mediaRedacao}</span>
                                <span className="text-zinc-500 text-lg font-bold ml-1">/100</span>
                            </div>
                            <div className="text-sm text-zinc-400 font-bold uppercase pb-1 border-l-2 border-zinc-700 pl-4">
                                {redacoesAvaliadas.length} Textos<br/>Corrigidos
                            </div>
                        </div>
                    </div>

                    {/* Bloco de Missões */}
                    <div className="bg-[#111] border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.04]"><Target size={100}/></div>
                        <div className="flex items-center gap-2 text-zinc-400 mb-6">
                            <Crosshair size={24} className="text-red-500"/>
                            <span className="font-bold uppercase tracking-wider text-sm">Sala de Missões</span>
                        </div>
                        <div className="flex items-end gap-4">
                            <div>
                                <span className="text-5xl font-black text-white">{taxaMissoes}%</span>
                            </div>
                            <div className="text-sm text-zinc-400 font-bold uppercase pb-1 border-l-2 border-zinc-700 pl-4">
                                {missoesCumpridas} de {totalMissoes}<br/>Concluídas
                            </div>
                        </div>
                    </div>
                </div>

                {/* Avaliação COP 360 */}
                <div className="flex-1 bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-zinc-800 rounded-2xl p-8 relative shadow-2xl flex flex-col">
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                        <Zap size={28} className="text-yellow-500" />
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">COP 360° - Parecer do Comando</h3>
                    </div>
                    
                    <div className="text-zinc-300 text-lg leading-relaxed whitespace-pre-wrap italic flex-1 overflow-hidden">
                        {cop360?.notes ? (
                            `"${cop360.notes}"`
                        ) : (
                            <span className="text-zinc-600">O mentor ainda não elaborou o relatório descritivo. Os dados representam a evolução automatizada do aluno. Mantenha o padrão, siga a missão diária.</span>
                        )}
                    </div>
                </div>

                {/* Footer Decorativo */}
                <div className="mt-8 pt-6 border-t-2 border-zinc-900 flex justify-between items-center text-sm font-bold text-zinc-600 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Shield size={16} /> MÉTODO COP ACADEMY
                    </div>
                    <span>DESCANSAR É PARA OS FRACOS.</span>
                </div>
            </div>
        </div>
    );
};
