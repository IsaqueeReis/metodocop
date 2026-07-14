
import React, { useState } from 'react';
import { Upload, Zap, Check, X, Camera } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AIQuestionExtraction } from '../essay-module/types';

interface Props {
  onExtractionComplete: (data: AIQuestionExtraction) => void;
}

export const AIQuestionImport = ({ onExtractionComplete }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const processImage = async (file: File) => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setImagePreview(reader.result as string);

        // 2. Call Gemini
        try {
            const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error('Chave da API Gemini não encontrada.');
            }

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        { text: "Extract the question statement, alternatives (label and text), and identify the correct answer if marked. Also suggest subject and board. Return strictly JSON with keys: statement, alternatives [{label, text, is_correct}], subject_suggestion, board_suggestion." }
                    ]
                }
            });
            
            if (!response.text) {
                throw new Error('Nenhuma resposta recebida da IA.');
            }

            const jsonText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            if (jsonText) {
                const data = JSON.parse(jsonText) as AIQuestionExtraction;
                onExtractionComplete(data);
            }
        } catch (err) {
            console.error('Erro no processamento de imagem:', err);
            setError('Erro ao processar imagem com IA.');
        } finally {
            setLoading(false);
        }
      };
    } catch (err) {
      setError('Erro ao ler arquivo.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-3 text-sm uppercase tracking-wide">
        <Zap className="text-yellow-500" size={16}/> Importação via IA
      </h3>
      
      {!imagePreview ? (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer hover:bg-zinc-800 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Camera className="w-8 h-8 text-zinc-500 mb-2" />
                <p className="text-sm text-zinc-500"><span className="font-semibold">Clique para enviar</span> imagem da questão</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])} />
        </label>
      ) : (
        <div className="flex items-center gap-4">
            <img src={imagePreview} className="h-20 w-20 object-cover rounded border border-zinc-700" alt="Preview" />
            <div className="flex-1">
                {loading ? (
                    <div className="text-yellow-500 text-sm font-bold animate-pulse">Processando OCR e IA...</div>
                ) : (
                    <div className="text-green-500 text-sm font-bold flex items-center gap-2"><Check size={16}/> Dados Extraídos!</div>
                )}
                {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
            </div>
            <button onClick={() => setImagePreview(null)} className="p-2 text-zinc-500 hover:text-red-500"><X size={18}/></button>
        </div>
      )}
    </div>
  );
};
