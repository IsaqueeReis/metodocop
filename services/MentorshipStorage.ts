import { MentorshipPlan, MentorshipGoal, MentorshipCycle, MentorshipMission, StudentMissionProgress } from '../types';

export const MentorshipStorage = {
  async getPlanByStudent(studentId: string): Promise<MentorshipPlan | null> {
    const plans = this.getAllPlans();
    return plans.find(p => p.studentId === studentId) || null;
  },

  getAllPlans(): MentorshipPlan[] {
    const data = localStorage.getItem('mentorship_plans');
    return data ? JSON.parse(data) : [];
  },

  async savePlan(plan: MentorshipPlan): Promise<void> {
    const plans = this.getAllPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    localStorage.setItem('mentorship_plans', JSON.stringify(plans));
  },

  // Goals (Metas)
  async getGoalsByPlan(planId: string): Promise<MentorshipGoal[]> {
    const goals = this.getAllGoals();
    return goals.filter(g => g.planId === planId);
  },

  getAllGoals(): MentorshipGoal[] {
    const data = localStorage.getItem('mentorship_goals');
    return data ? JSON.parse(data) : [];
  },

  async saveGoal(goal: MentorshipGoal): Promise<void> {
    const goals = this.getAllGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    if (index >= 0) {
      goals[index] = goal;
    } else {
      goals.push(goal);
    }
    localStorage.setItem('mentorship_goals', JSON.stringify(goals));
  },

  // Cycles (Ciclos)
  async getCyclesByPlan(planId: string): Promise<MentorshipCycle[]> {
    const cycles = this.getAllCycles();
    return cycles.filter(c => c.planId === planId);
  },

  getAllCycles(): MentorshipCycle[] {
    const data = localStorage.getItem('mentorship_cycles');
    return data ? JSON.parse(data) : [];
  },

  async saveCycle(cycle: MentorshipCycle): Promise<void> {
    const cycles = this.getAllCycles();
    const index = cycles.findIndex(c => c.id === cycle.id);
    if (index >= 0) {
      cycles[index] = cycle;
    } else {
      cycles.push(cycle);
    }
    localStorage.setItem('mentorship_cycles', JSON.stringify(cycles));
  },

  // Missions (Missões)
  async getGlobalMissions(): Promise<MentorshipMission[]> {
    const missions = this.getAllMissions();
    return missions.filter(m => m.isGlobal);
  },

  async getMissionsByPlan(planId: string): Promise<MentorshipMission[]> {
    const missions = this.getAllMissions();
    return missions.filter(m => m.isGlobal || m.planId === planId);
  },

  getAllMissions(): MentorshipMission[] {
    const data = localStorage.getItem('mentorship_missions');
    return data ? JSON.parse(data) : [];
  },

  async saveMission(mission: MentorshipMission): Promise<void> {
    const missions = this.getAllMissions();
    const index = missions.findIndex(m => m.id === mission.id);
    if (index >= 0) {
      missions[index] = mission;
    } else {
      missions.push(mission);
    }
    localStorage.setItem('mentorship_missions', JSON.stringify(missions));
  },

  // Mission Progress
  async getStudentMissionProgress(studentId: string): Promise<StudentMissionProgress[]> {
    const data = localStorage.getItem('student_mission_progress');
    const allProgress: StudentMissionProgress[] = data ? JSON.parse(data) : [];
    return allProgress.filter(p => p.studentId === studentId);
  },

  async saveMissionProgress(progress: StudentMissionProgress): Promise<void> {
    const data = localStorage.getItem('student_mission_progress');
    const allProgress: StudentMissionProgress[] = data ? JSON.parse(data) : [];
    
    const index = allProgress.findIndex(p => p.studentId === progress.studentId && p.missionId === progress.missionId);
    if (index >= 0) {
      allProgress[index] = progress;
    } else {
      allProgress.push(progress);
    }
    localStorage.setItem('student_mission_progress', JSON.stringify(allProgress));
  }
};
