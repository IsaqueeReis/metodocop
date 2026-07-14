import React, { useState } from 'react';
import { QuestionStats, Subject } from '../../types';
import { QuestionPieChart } from '../../components/ui/Charts';
import { Target, Book, CheckCircle, XCircle } from '../../components/ui/Icons';

interface QuestionCounterPanelProps {
  stats: QuestionStats;
  subjects: Subject[];
  onUpdateStats: (correct: number, incorrect: number, subject?: string) => void;
  showNotification: (title: string, type: 'success' | 'error') => void;
}

export const QuestionCounterPanel: React.FC<QuestionCounterPanelProps> = ({ 
  stats, 
  subjects, 
  onUpdateStats, 
  showNotification 
}) => {
  const [manualCorrect, setManualCorrect] = useState(0);
  const [manualWrong, setManualWrong] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const handleUpdate = () => {
    if (manualCorrect === 0 && manualWrong === 0) return;
    onUpdateStats(manualCorrect, manualWrong, selectedSubject || undefined);
    setManualCorrect(0);
    setManualWrong(0);
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col h-full relative group shadow-xl">
      <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
        <Target size={18} className="text-zinc-500" />
        Contador de Questões
      </h3>
      
      <div className="flex-1 flex flex-col z-10">
        <div className="w-full relative mb-6 p-5 bg-zinc-900/50 rounded-xl border border-white/5">
          <h4 className="text-[10px] font-black text-center text-zinc-500 mb-6 uppercase tracking-widest">Desempenho Geral</h4>
          <div className="flex justify-center mb-6 hover:scale-105 transition-transform duration-300">
            <QuestionPieChart correct={stats.correct} incorrect={stats.incorrect} />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center border-t border-white/5 pt-5">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black text-white tracking-tight">{stats.total}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Aproveitamento</p>
              <p className="text-2xl font-black text-blue-500 tracking-tight">
                {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {stats.bySubject && Object.keys(stats.bySubject).length > 0 && (
          <div className="mb-6">
            <h4 className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Por Matéria</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
              {Object.entries(
                Object.entries(stats.bySubject).reduce((acc: any, [key, data]: [string, any]) => {
                  const discipline = key.split('|')[0] || 'Geral';
                  if (!acc[discipline]) acc[discipline] = { total: 0, correct: 0, incorrect: 0 };
                  acc[discipline].total += data.total;
                  acc[discipline].correct += data.correct;
                  acc[discipline].incorrect += data.incorrect;
                  return acc;
                }, {})
              ).map(([subj, data]: [string, any]) => (
                <div key={subj} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-xs font-bold text-zinc-300 truncate max-w-[120px]" title={subj}>{subj}</span>
                  <div className="flex items-center gap-4 text-xs font-black tracking-tight">
                    <span className="text-green-500">{data.correct}</span>
                    <span className="text-red-500">{data.incorrect}</span>
                    <span className="text-zinc-500 w-8 text-right font-sans font-bold">{Math.round((data.correct / data.total) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto space-y-4">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
              <Book size={14} className="text-blue-500" />
              Vincular à Matéria
            </label>
            <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-black border border-white/10 text-white p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all shadow-inner font-medium"
            >
              <option value="">Geral (Sem matéria específica)</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-black p-4 rounded-xl border border-white/5 flex flex-col items-center hover:border-green-500/50 transition-colors">
              <span className="text-green-500 font-black mb-4 text-[10px] uppercase tracking-widest">Acertos (+{manualCorrect})</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setManualCorrect(Math.max(0, manualCorrect - 1))} 
                  className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 active:scale-95 transition-all border border-white/10"
                >
                  -
                </button>
                <span className="text-3xl font-black text-white w-10 text-center tracking-tight">{manualCorrect}</span>
                <button 
                  onClick={() => setManualCorrect(manualCorrect + 1)} 
                  className="w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-500 active:scale-95 transition-all border border-green-500"
                >
                  +
                </button>
              </div>
            </div>
            <div className="bg-black p-4 rounded-xl border border-white/5 flex flex-col items-center hover:border-red-500/50 transition-colors">
              <span className="text-red-500 font-black mb-4 text-[10px] uppercase tracking-widest">Erros (+{manualWrong})</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setManualWrong(Math.max(0, manualWrong - 1))} 
                  className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 active:scale-95 transition-all border border-white/10"
                >
                  -
                </button>
                <span className="text-3xl font-black text-white w-10 text-center tracking-tight">{manualWrong}</span>
                <button 
                  onClick={() => setManualWrong(manualWrong + 1)} 
                  className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-500 active:scale-95 transition-all border border-red-500"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={handleUpdate} 
            disabled={manualCorrect === 0 && manualWrong === 0}
            className="w-full bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-4 rounded-xl transition-all uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Registrar Munição
          </button>
        </div>
      </div>
    </div>
  );
};
