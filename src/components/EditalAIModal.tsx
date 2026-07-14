import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, X, Brain } from 'lucide-react';
import { Edital, EditalSubject, EditalTopic } from '../../types';

interface EditalAIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (subjects: EditalSubject[]) => void;
    showAlert: (title: string, message: string) => void;
}

export const EditalAIModal: React.FC<EditalAIModalProps> = ({ isOpen, onClose, onSuccess, showAlert }) => {
    const [rawEdital, setRawEdital] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    if (!isOpen) return null;

    const handleAnalyze = async () => {
        if (!rawEdital.trim()) return showAlert("Erro", "Cole o texto do edital para análise.");
        
        const apiKey = (window as any).env?.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || localStorage.getItem('google_ai_key');
        if (!apiKey) {
            const key = prompt('Insira sua Google Gemini API Key para utilizar a IA:');
            if (key) {
                localStorage.setItem('google_ai_key', key);
            } else {
                return showAlert("Erro Crítico", "Chave de API não configurada.");
            }
        }

        const activeKey = (window as any).env?.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || localStorage.getItem('google_ai_key');

        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });
            const prompt = `
              Analise o seguinte texto de edital/conteúdo programático de concurso.
              Identifique as Matérias (Disciplinas) e seus respectivos Tópicos.
              Retorne APENAS um JSON válido com a estrutura:
              [
                { "name": "Nome da Matéria", "topics": ["Tópico 1", "Tópico 2"] }
              ]
              
              Texto:
              "${rawEdital}"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { 
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            });

            const text = response.text || '';
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr) as { name: string, topics: string[] }[];
            
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("Formato de edital inválido retornado pela IA.");
            }

            const parsedSubjects: EditalSubject[] = data.map(s => ({
                id: crypto.randomUUID(),
                name: s.name,
                topics: s.topics.map(t => ({
                    id: crypto.randomUUID(),
                    name: t
                }))
            }));

            onSuccess(parsedSubjects);
            setRawEdital('');
            onClose();
            showAlert('Sucesso', 'Edital analisado e importado com sucesso!');
        } catch (err: any) {
            console.error(err);
            showAlert('Erro na Análise', err.message || 'Falha ao conectar com a IA.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-scale-in">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="text-red-500" size={24} />
                        Análise Inteligente de Edital (IA)
                    </h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-zinc-400 text-sm mb-4">
                        Cole o conteúdo programático do edital abaixo. A nossa IA (Gemini 2.5 Flash) vai ler o texto, identificar as matérias e separar todos os tópicos de forma automática para você.
                    </p>
                    
                    <textarea 
                        value={rawEdital}
                        onChange={e => setRawEdital(e.target.value)}
                        placeholder="Ex: LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos. 2 Tipologia textual..."
                        className="w-full h-64 bg-black/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 resize-none custom-scrollbar"
                    />
                    
                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg font-bold text-sm text-zinc-400 hover:text-white transition-colors"
                            disabled={isAnalyzing}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !rawEdital.trim()}
                            className="px-6 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-red-600 to-red-800 text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Analisando...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Gerar Edital com IA
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
