import type { 
  Company, 
  ScenarioType, 
  ConsumerRight,
  ContactChannel 
} from '../types';
import { getCompanyById } from '../data/companies';
import { getRightsForScenario, getScenarioByType } from '../data/scenarios';

interface DraftContext {
  companyId: string;
  scenario: ScenarioType;
  userDescription: string;
  customerName?: string;
  customerId?: string;
  amount?: number;
  date?: string;
}

function getPreferredChannel(
  company: Company, 
  scenario: ScenarioType
): ContactChannel | null {
  if (scenario === 'cancellation') {
    const faxChannel = company.contactChannels.find(c => c.type === 'fax');
    if (faxChannel) return faxChannel;
    
    const webformChannel = company.contactChannels.find(c => c.type === 'webform');
    if (webformChannel) return webformChannel;
  }
  
  const emailChannel = company.contactChannels.find(c => c.type === 'email');
  if (emailChannel) return emailChannel;
  
  const webformChannel = company.contactChannels.find(c => c.type === 'webform');
  if (webformChannel) return webformChannel;
  
  return company.contactChannels[0] ?? null;
}

function formatRightsSection(rights: ConsumerRight[]): { en: string; he: string } {
  if (rights.length === 0) {
    return { en: '', he: '' };
  }
  
  const hebrewRights = rights
    .map(r => `• ${r.nameHe}: ${r.descriptionHe} (${r.lawReferenceHe})`)
    .join('\n');
    
  const englishRights = rights
    .map(r => `• ${r.name}: ${r.description} (${r.lawReference})`)
    .join('\n');
  
  return {
    en: `\n\nRelevant Consumer Rights:\n${englishRights}`,
    he: `\n\nזכויות צרכן רלוונטיות:\n${hebrewRights}`,
  };
}

function generateCancellationDraft(
  company: Company,
  context: DraftContext,
  rights: ConsumerRight[]
): { content: string; contentHe: string } {
  const rightsSection = formatRightsSection(rights);
  const channel = getPreferredChannel(company, 'cancellation');
  
  const contentHe = `לכבוד ${company.nameHe},

הנדון: בקשה לביטול שירות

אני פונה אליכם בבקשה לבטל את השירות שלי בחברתכם.

פרטי הבקשה:
${context.customerId ? `מספר לקוח/חשבון: ${context.customerId}` : '[נא להזין מספר לקוח]'}
${context.customerName ? `שם הלקוח: ${context.customerName}` : '[נא להזין שם מלא]'}

תיאור הבקשה:
${context.userDescription}

על פי חוק הגנת הצרכן, סעיף 13א, אני זכאי/ת לביטול השירות תוך 3 ימי עסקים מקבלת בקשה זו.
${rightsSection.he}

אני מבקש/ת אישור בכתב על קבלת בקשה זו ועל מועד סיום השירות.

בקשה זו נשלחת בשם הלקוח/ה ובהסכמתו/ה המלאה.
אין לראות במכתב זה ייעוץ משפטי.

בתודה מראש,
[שם הלקוח]
[פרטי התקשרות]

---
ערוץ מומלץ לשליחה: ${channel?.type === 'fax' ? `פקס: ${channel.value}` : channel?.value ?? 'לא זמין'}
מקור: ${channel?.sourceUrl ?? 'לא זמין'}`;

  const content = `To: ${company.name}

Subject: Service Cancellation Request

I am writing to request the cancellation of my service with your company.

Request Details:
${context.customerId ? `Customer/Account ID: ${context.customerId}` : '[Please enter customer ID]'}
${context.customerName ? `Customer Name: ${context.customerName}` : '[Please enter full name]'}

Request Description:
${context.userDescription}

According to the Consumer Protection Law, Section 13a, I am entitled to cancellation within 3 business days of this request.
${rightsSection.en}

I request written confirmation of this request and the service termination date.

This request is sent on behalf of and with the full consent of the customer.
This letter does not constitute legal advice.

Thank you,
[Customer Name]
[Contact Details]

---
Recommended channel: ${channel?.type === 'fax' ? `Fax: ${channel.value}` : channel?.value ?? 'Not available'}
Source: ${channel?.sourceUrl ?? 'Not available'}`;

  return { content, contentHe };
}

function generateWrongChargeDraft(
  company: Company,
  context: DraftContext,
  rights: ConsumerRight[]
): { content: string; contentHe: string } {
  const rightsSection = formatRightsSection(rights);
  const channel = getPreferredChannel(company, 'wrong_charge');
  
  const amountStr = context.amount ? `${context.amount} ש"ח` : '[נא לציין סכום]';
  const dateStr = context.date ?? '[נא לציין תאריך]';
  
  const contentHe = `לכבוד ${company.nameHe},

הנדון: בקשה להחזר בגין חיוב שגוי

אני פונה אליכם בעניין חיוב שגוי שבוצע בחשבוני.

פרטי החיוב השגוי:
${context.customerId ? `מספר לקוח/חשבון: ${context.customerId}` : '[נא להזין מספר לקוח]'}
${context.customerName ? `שם הלקוח: ${context.customerName}` : '[נא להזין שם מלא]'}
סכום החיוב השגוי: ${amountStr}
תאריך החיוב: ${dateStr}

תיאור הבעיה:
${context.userDescription}

אני דורש/ת החזר מלא של הסכום שנגבה בטעות, בתוספת הצמדה וריבית כחוק.
${rightsSection.he}

אבקש אישור בכתב על קבלת פנייה זו ועדכון על הטיפול בה.

בקשה זו נשלחת בשם הלקוח/ה ובהסכמתו/ה המלאה.
אין לראות במכתב זה ייעוץ משפטי.

בתודה,
[שם הלקוח]
[פרטי התקשרות]

---
ערוץ מומלץ לשליחה: ${channel?.value ?? 'לא זמין'}
מקור: ${channel?.sourceUrl ?? 'לא זמין'}`;

  const content = `To: ${company.name}

Subject: Refund Request for Incorrect Charge

I am writing regarding an incorrect charge made to my account.

Incorrect Charge Details:
${context.customerId ? `Customer/Account ID: ${context.customerId}` : '[Please enter customer ID]'}
${context.customerName ? `Customer Name: ${context.customerName}` : '[Please enter full name]'}
Incorrect charge amount: ${context.amount ? `${context.amount} NIS` : '[Please specify amount]'}
Charge date: ${dateStr}

Problem Description:
${context.userDescription}

I demand a full refund of the incorrectly charged amount, plus linkage and interest as required by law.
${rightsSection.en}

I request written confirmation of this inquiry and updates on its handling.

This request is sent on behalf of and with the full consent of the customer.
This letter does not constitute legal advice.

Thank you,
[Customer Name]
[Contact Details]

---
Recommended channel: ${channel?.value ?? 'Not available'}
Source: ${channel?.sourceUrl ?? 'Not available'}`;

  return { content, contentHe };
}

function generateUnresolvedFaultDraft(
  company: Company,
  context: DraftContext,
  rights: ConsumerRight[]
): { content: string; contentHe: string } {
  const rightsSection = formatRightsSection(rights);
  const channel = getPreferredChannel(company, 'unresolved_fault');
  
  const contentHe = `לכבוד ${company.nameHe},

הנדון: תקלה שלא טופלה - דרישה לפתרון מיידי

אני פונה אליכם בעניין תקלה מתמשכת שלא נפתרה למרות פניות קודמות.

פרטי הלקוח:
${context.customerId ? `מספר לקוח/חשבון: ${context.customerId}` : '[נא להזין מספר לקוח]'}
${context.customerName ? `שם הלקוח: ${context.customerName}` : '[נא להזין שם מלא]'}

תיאור התקלה:
${context.userDescription}

התקלה גורמת לי נזק ואי-נוחות מתמשכים. אני דורש/ת טיפול מיידי ופיצוי הולם.
${rightsSection.he}

במידה והתקלה לא תיפתר תוך הזמן הקבוע בחוק, אפנה לרגולטור הרלוונטי: ${company.regulator.nameHe}.

בקשה זו נשלחת בשם הלקוח/ה ובהסכמתו/ה המלאה.
אין לראות במכתב זה ייעוץ משפטי.

בתודה,
[שם הלקוח]
[פרטי התקשרות]

---
ערוץ מומלץ לשליחה: ${channel?.value ?? 'לא זמין'}
מקור: ${channel?.sourceUrl ?? 'לא זמין'}`;

  const content = `To: ${company.name}

Subject: Unresolved Fault - Demand for Immediate Resolution

I am writing regarding an ongoing fault that has not been resolved despite previous inquiries.

Customer Details:
${context.customerId ? `Customer/Account ID: ${context.customerId}` : '[Please enter customer ID]'}
${context.customerName ? `Customer Name: ${context.customerName}` : '[Please enter full name]'}

Fault Description:
${context.userDescription}

This fault is causing ongoing damage and inconvenience. I demand immediate resolution and appropriate compensation.
${rightsSection.en}

If the fault is not resolved within the legally mandated timeframe, I will escalate to the relevant regulator: ${company.regulator.name}.

This request is sent on behalf of and with the full consent of the customer.
This letter does not constitute legal advice.

Thank you,
[Customer Name]
[Contact Details]

---
Recommended channel: ${channel?.value ?? 'Not available'}
Source: ${channel?.sourceUrl ?? 'Not available'}`;

  return { content, contentHe };
}

function generateGenericDraft(
  company: Company,
  context: DraftContext,
  rights: ConsumerRight[]
): { content: string; contentHe: string } {
  const rightsSection = formatRightsSection(rights);
  const channel = getPreferredChannel(company, 'other');
  
  const contentHe = `לכבוד ${company.nameHe},

הנדון: פנייה בעניין שירות לקוחות

אני פונה אליכם בעניין הבא:

פרטי הלקוח:
${context.customerId ? `מספר לקוח/חשבון: ${context.customerId}` : '[נא להזין מספר לקוח]'}
${context.customerName ? `שם הלקוח: ${context.customerName}` : '[נא להזין שם מלא]'}

תיאור הפנייה:
${context.userDescription}
${rightsSection.he}

אבקש מענה בהקדם האפשרי.

בקשה זו נשלחת בשם הלקוח/ה ובהסכמתו/ה המלאה.
אין לראות במכתב זה ייעוץ משפטי.

בתודה,
[שם הלקוח]
[פרטי התקשרות]

---
ערוץ מומלץ לשליחה: ${channel?.value ?? 'לא זמין'}
מקור: ${channel?.sourceUrl ?? 'לא זמין'}`;

  const content = `To: ${company.name}

Subject: Customer Service Inquiry

I am writing regarding the following matter:

Customer Details:
${context.customerId ? `Customer/Account ID: ${context.customerId}` : '[Please enter customer ID]'}
${context.customerName ? `Customer Name: ${context.customerName}` : '[Please enter full name]'}

Inquiry Description:
${context.userDescription}
${rightsSection.en}

I request a response at your earliest convenience.

This request is sent on behalf of and with the full consent of the customer.
This letter does not constitute legal advice.

Thank you,
[Customer Name]
[Contact Details]

---
Recommended channel: ${channel?.value ?? 'Not available'}
Source: ${channel?.sourceUrl ?? 'Not available'}`;

  return { content, contentHe };
}

export function generateDraft(context: DraftContext): { 
  content: string; 
  contentHe: string;
  channel: ContactChannel | null;
  rights: ConsumerRight[];
} {
  const company = getCompanyById(context.companyId);
  if (!company) {
    throw new Error(`Company not found: ${context.companyId}`);
  }
  
  const rights = getRightsForScenario(context.scenario);
  const channel = getPreferredChannel(company, context.scenario);
  
  let draft: { content: string; contentHe: string };
  
  switch (context.scenario) {
    case 'cancellation':
      draft = generateCancellationDraft(company, context, rights);
      break;
    case 'wrong_charge':
      draft = generateWrongChargeDraft(company, context, rights);
      break;
    case 'unresolved_fault':
      draft = generateUnresolvedFaultDraft(company, context, rights);
      break;
    default:
      draft = generateGenericDraft(company, context, rights);
  }
  
  return {
    ...draft,
    channel,
    rights,
  };
}

export function getRecommendedChannel(
  companyId: string, 
  scenario: ScenarioType
): ContactChannel | null {
  const company = getCompanyById(companyId);
  if (!company) return null;
  return getPreferredChannel(company, scenario);
}

export function getSlaInfo(companyId: string, scenario: ScenarioType) {
  const company = getCompanyById(companyId);
  if (!company) return null;
  
  const companySla = company.slaInfo.find(s => s.scenario === scenario);
  if (companySla) return companySla;
  
  const scenarioInfo = getScenarioByType(scenario);
  if (scenarioInfo) {
    return {
      scenario,
      maxResponseDays: scenarioInfo.defaultSlaResponseDays,
      maxResolutionDays: scenarioInfo.defaultSlaResolutionDays,
      sourceUrl: '',
      verified: false,
    };
  }
  
  return null;
}
