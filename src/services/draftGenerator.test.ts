import { describe, it, expect } from 'vitest';
import { generateDraft, getRecommendedChannel, getSlaInfo } from './draftGenerator';

describe('draftGenerator', () => {
  describe('generateDraft', () => {
    it('should generate cancellation draft for HOT', () => {
      const result = generateDraft({
        companyId: 'hot',
        scenario: 'cancellation',
        userDescription: 'רוצה לבטל את ההוט',
      });
      
      expect(result.contentHe).toContain('הוט');
      expect(result.contentHe).toContain('ביטול');
      expect(result.contentHe).toContain('חוק הגנת הצרכן');
    });

    it('should generate wrong charge draft with amount', () => {
      const result = generateDraft({
        companyId: 'cellcom',
        scenario: 'wrong_charge',
        userDescription: 'חייבו אותי פעמיים',
        amount: 150,
      });
      
      expect(result.contentHe).toContain('סלקום');
      expect(result.contentHe).toContain('חיוב שגוי');
      expect(result.contentHe).toContain('150');
    });

    it('should generate unresolved fault draft', () => {
      const result = generateDraft({
        companyId: 'bezeq',
        scenario: 'unresolved_fault',
        userDescription: 'האינטרנט לא עובד כבר שבוע',
      });
      
      expect(result.contentHe).toContain('בזק');
      expect(result.contentHe).toContain('תקלה');
      expect(result.contentHe).toContain('רגולטור');
    });

    it('should include customer details when provided', () => {
      const result = generateDraft({
        companyId: 'hot',
        scenario: 'cancellation',
        userDescription: 'ביטול מנוי',
        customerName: 'ישראל ישראלי',
        customerId: '12345',
      });
      
      expect(result.contentHe).toContain('ישראל ישראלי');
      expect(result.contentHe).toContain('12345');
    });

    it('should include disclaimer about not being legal advice', () => {
      const result = generateDraft({
        companyId: 'hot',
        scenario: 'cancellation',
        userDescription: 'ביטול',
      });
      
      expect(result.contentHe).toContain('אין לראות במכתב זה ייעוץ משפטי');
    });

    it('should include source URL for recommended channel', () => {
      const result = generateDraft({
        companyId: 'hot',
        scenario: 'cancellation',
        userDescription: 'ביטול',
      });
      
      expect(result.contentHe).toContain('מקור:');
    });

    it('should throw error for unknown company', () => {
      expect(() => generateDraft({
        companyId: 'unknown-company',
        scenario: 'cancellation',
        userDescription: 'test',
      })).toThrow('Company not found');
    });

    it('should return applicable rights', () => {
      const result = generateDraft({
        companyId: 'hot',
        scenario: 'cancellation',
        userDescription: 'ביטול',
      });
      
      expect(result.rights.length).toBeGreaterThan(0);
      expect(result.rights.some(r => r.applicableScenarios.includes('cancellation'))).toBe(true);
    });
  });

  describe('getRecommendedChannel', () => {
    it('should recommend fax for cancellation when available', () => {
      const channel = getRecommendedChannel('hot', 'cancellation');
      expect(channel).not.toBeNull();
    });

    it('should return null for unknown company', () => {
      const channel = getRecommendedChannel('unknown', 'cancellation');
      expect(channel).toBeNull();
    });

    it('should return a valid channel for any scenario', () => {
      const channel = getRecommendedChannel('cellcom', 'wrong_charge');
      expect(channel).not.toBeNull();
      expect(channel?.value).toBeDefined();
    });
  });

  describe('getSlaInfo', () => {
    it('should return SLA info for known company and scenario', () => {
      const sla = getSlaInfo('hot', 'cancellation');
      expect(sla).not.toBeNull();
      expect(sla?.maxResponseDays).toBeGreaterThan(0);
      expect(sla?.maxResolutionDays).toBeGreaterThan(0);
    });

    it('should return default SLA for unknown company scenario', () => {
      const sla = getSlaInfo('hot', 'other');
      expect(sla).not.toBeNull();
    });

    it('should return null for unknown company', () => {
      const sla = getSlaInfo('unknown', 'cancellation');
      expect(sla).toBeNull();
    });
  });
});
