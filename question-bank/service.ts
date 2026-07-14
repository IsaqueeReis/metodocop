
import { supabase } from '../services/supabase';
import { QBQuestion, QBFilters, QBStudentAnswer, QuestionType, Difficulty, QBNotebook, QBComment, QBReport } from './types';

export const QuestionBankService = {
  // Criar questão (Admin)
  async createQuestion(question: {
    statement: string;
    type: QuestionType;
    board: string;
    organ?: string;
    role?: string;
    discipline: string;
    subject?: string;
    sub_subject?: string;
    source?: string;
    year: number;
    difficulty: Difficulty;
    justification?: string;
    alternatives: { label: string; text: string; is_correct: boolean }[];
  }) {
    // 1. Inserir a Questão (Cabeçalho)
    const { data: qData, error: qError } = await supabase
      .from('qb_questions')
      .insert({
        statement: question.statement,
        type: question.type,
        board: question.board,
        organ: question.organ,
        role: question.role,
        discipline: question.discipline,
        subject: question.subject || question.discipline,
        sub_subject: question.sub_subject,
        source: question.source,
        year: question.year,
        difficulty: question.difficulty,
        is_active: true
      })
      .select()
      .single();

    if (qError || !qData) {
      throw qError || new Error('Erro ao criar questão header');
    }

    // 2. Inserir Alternativas vinculadas
    const alternativesPayload = question.alternatives.map(a => ({
      question_id: qData.id,
      label: a.label,
      text: a.text,
      is_correct: a.is_correct
    }));

    const { error: aError } = await supabase
      .from('qb_alternatives')
      .insert(alternativesPayload);

    if (aError) {
      console.error('Erro ao salvar alternativas', aError);
    }

    // 3. Inserir Justificativa (Resolução)
    if (question.justification) {
        const { error: rError } = await supabase
            .from('qb_resolutions')
            .insert({
                question_id: qData.id,
                comment_text: question.justification
            });
        
        if (rError) console.error('Erro ao salvar justificativa', rError);
    }

    return qData;
  },

  // Buscar questões com filtros avançados
  async fetchQuestions(filters: QBFilters, userId?: string): Promise<{ questions: QBQuestion[], totalCount: number }> {
    let questionIdsToFetch: string[] | null = null;
    let excludeIds: string[] | null = null;

    // Lógica do Caderno de Erros MANUAL (Prioridade 1)
    if (filters.notebookId && userId) {
        const notebooks = await this.getUserNotebooks(userId);
        const targetNotebook = notebooks.find(n => n.id === filters.notebookId);
        if (targetNotebook) {
            questionIdsToFetch = targetNotebook.questionIds;
            if (questionIdsToFetch.length === 0) return { questions: [], totalCount: 0 };
        }
    }
    // Lógica do Caderno de Erros AUTOMÁTICO (Prioridade 2)
    else if (filters.only_mistakes && userId) {
        const { data: mistakes } = await supabase
            .from('qb_student_answers')
            .select('question_id')
            .eq('user_id', userId)
            .eq('is_correct', false);
            
        if (mistakes && mistakes.length > 0) {
            questionIdsToFetch = Array.from(new Set(mistakes.map(m => m.question_id)));
        } else {
            return { questions: [], totalCount: 0 };
        }
    }

    // Filtros de Status (Resolvidas, Não Resolvidas, Acertos, Erros)
    if (filters.status && filters.status !== 'ALL' && userId) {
        if (filters.status === 'SOLVED') {
            const { data: solved } = await supabase.from('qb_student_answers').select('question_id').eq('user_id', userId);
            if (solved && solved.length > 0) {
                const ids = Array.from(new Set(solved.map(s => s.question_id)));
                questionIdsToFetch = questionIdsToFetch ? questionIdsToFetch.filter(id => ids.includes(id)) : ids;
                if (questionIdsToFetch.length === 0) return { questions: [], totalCount: 0 };
            } else {
                return { questions: [], totalCount: 0 };
            }
        } else if (filters.status === 'UNSOLVED') {
            const { data: solved } = await supabase.from('qb_student_answers').select('question_id').eq('user_id', userId);
            if (solved && solved.length > 0) {
                excludeIds = Array.from(new Set(solved.map(s => s.question_id)));
            }
        } else if (filters.status === 'CORRECT') {
            const { data: correct } = await supabase.from('qb_student_answers').select('question_id').eq('user_id', userId).eq('is_correct', true);
            if (correct && correct.length > 0) {
                const ids = Array.from(new Set(correct.map(s => s.question_id)));
                questionIdsToFetch = questionIdsToFetch ? questionIdsToFetch.filter(id => ids.includes(id)) : ids;
                if (questionIdsToFetch.length === 0) return { questions: [], totalCount: 0 };
            } else {
                return { questions: [], totalCount: 0 };
            }
        } else if (filters.status === 'INCORRECT') {
            const { data: incorrect } = await supabase.from('qb_student_answers').select('question_id').eq('user_id', userId).eq('is_correct', false);
            if (incorrect && incorrect.length > 0) {
                const ids = Array.from(new Set(incorrect.map(s => s.question_id)));
                questionIdsToFetch = questionIdsToFetch ? questionIdsToFetch.filter(id => ids.includes(id)) : ids;
                if (questionIdsToFetch.length === 0) return { questions: [], totalCount: 0 };
            } else {
                return { questions: [], totalCount: 0 };
            }
        }
    }

    let query = supabase
      .from('qb_questions')
      .select(`
        *,
        alternatives:qb_alternatives(id, label, text, is_correct)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Aplica filtro de IDs se necessário
    if (questionIdsToFetch) {
        query = query.in('id', questionIdsToFetch);
    }
    if (excludeIds && excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    // Filtros de Multi-seleção (Arrays)
    if (filters.discipline && filters.discipline.length > 0) query = query.in('discipline', filters.discipline);
    if (filters.subject && filters.subject.length > 0) query = query.in('subject', filters.subject);
    if (filters.sub_subject && filters.sub_subject.length > 0) query = query.in('sub_subject', filters.sub_subject);

    // Filtros Exatos
    if (filters.year) query = query.eq('year', filters.year);
    if (filters.type) query = query.eq('type', filters.type);
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

    // Filtros Textuais
    if (filters.board) query = query.ilike('board', `%${filters.board}%`);
    if (filters.organ) query = query.ilike('organ', `%${filters.organ}%`);
    if (filters.role) query = query.ilike('role', `%${filters.role}%`);
    if (filters.source) query = query.ilike('source', `%${filters.source}%`);
    if (filters.keyword) query = query.ilike('statement', `%${filters.keyword}%`);

    // Págination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;
    
    if (error) {
      console.error('Erro ao buscar questões:', error);
      return { questions: [], totalCount: 0 };
    }

    return {
        questions: data as QBQuestion[],
        totalCount: count || 0
    };
  },

  // Buscar resolução (Justificativa) - Chamado APÓS responder
  async fetchResolution(questionId: string) {
    const { data } = await supabase
      .from('qb_resolutions')
      .select('comment_text, legal_basis, video_url')
      .eq('question_id', questionId)
      .single();
    return data;
  },

  // Registrar resposta
  async submitAnswer(userId: string, answer: QBStudentAnswer) {
    const { error } = await supabase.from('qb_student_answers').insert({
      user_id: userId,
      question_id: answer.question_id,
      selected_alternative_id: answer.selected_alternative_id,
      is_correct: answer.is_correct,
      time_spent_seconds: answer.time_spent_seconds,
      status: 'ANSWERED'
    });
    
    if (error) console.error('Erro ao salvar resposta:', error);
  },

  // Estatísticas Rápidas
  async getUserStats(userId: string) {
    const { data } = await supabase
      .from('qb_student_answers')
      .select('is_correct, time_spent_seconds, created_at')
      .eq('user_id', userId);
      
    if (!data) return { total: 0, accuracy: 0, history: [] };
    
    const total = data.length;
    const correct = data.filter(a => a.is_correct).length;
    
    return {
      total,
      correct,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
      history: data
    };
  },

  // --- GESTíO DE CADERNOS (NOTEBOOKS) ---
  // Utiliza 'user_progress' para armazenar JSON dos cadernos, evitando migrações complexas agora.
  
  async getUserNotebooks(userId: string): Promise<QBNotebook[]> {
    const { data } = await supabase
      .from('user_progress')
      .select('value')
      .eq('user_id', userId)
      .eq('key', 'qb_notebooks')
      .single();
      
    return data?.value || [];
  },

  async saveNotebooks(userId: string, notebooks: QBNotebook[]) {
    await supabase
      .from('user_progress')
      .upsert({ user_id: userId, key: 'qb_notebooks', value: notebooks }, { onConflict: 'user_id, key' });
  },

  async createNotebook(userId: string, name: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const newNotebook: QBNotebook = {
        id: Date.now().toString(),
        name,
        questionIds: [],
        createdAt: new Date().toISOString()
    };
    await this.saveNotebooks(userId, [...notebooks, newNotebook]);
    return newNotebook;
  },

  async addQuestionToNotebook(userId: string, notebookId: string, questionId: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const updated = notebooks.map(n => {
        if (n.id === notebookId) {
            // Evita duplicatas
            if (!n.questionIds.includes(questionId)) {
                return { ...n, questionIds: [...n.questionIds, questionId] };
            }
        }
        return n;
    });
    await this.saveNotebooks(userId, updated);
  },

  async removeQuestionFromNotebook(userId: string, notebookId: string, questionId: string) {
    const notebooks = await this.getUserNotebooks(userId);
    const updated = notebooks.map(n => {
        if (n.id === notebookId) {
            return { ...n, questionIds: n.questionIds.filter(id => id !== questionId) };
        }
        return n;
    });
    await this.saveNotebooks(userId, updated);
  },

  async deleteNotebook(userId: string, notebookId: string) {
      const notebooks = await this.getUserNotebooks(userId);
      const updated = notebooks.filter(n => n.id !== notebookId);
      await this.saveNotebooks(userId, updated);
  },

  // --- GESTíO DE Questões (ADMIN) ---
  async getAllQuestions(): Promise<QBQuestion[]> {
    const { data, error } = await supabase
      .from('qb_questions')
      .select(`
        *,
        alternatives:qb_alternatives(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar todas as questões:', error);
      return [];
    }
    
    return data as QBQuestion[];
  },

  async updateQuestion(id: string, question: Partial<QBQuestion>): Promise<void> {
    const { error: qError } = await supabase
      .from('qb_questions')
      .update({
        statement: question.statement,
        type: question.type,
        board: question.board,
        organ: question.organ,
        role: question.role,
        discipline: question.discipline,
        subject: question.subject,
        sub_subject: question.sub_subject,
        source: question.source,
        year: question.year,
        difficulty: question.difficulty,
        is_active: question.is_active
      })
      .eq('id', id);

    if (qError) throw qError;

    if (question.alternatives) {
      // Deleta alternativas antigas e insere novas
      await supabase.from('qb_alternatives').delete().eq('question_id', id);
      const alternatives = question.alternatives.map(alt => ({
        question_id: id,
        label: alt.label,
        text: alt.text,
        is_correct: alt.is_correct
      }));
      await supabase.from('qb_alternatives').insert(alternatives);
    }

    if (question.resolution) {
      const { data: existingRes } = await supabase.from('qb_resolutions').select('id').eq('question_id', id).single();
      if (existingRes) {
        await supabase.from('qb_resolutions').update({
          comment_text: question.resolution.comment_text,
          legal_basis: question.resolution.legal_basis,
          video_url: question.resolution.video_url
        }).eq('question_id', id);
      } else {
        await supabase.from('qb_resolutions').insert({
          question_id: id,
          comment_text: question.resolution.comment_text,
          legal_basis: question.resolution.legal_basis,
          video_url: question.resolution.video_url
        });
      }
    }
  },

  async deleteQuestion(id: string) {
    return await supabase.from('qb_questions').delete().eq('id', id);
  },

  async renameDiscipline(oldName: string, newName: string) {
    return await supabase.from('qb_questions').update({ discipline: newName }).eq('discipline', oldName);
  },

  async renameSubject(discipline: string, oldName: string, newName: string) {
    return await supabase.from('qb_questions').update({ subject: newName }).eq('discipline', discipline).eq('subject', oldName);
  },

  async deleteDiscipline(discipline: string) {
    return await supabase.from('qb_questions').delete().eq('discipline', discipline);
  },

  async deleteSubject(discipline: string, subject: string) {
    return await supabase.from('qb_questions').delete().eq('discipline', discipline).eq('subject', subject);
  },

  // --- DENÚNCIAS (REPORTS) ---
  async createReport(report: Partial<QBReport>) {
    return await supabase.from('qb_reports').insert(report);
  },

  async getAllReports(): Promise<QBReport[]> {
    const { data } = await supabase
      .from('qb_reports')
      .select('*')
      .order('status', { ascending: true }) // PENDING primeiro
      .order('created_at', { ascending: false });
    return data || [];
  },

  async updateReportStatus(id: string, status: 'PENDING' | 'RESOLVED') {
    return await supabase.from('qb_reports').update({ status }).eq('id', id);
  },

  // --- COMENTÁRIOS ---
  async getComments(questionId: string): Promise<QBComment[]> {
    const { data, error } = await supabase
      .from('qb_comments')
      .select(`
        *,
        users (
          avatar,
          role,
          name
        ),
        likes:qb_comment_likes(user_id)
      `)
      .eq('question_id', questionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar comentários:', error);
      return [];
    }
    
    const comments = data as any[];
    
    const buildTree = (parentId: string | null): any[] => {
      return comments
        .filter(c => c.parent_id === parentId)
        .map(c => ({
          ...c,
          replies: buildTree(c.id)
        }));
    };

    return buildTree(null);
  },

  async addComment(comment: Omit<QBComment, 'id' | 'created_at' | 'users' | 'likes' | 'replies'>): Promise<void> {
    const { error } = await supabase
      .from('qb_comments')
      .insert(comment);

    if (error) throw error;
  },

  async toggleLike(commentId: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('qb_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (data) {
      await supabase.from('qb_comment_likes').delete().eq('id', data.id);
    } else {
      await supabase.from('qb_comment_likes').insert({ comment_id: commentId, user_id: userId });
    }
  }
};
