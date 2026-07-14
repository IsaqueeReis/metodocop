
import { supabase } from './supabase';
import { User, Material, Simulado, Edital, Plan, Product, Coupon, ProductFolder } from '../types';
import { StudyPlan } from '../mentoria-individual/types';

const logError = (op: string, error: any) => {
    console.error(`[DB ERROR] ${op}:`, error?.message || error);
};

export const userProgressRepo = {
    get: async <T>(userId: string, key: string, defaultValue: T): Promise<T> => {
        const { data, error } = await supabase
            .from('user_progress')
            .select('value')
            .eq('user_id', userId)
            .eq('key', key)
            .single();
        if (error || !data) return defaultValue;
        return data.value as T;
    },
    set: async <T>(userId: string, key: string, value: T): Promise<void> => {
        const { error } = await supabase
            .from('user_progress')
            .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' });
        if (error) logError(`userProgress.set(${key})`, error);
    }
};

export const globalRepo = {
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) { logError('getUsers', error); return []; }
        if (!data) return [];
        return data.map((u: any) => ({
            ...u,
            studyStreak: u.study_streak,
            lastStudyDate: u.last_study_date,
            planId: u.plan_id,
            assignedEditalId: u.assigned_edital_id,
            purchased_products: u.purchased_products || [],
            achievements: u.achievements || []
        }));
    },
    saveUser: async (user: User): Promise<void> => {
        const dbUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            password: user.password,
            approved: user.approved,
            avatar: user.avatar,
            objective: user.objective,
            achievements: user.achievements || [],
            study_streak: user.studyStreak,
            last_study_date: user.lastStudyDate,
            plan_id: user.planId,
            assigned_edital_id: user.assignedEditalId,
            purchased_products: user.purchased_products || []
        };
        const { error } = await supabase.from('users').upsert(dbUser, { onConflict: 'id' });
        if (error) logError('saveUser', error);
    },
    deleteUser: async (id: string): Promise<void> => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) logError('deleteUser', error);
    },

    getPlans: async (): Promise<Plan[]> => {
        const { data, error } = await supabase.from('app_config').select('value').eq('key', 'plans_list').single();
        if (error || !data) return [];
        return (data.value as Plan[]) || [];
    },
    savePlans: async (plans: Plan[]): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'plans_list', value: plans }, { onConflict: 'key' });
        if (error) logError('savePlans', error);
    },

    getMaterials: async (): Promise<Material[]> => {
        const { data, error } = await supabase.from('materials').select('*');
        if (error) { logError('getMaterials', error); return []; }
        if (!data) return [];
        return data.map((d: any) => d.content);
    },
    saveMaterials: async (materials: Material[]): Promise<void> => {
        for (const mat of materials) {
            const { error } = await supabase.from('materials').upsert({ id: mat.id, content: mat }, { onConflict: 'id' });
            if (error) logError(`saveMaterial(${mat.id})`, error);
        }
    },
    deleteMaterial: async (id: string): Promise<void> => {
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) logError('deleteMaterial', error);
    },

    getSimulados: async (): Promise<Simulado[]> => {
        const { data, error } = await supabase.from('simulados').select('*');
        if (error) { logError('getSimulados', error); return []; }
        if (!data) return [];
        return data.map((d: any) => d.content);
    },
    saveSimulado: async (sim: Simulado): Promise<void> => {
        const { error } = await supabase.from('simulados').upsert({ id: sim.id, content: sim }, { onConflict: 'id' });
        if (error) logError('saveSimulado', error);
    },
    deleteSimulado: async (id: string): Promise<void> => {
        const { error } = await supabase.from('simulados').delete().eq('id', id);
        if (error) logError('deleteSimulado', error);
    },

    getEditais: async (): Promise<Edital[]> => {
        const { data, error } = await supabase.from('editais').select('*');
        if (error) { logError('getEditais', error); return []; }
        if (!data) return [];
        return data.map((d: any) => d.content);
    },
    saveEdital: async (ed: Edital): Promise<void> => {
        const { error } = await supabase.from('editais').upsert({ id: ed.id, content: ed }, { onConflict: 'id' });
        if (error) logError('saveEdital', error);
    },
    deleteEdital: async (id: string): Promise<void> => {
        const { error } = await supabase.from('editais').delete().eq('id', id);
        if (error) logError('deleteEdital', error);
    },

    getStudyPlans: async (): Promise<StudyPlan[]> => {
        const { data, error } = await supabase.from('study_plans').select('*');
        if (error || !data) {
            const { data: fb } = await supabase.from('app_config').select('value').eq('key', 'study_plans_list').single();
            return (fb?.value as StudyPlan[]) || [];
        }
        return data.map((d: any) => ({
            id: d.id, title: d.title, items: d.items || [],
            generatedTasks: d.generatedtasks || d.generatedTasks,
            weeklySchedule: d.weeklyschedule || d.weeklySchedule,
            subjectConfigs: d.subjectconfigs || d.subjectConfigs,
            extraGoals: d.extragoals || d.extraGoals,
            createdAt: d.created_at || d.createdAt
        })) as StudyPlan[];
    },
    saveStudyPlan: async (plan: StudyPlan): Promise<void> => {
        const dbPlan = { id: plan.id, title: plan.title, items: plan.items || [], generatedtasks: plan.generatedTasks, weeklyschedule: plan.weeklySchedule, subjectconfigs: plan.subjectConfigs, extragoals: plan.extraGoals, created_at: plan.createdAt };
        const { error } = await supabase.from('study_plans').upsert(dbPlan, { onConflict: 'id' });
        if (error) {
            logError('saveStudyPlan', error);
            const { data } = await supabase.from('app_config').select('value').eq('key', 'study_plans_list').single();
            let plans: StudyPlan[] = (data?.value as StudyPlan[]) || [];
            const idx = plans.findIndex(p => p.id === plan.id);
            if (idx >= 0) plans[idx] = plan; else plans.push(plan);
            await supabase.from('app_config').upsert({ key: 'study_plans_list', value: plans }, { onConflict: 'key' });
        }
    },
    deleteStudyPlan: async (id: string): Promise<void> => {
        const { error } = await supabase.from('study_plans').delete().eq('id', id);
        if (error) {
            const { data } = await supabase.from('app_config').select('value').eq('key', 'study_plans_list').single();
            let plans = ((data?.value || []) as StudyPlan[]).filter(p => p.id !== id);
            await supabase.from('app_config').upsert({ key: 'study_plans_list', value: plans }, { onConflict: 'key' });
        }
    },

    getCommandMessage: async (): Promise<string> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'command_message').single();
        return data?.value?.text || '';
    },
    saveCommandMessage: async (message: string): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'command_message', value: { text: message } }, { onConflict: 'key' });
        if (error) logError('saveCommandMessage', error);
    },

    getTutorialVideo: async (): Promise<string[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'tutorial_video').single();
        if (!data) return [];
        if (data.value?.urls) return data.value.urls;
        if (data.value?.url) return [data.value.url];
        return [];
    },
    saveTutorialVideo: async (urls: string[]): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'tutorial_video', value: { urls } }, { onConflict: 'key' });
        if (error) logError('saveTutorialVideo', error);
    },

    getLogins: async (): Promise<any[]> => {
        const { data, error } = await supabase.from('user_logins').select('*, users(name, email, approved, purchased_products)').order('created_at', { ascending: false });
        if (error) { logError('getLogins', error); return []; }
        return data || [];
    },

    getProducts: async (): Promise<Product[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'products_list').single();
        return (data?.value as Product[]) || [];
    },
    saveProducts: async (products: Product[]): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'products_list', value: products }, { onConflict: 'key' });
        if (error) logError('saveProducts', error);
    },

    getProductFolders: async (): Promise<ProductFolder[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'product_folders_list').single();
        return (data?.value as ProductFolder[]) || [];
    },
    saveProductFolders: async (folders: ProductFolder[]): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'product_folders_list', value: folders }, { onConflict: 'key' });
        if (error) logError('saveProductFolders', error);
    },

    getCoupons: async (): Promise<Coupon[]> => {
        const { data } = await supabase.from('app_config').select('value').eq('key', 'coupons_list').single();
        return (data?.value as Coupon[]) || [];
    },
    saveCoupons: async (coupons: Coupon[]): Promise<void> => {
        const { error } = await supabase.from('app_config').upsert({ key: 'coupons_list', value: coupons }, { onConflict: 'key' });
        if (error) logError('saveCoupons', error);
    }
};
