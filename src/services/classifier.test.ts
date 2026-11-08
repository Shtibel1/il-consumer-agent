import { describe, it, expect } from 'vitest';
import { classify, classifyCompany, classifyScenario, extractDetails } from './classifier';

describe('classifier', () => {
  describe('classifyCompany', () => {
    it('should identify HOT from Hebrew text', () => {
      const result = classifyCompany('רוצה לבטל את ההוט');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('hot');
    });

    it('should identify Cellcom from Hebrew text', () => {
      const result = classifyCompany('סלקום חייבו אותי פעמיים');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('cellcom');
    });

    it('should identify Bezeq from Hebrew text', () => {
      const result = classifyCompany('האינטרנט של בזק לא עובד');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('bezeq');
    });

    it('should identify Partner from Hebrew text', () => {
      const result = classifyCompany('יש לי בעיה עם פרטנר');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('partner');
    });

    it('should return null for unrecognized company', () => {
      const result = classifyCompany('משהו לא קשור לשום חברה');
      expect(result).toBeNull();
    });

    it('should identify bank Hapoalim', () => {
      const result = classifyCompany('בנק הפועלים גבו ממני עמלה');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('hapoalim');
    });
  });

  describe('classifyScenario', () => {
    it('should identify cancellation scenario', () => {
      const result = classifyScenario('רוצה לבטל את המנוי');
      expect(result.type).toBe('cancellation');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should identify wrong charge scenario', () => {
      const result = classifyScenario('חייבו אותי פעמיים על אותו חשבון');
      expect(result.type).toBe('wrong_charge');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should identify unresolved fault scenario', () => {
      const result = classifyScenario('יש לי תקלה שלא מטפלים בה');
      expect(result.type).toBe('unresolved_fault');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return other for generic text', () => {
      const result = classifyScenario('שאלה כללית');
      expect(result.type).toBe('other');
    });
  });

  describe('extractDetails', () => {
    it('should extract amount in NIS', () => {
      const result = extractDetails('חייבו אותי 150 שח');
      expect(result.amount).toBe(150);
    });

    it('should extract amount with shekel symbol', () => {
      const result = extractDetails('הסכום היה 250.50 ש"ח');
      expect(result.amount).toBe(250.50);
    });

    it('should extract date', () => {
      const result = extractDetails('בתאריך 15/03/2024 חייבו אותי');
      expect(result.date).toBe('15/03/2024');
    });
  });

  describe('classify (full)', () => {
    it('should classify complete HOT cancellation request', () => {
      const result = classify('רוצה לבטל את ההוט');
      expect(result.companyId).toBe('hot');
      expect(result.scenario).toBe('cancellation');
      expect(result.companyConfidence).toBeGreaterThan(0);
      expect(result.scenarioConfidence).toBeGreaterThan(0);
    });

    it('should classify complete Cellcom wrong charge request', () => {
      const result = classify('סלקום חייבו אותי פעמיים 200 שח');
      expect(result.companyId).toBe('cellcom');
      expect(result.scenario).toBe('wrong_charge');
      expect(result.extractedDetails.amount).toBe(200);
    });

    it('should handle text with no clear company', () => {
      const result = classify('יש לי בעיה עם השירות');
      expect(result.companyId).toBeNull();
      expect(result.companyConfidence).toBe(0);
    });
  });
});
