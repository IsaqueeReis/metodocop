
import { supabase } from '../services/supabase';
import { MentorshipPlan } from './types';

export const MentorshipStorage = {

  getGlobalGoalsMetadata: async () => {
    const { data, error } = await supabase.from('user_progress').select('value').eq('user_id', 'GLOBAL_ADMIN').eq('key', 'mentorship_specific_goals').single();
    if (error && error.code !== 'PGRST116') console.error(error);
    return data?.value || [];
  },
  saveGlobalGoalsMetadata: async (metadata) => {
    await supabase.from('user_progress').upsert({ user_id: 'GLOBAL_ADMIN', key: 'mentorship_specific_goals', value: metadata }, { onConflict: 'user_id, key' });
  },

  // Busca o plano do aluno no Supabase
  getPlanByStudent: async (studentId: string): Promise<MentorshipPlan | null> => {
    const { data, error } = await supabase
      .from('mentorship_plans')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar plano:', error);
        throw error;
    }
    if (!data || !data.content) return null;

    // Fetch extra data (xp, weeklySchedule) from user_progress
    const { data: extraData } = await supabase
      .from('user_progress')
      .select('value')
      .eq('user_id', studentId)
      .eq('key', 'mentorship_extra')
      .single();

    const extra = extraData?.value || {};
    const content = data.content;

    return {
        studentId: content.studentId,
        studentName: content.studentName,
        isActive: content.isActive,
        startDate: content.startDate,
        tasks: content.tasks || [],
        originalTasks: extra.originalTasks || undefined,
        xp: extra.xp || 0,
        messages: content.messages || [],
        weeklySchedule: extra.weeklySchedule || undefined,
        studyMode: content.studyMode || 'CRONOGRAMA'
    };
  },

  // Salva ou Atualiza o plano no Supabase
  savePlan: async (plan: MentorshipPlan) => {
    const dbPayload = {
        id: plan.studentId,
        content: {
            studentId: plan.studentId,
            studentName: plan.studentName,
            isActive: plan.isActive,
            startDate: plan.startDate,
            tasks: plan.tasks,
            messages: plan.messages,
            studyMode: plan.studyMode
        }
    };

    const { error } = await supabase
      .from('mentorship_plans')
      .upsert(dbPayload, { onConflict: 'id' });
      
    if (error) {
        console.error('Erro ao salvar plano de mentoria:', error);
        throw error;
    }

    // Save extra data
    const { error: extraError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: plan.studentId,
        key: 'mentorship_extra',
        value: {
          xp: plan.xp || 0,
          weeklySchedule: plan.weeklySchedule,
          originalTasks: plan.originalTasks
        }
      }, { onConflict: 'user_id, key' });

    if (extraError) {
        console.error('Erro ao salvar dados extras (XP, etc):', extraError);
        throw extraError;
    }
  },

  // Inicializa um plano se não existir (Async)
  initPlan: async (studentId: string, studentName: string): Promise<MentorshipPlan> => {
    const existing = await MentorshipStorage.getPlanByStudent(studentId);
    if (existing) return existing;

    const newPlan: MentorshipPlan = {
      studentId,
      studentName,
      isActive: true,
      startDate: new Date().toISOString().split('T')[0],
      tasks: [],
      messages: []
    };
    
    await MentorshipStorage.savePlan(newPlan);
    return newPlan;
  },

  // Deleta o plano do aluno
  deletePlan: async (studentId: string) => {
    const { error } = await supabase
      .from('mentorship_plans')
      .delete()
      .eq('student_id', studentId);
      
    if (error) {
        console.error('Erro ao deletar plano de mentoria:', error);
    }
  }
};
