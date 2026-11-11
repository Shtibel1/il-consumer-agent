import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureLearningStorage,
  createLocalStorage,
  createMemoryStorage,
  getCompanyStats,
  getLearningEntries,
  getLearningInsights,
  getPlaybook,
  isLearningEntry,
  recordOutcome,
} from './learning';
import type { Reply, Request } from '../types';

function reply(overrides: Partial<Reply> = {}): Reply {
  return {
    id: 'r1',
    content: 'reply',
    receivedAt: new Date().toISOString(),
    channel: 'email',
    responseTimeDays: 3,
    ...overrides,
  };
}

function request(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-1',
    companyId: 'hot',
    scenario: 'cancellation',
    userDescription: 'cancel please',
    draftContent: 'Draft',
    draftContentHe: 'לפי חוק הגנת הצרכן אבקש לבטל',
    status: 'replied',
    currentEscalationLevel: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [reply()],
    statusHistory: [],
    tags: [],
    costEstimate: 0.5,
    ...overrides,
  };
}

/** Minimal in-memory stand-in for window.localStorage. */
function fakeWebStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    data,
  };
}

describe('learning', () => {
  beforeEach(() => {
    configureLearningStorage(createMemoryStorage());
  });

  describe('recordOutcome', () => {
    it('counts each request once, keeping its latest outcome', () => {
      const req = request();
      recordOutcome(req, 'needs_more_info');
      recordOutcome(req, 'resolved');

      expect(getLearningEntries()).toHaveLength(1);
      expect(getLearningEntries()[0].outcome).toBe('resolved');
      expect(getCompanyStats('hot').successRate).toBe(1);
    });

    it('extracts the arguments that were used in the draft', () => {
      recordOutcome(
        request({
          draftContentHe: 'חוק הגנת הצרכן, ואפנה למשרד התקשורת',
          currentEscalationLevel: 1,
        }),
        'resolved',
      );
      expect(getLearningEntries()[0].effectiveArguments).toEqual([
        'consumer_protection_law',
        'regulator_mention',
        'escalation_threat',
      ]);
    });

    it('falls back to webform and 0 days when there is no reply yet', () => {
      recordOutcome(request({ replies: [] }), 'pending');
      const [entry] = getLearningEntries();
      expect(entry.effectiveChannel).toBe('webform');
      expect(entry.responseTimeDays).toBe(0);
    });
  });

  describe('getCompanyStats', () => {
    it('returns zeroed stats for an unknown company', () => {
      expect(getCompanyStats('nobody')).toMatchObject({
        totalRequests: 0,
        successRate: 0,
        escalationRate: 0,
      });
    });

    it('aggregates success, escalation and per-scenario stats', () => {
      recordOutcome(request({ id: 'a', replies: [reply({ responseTimeDays: 2 })] }), 'resolved');
      recordOutcome(request({ id: 'b', replies: [reply({ responseTimeDays: 4 })] }), 'partial_resolution');
      recordOutcome(
        request({ id: 'c', scenario: 'wrong_charge', currentEscalationLevel: 2, replies: [reply({ responseTimeDays: 6 })] }),
        'rejected',
      );

      const stats = getCompanyStats('hot');
      expect(stats.totalRequests).toBe(3);
      expect(stats.successRate).toBeCloseTo(2 / 3);
      expect(stats.escalationRate).toBeCloseTo(1 / 3);
      expect(stats.avgResponseDays).toBe(4);
      expect(stats.byScenario.cancellation?.successRate).toBe(1);
      expect(stats.byScenario.cancellation?.avgResponseDays).toBe(3);
      expect(stats.byScenario.wrong_charge?.successRate).toBe(0);
      expect(stats.byScenario.other).toBeUndefined();
    });
  });

  describe('getPlaybook', () => {
    it('gives a safe default when there is no history', () => {
      const playbook = getPlaybook('hot', 'cancellation');
      expect(playbook.recommendedChannel).toBe('webform');
      expect(playbook.recommendedArguments).toEqual(['consumer_protection_law']);
      expect(playbook.successRate).toBe(0);
    });

    it('recommends the channel that actually resolved cases', () => {
      recordOutcome(request({ id: 'a', replies: [reply({ channel: 'whatsapp', responseTimeDays: 1 })] }), 'resolved');
      recordOutcome(request({ id: 'b', replies: [reply({ channel: 'whatsapp', responseTimeDays: 3 })] }), 'resolved');
      recordOutcome(request({ id: 'c', replies: [reply({ channel: 'email' })] }), 'rejected');

      const playbook = getPlaybook('hot', 'cancellation');
      expect(playbook.recommendedChannel).toBe('whatsapp');
      expect(playbook.avgResolutionDays).toBe(2);
      expect(playbook.successRate).toBeCloseTo(2 / 3);
    });

    it('never recommends an empty argument list when nothing succeeded yet', () => {
      recordOutcome(request({ draftContentHe: 'שלום' }), 'rejected');
      expect(getPlaybook('hot', 'cancellation').recommendedArguments).toEqual([
        'consumer_protection_law',
      ]);
    });

    it('adds an escalation tip when escalation usually works', () => {
      recordOutcome(request({ id: 'a', currentEscalationLevel: 1 }), 'resolved');
      recordOutcome(request({ id: 'b', currentEscalationLevel: 2 }), 'resolved');
      expect(getPlaybook('hot', 'cancellation').tipsHe).toContain(
        'הסלמה הייתה אפקטיבית מול חברה זו',
      );
    });
  });

  describe('getLearningInsights', () => {
    it('ranks companies and finds the most common scenario', () => {
      recordOutcome(request({ id: 'a', companyId: 'hot' }), 'rejected');
      recordOutcome(request({ id: 'b', companyId: 'bezeq', scenario: 'wrong_charge' }), 'resolved');
      recordOutcome(request({ id: 'c', companyId: 'bezeq', scenario: 'wrong_charge' }), 'resolved');

      const insights = getLearningInsights();
      expect(insights.totalCases).toBe(3);
      expect(insights.mostCommonScenario).toBe('wrong_charge');
      expect(insights.bestPerformingCompanies[0].id).toBe('bezeq');
      expect(insights.bestPerformingCompanies[0].successRate).toBe(1);
    });
  });

  describe('persistence', () => {
    it('keeps what it learned across reloads', () => {
      const web = fakeWebStorage();
      configureLearningStorage(createLocalStorage('k', web));
      recordOutcome(request(), 'resolved');

      // Simulate a page reload: a fresh engine reading the same storage.
      configureLearningStorage(createLocalStorage('k', web));
      expect(getLearningEntries()).toHaveLength(1);
      expect(getCompanyStats('hot').totalRequests).toBe(1);
    });

    it('ignores corrupt JSON instead of crashing', () => {
      configureLearningStorage(createLocalStorage('k', fakeWebStorage({ k: '{not json' })));
      expect(getLearningEntries()).toEqual([]);
    });

    it('drops malformed entries from an outdated payload', () => {
      const good = {
        requestId: 'x', companyId: 'hot', scenario: 'other', outcome: 'resolved',
        responseTimeDays: 1, escalationLevel: 0, effectiveChannel: 'email',
        effectiveArguments: [], timestamp: '2026-11-01T00:00:00Z',
      };
      const web = fakeWebStorage({
        k: JSON.stringify([good, { ...good, outcome: 'won' }, { companyId: 'hot' }, null]),
      });
      configureLearningStorage(createLocalStorage('k', web));
      expect(getLearningEntries()).toEqual([good]);
    });

    it('keeps working in memory when storage writes fail', () => {
      const throwing = {
        getItem: () => null,
        setItem: () => { throw new Error('QuotaExceededError'); },
      };
      configureLearningStorage(createLocalStorage('k', throwing));
      expect(() => recordOutcome(request(), 'resolved')).not.toThrow();
      expect(getLearningEntries()).toHaveLength(1);
    });
  });

  describe('isLearningEntry', () => {
    it('accepts legacy entries without a requestId', () => {
      expect(isLearningEntry({
        companyId: 'hot', scenario: 'other', outcome: 'pending',
        responseTimeDays: 0, escalationLevel: 0, effectiveChannel: 'webform',
        effectiveArguments: [], timestamp: 't',
      })).toBe(true);
    });
  });
});
