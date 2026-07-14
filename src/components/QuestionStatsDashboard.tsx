import React from 'react';
import { QuestionStats, Subject } from '../../types';
import { QuestionPieChart } from '../../components/ui/Charts';
import { Target, BarChart2, TrendingUp, Award, BookOpen, CheckCircle, XCircle } from '../../components/ui/Icons';

interface QuestionStatsDashboardProps {
  stats: QuestionStats;
  subjects: Subject[];
}

export const QuestionStatsDashboard: React.FC<QuestionStatsDashboardProps> = ({ stats, subjects }) => {
  const total = stats.total || 0;
  const correct = stats.correct || 0;
  const incorrect = stats.incorrect || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Calculate stats by subject hierarchically
  const hierarchicalStats: Record<string, any> = {};

  Object.entries(stats.bySubject || {}).forEach(([key, data]: [string, any]) => {
    const parts = key.split('|');
    const discipline = parts[0] || 'Geral';
    const subject = parts[1];
    const subSubject = parts[2];

    if (!hierarchicalStats[discipline]) {
      hierarchicalStats[discipline] = { total: 0, correct: 0, incorrect: 0, subjects: {} };
    }
    hierarchicalStats[discipline].total += data.total;
    hierarchicalStats[discipline].correct += data.correct;
    hierarchicalStats[discipline].incorrect += data.incorrect;

    if (subject) {
      if (!hierarchicalStats[discipline].subjects[subject]) {
        hierarchicalStats[discipline].subjects[subject] = { total: 0, correct: 0, incorrect: 0, subSubjects: {} };
      }
      hierarchicalStats[discipline].subjects[subject].total += data.total;
      hierarchicalStats[discipline].subjects[subject].correct += data.correct;
      hierarchicalStats[discipline].subjects[subject].incorrect += data.incorrect;

      if (subSubject) {
        if (!hierarchicalStats[discipline].subjects[subject].subSubjects[subSubject]) {
          hierarchicalStats[discipline].subjects[subject].subSubjects[subSubject] = { total: 0, correct: 0, incorrect: 0 };
        }
        hierarchicalStats[discipline].subjects[subject].subSubjects[subSubject].total += data.total;
        hierarchicalStats[discipline].subjects[subject].subSubjects[subSubject].correct += data.correct;
        hierarchicalStats[discipline].subjects[subject].subSubjects[subSubject].incorrect += data.incorrect;
      }
    }
  });

  const subjectStats = Object.entries(hierarchicalStats).map(([name, data]) => ({
    name,
    ...data,
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    subjectsList: Object.entries(data.subjects).map(([subName, subData]: [string, any]) => ({
      name: subName,
      ...subData,
      accuracy: subData.total > 0 ? Math.round((subData.correct / subData.total) * 100) : 0,
      subSubjectsList: Object.entries(subData.subSubjects).map(([subSubName, subSubData]: [string, any]) => ({
        name: subSubName,
        ...subSubData,
        accuracy: subSubData.total > 0 ? Math.round((subSubData.correct / subSubData.total) * 100) : 0
      })).sort((a, b) => b.total - a.total)
    })).sort((a, b) => b.total - a.total)
  })).sort((a, b) => b.total - a.total);

  const [expandedDisciplines, setExpandedDisciplines] = React.useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = React.useState<Record<string, boolean>>({});

  const toggleDiscipline = (name: string) => setExpandedDisciplines(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleSubject = (name: string) => setExpandedSubjects(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center hover:border-white/10 transition-colors shadow-2xl group">
          <Target size={24} className="text-zinc-500 mb-3 group-hover:text-white transition-colors" />
          <h3 className="text-3xl font-black text-white tracking-tight">{total}</h3>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-widest text-center">Respondidas</p>
        </div>
        <div className="bg-black border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center hover:border-white/10 transition-colors shadow-2xl group">
          <CheckCircle size={24} className="text-green-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-3xl font-black text-green-500 tracking-tight">{correct}</h3>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-widest text-center">Acertos</p>
        </div>
        <div className="bg-black border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center hover:border-white/10 transition-colors shadow-2xl group">
          <XCircle size={24} className="text-red-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-3xl font-black text-red-500 tracking-tight">{incorrect}</h3>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-widest text-center">Erros</p>
        </div>
        <div className="bg-black border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center hover:border-white/10 transition-colors shadow-2xl group">
          <Award size={24} className="text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-3xl font-black text-blue-500 tracking-tight">{accuracy}%</h3>
          <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-widest text-center">Aproveitamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-1 bg-black border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center relative shadow-2xl group">

          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 self-start">
            <BarChart2 size={18} className="text-zinc-500" />
            Visão de Combate
          </h3>
          <div className="relative w-full flex justify-center py-4 hover:scale-105 transition-transform duration-500">
            <QuestionPieChart correct={correct} incorrect={incorrect} />
          </div>
          <div className="w-full mt-8 grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center transition-colors">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Acertos</p>
              <p className="text-2xl font-black text-green-500 tracking-tight">{correct}</p>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-center transition-colors">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Erros</p>
              <p className="text-2xl font-black text-red-500 tracking-tight">{incorrect}</p>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="lg:col-span-2 bg-black border border-white/5 p-6 rounded-2xl flex flex-col relative shadow-2xl">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-zinc-500" />
            Relatório por Setor (Matérias)
          </h3>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2 space-y-4">
            {subjectStats.length > 0 ? (
              subjectStats.map((s, idx) => (
                <div key={idx} className="bg-black/30 border border-white/5 p-4 rounded-xl transition-all duration-300 hover:bg-black/50 group/item hover:border-white/10">
                  <div 
                    className="flex justify-between items-center mb-3 cursor-pointer p-2 -m-2 rounded-lg transition-colors"
                    onClick={() => toggleDiscipline(s.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-zinc-400 group-hover/item:text-blue-500 transition-colors border border-white/5 shadow-inner">
                        <BookOpen size={16} />
                      </div>
                      <span className="font-bold text-zinc-200 text-sm uppercase tracking-wide group-hover/item:text-white transition-colors">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-heading font-extrabold tracking-wider drop-shadow-md ${s.accuracy >= 70 ? 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : s.accuracy >= 50 ? 'text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`}>
                        {s.accuracy}%
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {expandedDisciplines[s.name] ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center bg-black/40 p-2 rounded-lg border border-white/5">
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Total</p>
                      <p className="text-sm font-heading font-extrabold text-white tracking-wider">{s.total}</p>
                    </div>
                    <div className="text-center bg-black/40 p-2 rounded-lg border border-green-900/20">
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Acertos</p>
                      <p className="text-sm font-heading font-extrabold text-green-500 tracking-wider">{s.correct}</p>
                    </div>
                    <div className="text-center bg-black/40 p-2 rounded-lg border border-red-900/20">
                      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Erros</p>
                      <p className="text-sm font-heading font-extrabold text-red-500 tracking-wider">{s.incorrect}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden flex mb-2">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500" 
                      style={{ width: `${(s.correct / s.total) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-red-500 transition-all duration-500" 
                      style={{ width: `${(s.incorrect / s.total) * 100}%` }}
                    />
                  </div>

                  {/* Nested Subjects */}
                  {expandedDisciplines[s.name] && s.subjectsList && s.subjectsList.length > 0 && (
                    <div className="mt-4 pl-4 border-l-2 border-zinc-800 space-y-3">
                      {s.subjectsList.map((sub: any, subIdx: number) => (
                        <div key={subIdx} className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                          <div 
                            className="flex justify-between items-center mb-2 cursor-pointer hover:bg-zinc-800/30 p-1 -m-1 rounded transition-colors"
                            onClick={() => toggleSubject(`${s.name}-${sub.name}`)}
                          >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-300 uppercase">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold ${sub.accuracy >= 70 ? 'text-green-500' : sub.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                {sub.accuracy}%
                              </span>
                              {sub.subSubjectsList && sub.subSubjectsList.length > 0 && (
                                <span className="text-zinc-600 text-[10px]">
                                  {expandedSubjects[`${s.name}-${sub.name}`] ? '▼' : '▶'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4 text-[10px] text-zinc-500 mb-2">
                            <span>Total: <strong className="text-zinc-300">{sub.total}</strong></span>
                            <span>Acertos: <strong className="text-green-500">{sub.correct}</strong></span>
                            <span>Erros: <strong className="text-red-500">{sub.incorrect}</strong></span>
                          </div>
                          
                          {/* Nested SubSubjects */}
                          {expandedSubjects[`${s.name}-${sub.name}`] && sub.subSubjectsList && sub.subSubjectsList.length > 0 && (
                            <div className="mt-2 pl-3 border-l border-zinc-800/50 space-y-2">
                              {sub.subSubjectsList.map((subSub: any, subSubIdx: number) => (
                                <div key={subSubIdx} className="flex justify-between items-center bg-zinc-900/30 p-2 rounded text-[10px]">
                                  <span className="text-zinc-400 capitalize truncate max-w-[150px]" title={subSub.name}>{subSub.name}</span>
                                  <div className="flex gap-3">
                                    <span className="text-green-500">{subSub.correct}</span>
                                    <span className="text-red-500">{subSub.incorrect}</span>
                                    <span className="text-zinc-500 w-6 text-right">{subSub.accuracy}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <BookOpen size={40} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">Nenhum dado por matéria</p>
                <p className="text-xs mt-1">Comece a resolver questões para ver o relatório.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
