
import { supabase } from '../services/supabase';
import { EssayTopic, EssaySubmission, EssayReview } from './types';
import { GoogleGenAI, Type } from "@google/genai";

export const EssayService = {
  // --- TOPICS ---
  async getTopics(userId?: string, userRole?: string, planName?: string): Promise<EssayTopic[]> {
    const { data } = await supabase.from('essay_topics').select('*').eq('active', true).order('created_at', { ascending: false });
    const allTopics = data || [];
    
    if (userRole === 'ADMIN' || userRole === 'MASTER_ADMIN' || !userId) {
        return allTopics;
    }

    return allTopics.filter(t => {
        if (!t.target_type || t.target_type === 'ALL') return true;
        if (t.target_type === 'STUDENT' && t.target_id === userId) return true;
        if (t.target_type === 'PLAN' && t.target_id === planName) return true;
        return false;
    });
  },
  
  async createTopic(title: string, description: string, target_type: string = 'ALL', target_id: string = '') {
    return await supabase.from('essay_topics').insert({ title, description, target_type, target_id });
  },

  async updateTopic(id: string, title: string, description: string) {
    return await supabase.from('essay_topics').update({ title, description }).eq('id', id);
  },

  async deleteTopic(id: string) {
    return await supabase.from('essay_topics').delete().eq('id', id);
  },

  async generateTopicWithAI(board: string, subject: string, prompt: string): Promise<{ title: string, description: string }> {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key not found');
    const ai = new GoogleGenAI({ apiKey });
    
    const fullPrompt = `Você é um especialista em bancas de concurso. Gere um tema de redação para a banca ${board} sobre o assunto ${subject}.
    ${prompt ? `PEDIDO ADICIONAL: ${prompt}` : ''}
    
    Retorne um JSON com o título curto do tema e o texto motivador completo e detalhado.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    });
    
    return JSON.parse(response.text);
  },

  // --- SUBMISSIONS ---
  async getStudentSubmissions(studentId: string): Promise<EssaySubmission[]> {
    const { data } = await supabase
      .from('essay_submissions')
      .select(`*, review:essay_reviews(*), topic:essay_topics(title)`)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
      
    // Flatten logic for topic_title if needed
    return (data || []).map((s: any) => ({
        ...s,
        topic_title: s.topic?.title,
        review: s.review?.[0] || null
    }));
  },

  async getAllSubmissions(): Promise<EssaySubmission[]> {
    // Admin view
    const { data } = await supabase
      .from('essay_submissions')
      .select(`*, review:essay_reviews(*), topic:essay_topics(title)`)
      .order('created_at', { ascending: false });
      
    return (data || []).map((s: any) => ({
        ...s,
        topic_title: s.topic?.title,
        review: s.review?.[0] || null
    }));
  },

  async submitEssay(submission: Partial<EssaySubmission>) {
    return await supabase.from('essay_submissions').insert(submission);
  },

  // --- REVIEWS ---
  async submitReview(review: Partial<EssayReview>) {
    const { data, error } = await supabase.from('essay_reviews').insert(review);
    if (!error) {
        // Update status
        await supabase.from('essay_submissions').update({ status: 'DONE' }).eq('id', review.submission_id);
    }
    return { data, error };
  },

  async correctEssayWithAI(essayText: string, topicTitle: string, correctionPrompt: string): Promise<{ feedback: string, score: number }> {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key not found');
    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `Você é um corretor de redações de concursos. Corrija a seguinte redação para o tema: "${topicTitle}".
    
    CRITÉRIOS DE CORREÇíO:
    ${correctionPrompt || 'Siga os critérios padrão de correção de redação para concursos públicos (Gramática, Coesão, Coerência, Argumentação, Proposta de Intervenção).'}
    
    REDAÇíO DO ALUNO:
    ${essayText}
    
    Retorne um JSON com o feedback detalhado por competência e a nota final de 0 a 100.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            score: { type: Type.NUMBER }
          },
          required: ["feedback", "score"]
        }
      }
    });

    return JSON.parse(response.text);
  }
};
