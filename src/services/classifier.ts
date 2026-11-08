import type { ClassificationResult, ScenarioType } from '../types';
import { companies } from '../data/companies';
import { scenarios } from '../data/scenarios';

interface KeywordMatch {
  id: string;
  score: number;
}

function normalizeHebrew(text: string): string {
  return text
    .replace(/[^\u0590-\u05FF\w\s]/g, ' ')
    .toLowerCase()
    .trim();
}

function calculateKeywordScore(text: string, keywords: string[]): number {
  const normalizedText = normalizeHebrew(text);
  let score = 0;
  
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeHebrew(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      score += normalizedKeyword.length;
      if (normalizedText.startsWith(normalizedKeyword) || 
          normalizedText.endsWith(normalizedKeyword)) {
        score += 2;
      }
    }
  }
  
  return score;
}

export function classifyCompany(text: string): KeywordMatch | null {
  const matches: KeywordMatch[] = [];
  
  for (const company of companies) {
    const allKeywords = [
      company.name,
      company.nameHe,
      ...company.keywords,
      ...company.keywordsHe,
    ];
    
    const score = calculateKeywordScore(text, allKeywords);
    if (score > 0) {
      matches.push({ id: company.id, score });
    }
  }
  
  if (matches.length === 0) return null;
  
  matches.sort((a, b) => b.score - a.score);
  return matches[0];
}

export function classifyScenario(text: string): { type: ScenarioType; score: number } {
  const matches: { type: ScenarioType; score: number }[] = [];
  
  for (const scenario of scenarios) {
    const allKeywords = [
      ...scenario.keywords,
      ...scenario.keywordsHe,
    ];
    
    const score = calculateKeywordScore(text, allKeywords);
    matches.push({ type: scenario.type, score });
  }
  
  matches.sort((a, b) => b.score - a.score);
  
  if (matches[0].score === 0) {
    return { type: 'other', score: 0 };
  }
  
  return matches[0];
}

export function extractDetails(text: string): ClassificationResult['extractedDetails'] {
  const details: ClassificationResult['extractedDetails'] = {};
  
  const amountPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:ש"?ח|שקל|₪|NIS)/gi,
    /(?:סכום|חיוב|גבו|חייבו)\s*(?:של)?\s*(\d+(?:[.,]\d+)?)/gi,
  ];
  
  for (const pattern of amountPatterns) {
    const match = pattern.exec(text);
    if (match) {
      details.amount = parseFloat(match[1].replace(',', '.'));
      break;
    }
  }
  
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g,
    /(?:בתאריך|מתאריך|ב-?)\s*(\d{1,2})[\/\-.](\d{1,2})/g,
  ];
  
  for (const pattern of datePatterns) {
    const match = pattern.exec(text);
    if (match) {
      details.date = match[0];
      break;
    }
  }
  
  return details;
}

export function classify(text: string): ClassificationResult {
  const companyMatch = classifyCompany(text);
  const scenarioMatch = classifyScenario(text);
  const extractedDetails = extractDetails(text);
  
  const maxCompanyScore = Math.max(
    ...companies.flatMap(c => [c.name.length, c.nameHe.length])
  );
  const maxScenarioScore = Math.max(
    ...scenarios.flatMap(s => [...s.keywords, ...s.keywordsHe].map(k => k.length))
  );
  
  return {
    companyId: companyMatch?.id ?? null,
    companyConfidence: companyMatch 
      ? Math.min(companyMatch.score / maxCompanyScore, 1) 
      : 0,
    scenario: scenarioMatch.type,
    scenarioConfidence: scenarioMatch.score > 0 
      ? Math.min(scenarioMatch.score / maxScenarioScore, 1) 
      : 0.1,
    extractedDetails,
  };
}

export async function classifyWithLLM(
  text: string,
  _apiKey?: string
): Promise<ClassificationResult> {
  return classify(text);
}
