import type { 
  Request, 
  LearningEntry, 
  CompanyStats,
  ScenarioStats,
  ReplyOutcome,
  ScenarioType,
  DailyDigest
} from '../types';
import { getCompanyById, companies } from '../data/companies';
import { isSlaBreach, getSuggestedEscalation } from './stateMachine';
import { formatISO, startOfDay, isToday, parseISO } from 'date-fns';

const learningEntries: LearningEntry[] = [];

export function recordOutcome(request: Request, outcome: ReplyOutcome): void {
  const lastReply = request.replies[request.replies.length - 1];
  
  const entry: LearningEntry = {
    companyId: request.companyId,
    scenario: request.scenario,
    outcome,
    responseTimeDays: lastReply?.responseTimeDays ?? 0,
    escalationLevel: request.currentEscalationLevel,
    effectiveChannel: lastReply?.channel ?? 'webform',
    effectiveArguments: extractEffectiveArguments(request),
    timestamp: formatISO(new Date()),
  };
  
  learningEntries.push(entry);
}

function extractEffectiveArguments(request: Request): string[] {
  const args: string[] = [];
  
  if (request.draftContentHe.includes('חוק הגנת הצרכן')) {
    args.push('consumer_protection_law');
  }
  if (request.draftContentHe.includes('רגולטור') || 
      request.draftContentHe.includes('משרד התקשורת')) {
    args.push('regulator_mention');
  }
  if (request.currentEscalationLevel > 0) {
    args.push('escalation_threat');
  }
  
  return args;
}

export function getCompanyStats(companyId: string): CompanyStats {
  const companyEntries = learningEntries.filter(e => e.companyId === companyId);
  
  if (companyEntries.length === 0) {
    return {
      totalRequests: 0,
      avgResponseDays: 0,
      successRate: 0,
      escalationRate: 0,
      byScenario: {} as Record<ScenarioType, ScenarioStats>,
    };
  }
  
  const successfulOutcomes: ReplyOutcome[] = ['resolved', 'partial_resolution'];
  const successCount = companyEntries.filter(
    e => successfulOutcomes.includes(e.outcome)
  ).length;
  
  const escalatedCount = companyEntries.filter(
    e => e.escalationLevel > 0
  ).length;
  
  const totalResponseDays = companyEntries.reduce(
    (sum, e) => sum + e.responseTimeDays, 0
  );
  
  const byScenario = {} as Record<ScenarioType, ScenarioStats>;
  const scenarioTypes: ScenarioType[] = [
    'cancellation', 'wrong_charge', 'unresolved_fault', 'other'
  ];
  
  for (const scenario of scenarioTypes) {
    const scenarioEntries = companyEntries.filter(e => e.scenario === scenario);
    if (scenarioEntries.length > 0) {
      const scenarioSuccess = scenarioEntries.filter(
        e => successfulOutcomes.includes(e.outcome)
      ).length;
      
      byScenario[scenario] = {
        totalRequests: scenarioEntries.length,
        avgResponseDays: scenarioEntries.reduce(
          (sum, e) => sum + e.responseTimeDays, 0
        ) / scenarioEntries.length,
        successRate: scenarioSuccess / scenarioEntries.length,
        commonResolutions: getCommonResolutions(scenarioEntries),
      };
    }
  }
  
  return {
    totalRequests: companyEntries.length,
    avgResponseDays: totalResponseDays / companyEntries.length,
    successRate: successCount / companyEntries.length,
    escalationRate: escalatedCount / companyEntries.length,
    byScenario,
  };
}

function getCommonResolutions(entries: LearningEntry[]): string[] {
  const argCounts = new Map<string, number>();
  
  for (const entry of entries) {
    if (entry.outcome === 'resolved' || entry.outcome === 'partial_resolution') {
      for (const arg of entry.effectiveArguments) {
        argCounts.set(arg, (argCounts.get(arg) ?? 0) + 1);
      }
    }
  }
  
  return Array.from(argCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([arg]) => arg);
}

export function getPlaybook(
  companyId: string, 
  scenario: ScenarioType
): {
  recommendedChannel: string;
  recommendedArguments: string[];
  avgResolutionDays: number;
  successRate: number;
  tips: string[];
  tipsHe: string[];
} {
  const entries = learningEntries.filter(
    e => e.companyId === companyId && e.scenario === scenario
  );
  
  if (entries.length === 0) {
    return {
      recommendedChannel: 'webform',
      recommendedArguments: ['consumer_protection_law'],
      avgResolutionDays: 7,
      successRate: 0,
      tips: ['No historical data available for this scenario'],
      tipsHe: ['אין נתונים היסטוריים לתרחיש זה'],
    };
  }
  
  const channelCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.outcome === 'resolved') {
      channelCounts.set(
        entry.effectiveChannel, 
        (channelCounts.get(entry.effectiveChannel) ?? 0) + 1
      );
    }
  }
  
  const bestChannel = Array.from(channelCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'webform';
  
  const successfulEntries = entries.filter(e => e.outcome === 'resolved');
  const avgDays = successfulEntries.length > 0
    ? successfulEntries.reduce((sum, e) => sum + e.responseTimeDays, 0) / 
      successfulEntries.length
    : 7;
  
  const tips: string[] = [];
  const tipsHe: string[] = [];
  
  const escalationSuccessRate = entries.filter(
    e => e.escalationLevel > 0 && e.outcome === 'resolved'
  ).length / Math.max(entries.filter(e => e.escalationLevel > 0).length, 1);
  
  if (escalationSuccessRate > 0.7) {
    tips.push('Escalation has been effective for this company');
    tipsHe.push('הסלמה הייתה אפקטיבית מול חברה זו');
  }
  
  return {
    recommendedChannel: bestChannel,
    recommendedArguments: getCommonResolutions(entries),
    avgResolutionDays: Math.round(avgDays),
    successRate: successfulEntries.length / entries.length,
    tips,
    tipsHe,
  };
}

export function generateDailyDigest(requests: Request[]): DailyDigest {
  const today = startOfDay(new Date());
  
  const pendingRequests = requests.filter(r => 
    r.status !== 'closed' && r.status !== 'verified'
  );
  
  const overdueRequests = requests.filter(r => isSlaBreach(r));
  
  const suggestedEscalations = requests
    .map(request => {
      const suggestion = getSuggestedEscalation(request);
      if (!suggestion) return null;
      return { request, ...suggestion };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  
  const resolvedToday = requests.filter(r => 
    r.status === 'resolved' && 
    r.statusHistory.some(h => 
      h.status === 'resolved' && isToday(parseISO(h.timestamp))
    )
  ).length;
  
  const newReplies = requests.filter(r =>
    r.replies.some(reply => isToday(parseISO(reply.receivedAt)))
  ).length;
  
  const totalCost = requests.reduce((sum, r) => sum + r.costEstimate, 0);
  const closedCount = requests.filter(r => r.status === 'closed').length;
  
  return {
    date: formatISO(today),
    pendingRequests,
    overdueRequests,
    suggestedEscalations,
    stats: {
      totalActive: pendingRequests.length,
      newReplies,
      resolvedToday,
      averageCostPerCase: closedCount > 0 ? totalCost / closedCount : 0,
    },
  };
}

export function updateCompanyStatsFromRequest(request: Request): void {
  const company = getCompanyById(request.companyId);
  if (!company) return;
  
  const stats = getCompanyStats(request.companyId);
  company.stats = stats;
}

export function getLearningInsights(): {
  totalCases: number;
  overallSuccessRate: number;
  avgResolutionDays: number;
  bestPerformingCompanies: { id: string; name: string; successRate: number }[];
  mostCommonScenario: ScenarioType;
} {
  if (learningEntries.length === 0) {
    return {
      totalCases: 0,
      overallSuccessRate: 0,
      avgResolutionDays: 0,
      bestPerformingCompanies: [],
      mostCommonScenario: 'other',
    };
  }
  
  const successfulOutcomes: ReplyOutcome[] = ['resolved', 'partial_resolution'];
  const successCount = learningEntries.filter(
    e => successfulOutcomes.includes(e.outcome)
  ).length;
  
  const totalDays = learningEntries.reduce(
    (sum, e) => sum + e.responseTimeDays, 0
  );
  
  const companySuccessRates = companies.map(company => {
    const companyEntries = learningEntries.filter(
      e => e.companyId === company.id
    );
    if (companyEntries.length === 0) return null;
    
    const companySuccess = companyEntries.filter(
      e => successfulOutcomes.includes(e.outcome)
    ).length;
    
    return {
      id: company.id,
      name: company.nameHe,
      successRate: companySuccess / companyEntries.length,
    };
  }).filter((c): c is NonNullable<typeof c> => c !== null);
  
  companySuccessRates.sort((a, b) => b.successRate - a.successRate);
  
  const scenarioCounts = new Map<ScenarioType, number>();
  for (const entry of learningEntries) {
    scenarioCounts.set(
      entry.scenario, 
      (scenarioCounts.get(entry.scenario) ?? 0) + 1
    );
  }
  
  const mostCommonScenario = Array.from(scenarioCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
  
  return {
    totalCases: learningEntries.length,
    overallSuccessRate: successCount / learningEntries.length,
    avgResolutionDays: totalDays / learningEntries.length,
    bestPerformingCompanies: companySuccessRates.slice(0, 3),
    mostCommonScenario,
  };
}
