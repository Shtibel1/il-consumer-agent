import type { Company } from '../../types';

import cellcomData from './cellcom.json';
import partnerData from './partner.json';
import hotData from './hot.json';
import yesData from './yes.json';
import bezeqData from './bezeq.json';
import pelephoneData from './pelephone.json';
import iecData from './iec.json';
import hapoalimData from './hapoalim.json';
import leumiData from './leumi.json';
import harelData from './harel.json';
import migdalData from './migdal.json';

export const companies: Company[] = [
  cellcomData as unknown as Company,
  partnerData as unknown as Company,
  hotData as unknown as Company,
  yesData as unknown as Company,
  bezeqData as unknown as Company,
  pelephoneData as unknown as Company,
  iecData as unknown as Company,
  hapoalimData as unknown as Company,
  leumiData as unknown as Company,
  harelData as unknown as Company,
  migdalData as unknown as Company,
];

export function getCompanyById(id: string): Company | undefined {
  return companies.find(c => c.id === id);
}

export function getCompaniesByIndustry(industry: Company['industry']): Company[] {
  return companies.filter(c => c.industry === industry);
}

export function searchCompanies(query: string): Company[] {
  const lowerQuery = query.toLowerCase();
  return companies.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.nameHe.includes(query) ||
    c.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
    c.keywordsHe.some(k => k.includes(query))
  );
}

export function getAllCompanyIds(): string[] {
  return companies.map(c => c.id);
}
