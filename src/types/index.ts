export interface ContactChannel {
  type: 'email' | 'webform' | 'whatsapp' | 'chat' | 'phone' | 'fax' | 'app';
  value: string;
  description?: string;
  sourceUrl: string;
  verified: boolean;
  notes?: string;
}

export interface EscalationStep {
  level: number;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  channels: ContactChannel[];
  typicalResponseDays: number;
  sourceUrl: string;
  verified: boolean;
}

export interface ConsumerRight {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  lawReference: string;
  lawReferenceHe: string;
  sourceUrl: string;
  verified: boolean;
  applicableScenarios: ScenarioType[];
}

export interface SlaInfo {
  scenario: ScenarioType;
  maxResponseDays: number;
  maxResolutionDays: number;
  sourceUrl: string;
  verified: boolean;
}

export interface Company {
  id: string;
  name: string;
  nameHe: string;
  industry: 'telecom' | 'utilities' | 'banking' | 'insurance' | 'internet' | 'tv';
  logo?: string;
  website: string;
  contactChannels: ContactChannel[];
  escalationLadder: EscalationStep[];
  slaInfo: SlaInfo[];
  consumerRights: ConsumerRight[];
  regulator: {
    name: string;
    nameHe: string;
    website: string;
    complaintUrl: string;
  };
  keywords: string[];
  keywordsHe: string[];
  stats: CompanyStats;
  lastUpdated: string;
}

export interface CompanyStats {
  totalRequests: number;
  avgResponseDays: number;
  successRate: number;
  escalationRate: number;
  byScenario: Partial<Record<ScenarioType, ScenarioStats>>;
}

export interface ScenarioStats {
  totalRequests: number;
  avgResponseDays: number;
  successRate: number;
  commonResolutions: string[];
}

export type ScenarioType = 'cancellation' | 'wrong_charge' | 'unresolved_fault' | 'other';

export interface ScenarioInfo {
  type: ScenarioType;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  keywords: string[];
  keywordsHe: string[];
  defaultSlaResponseDays: number;
  defaultSlaResolutionDays: number;
}

export type RequestStatus = 
  | 'draft'
  | 'sent'
  | 'awaiting_reply'
  | 'replied'
  | 'escalated'
  | 'resolved'
  | 'verified'
  | 'closed';

export interface StatusTransition {
  from: RequestStatus;
  to: RequestStatus;
  action: string;
  actionHe: string;
}

export interface Request {
  id: string;
  companyId: string;
  scenario: ScenarioType;
  userDescription: string;
  draftContent: string;
  draftContentHe: string;
  status: RequestStatus;
  currentEscalationLevel: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  slaDeadline?: string;
  replies: Reply[];
  statusHistory: StatusHistoryEntry[];
  tags: string[];
  costEstimate: number;
}

export interface Reply {
  id: string;
  content: string;
  receivedAt: string;
  channel: ContactChannel['type'];
  outcome?: ReplyOutcome;
  sentiment?: 'positive' | 'neutral' | 'negative';
  responseTimeDays: number;
}

export type ReplyOutcome = 
  | 'resolved'
  | 'partial_resolution'
  | 'rejected'
  | 'needs_more_info'
  | 'escalated_by_company'
  | 'pending';

export interface StatusHistoryEntry {
  status: RequestStatus;
  timestamp: string;
  notes?: string;
}

export interface ClassificationResult {
  companyId: string | null;
  companyConfidence: number;
  scenario: ScenarioType;
  scenarioConfidence: number;
  extractedDetails: {
    amount?: number;
    date?: string;
    serviceType?: string;
  };
}

export interface DraftTemplate {
  scenario: ScenarioType;
  template: string;
  templateHe: string;
  requiredFields: string[];
}

export interface LearningEntry {
  /** Request this outcome belongs to; one entry per request (latest outcome wins). */
  requestId?: string;
  companyId: string;
  scenario: ScenarioType;
  outcome: ReplyOutcome;
  responseTimeDays: number;
  escalationLevel: number;
  effectiveChannel: ContactChannel['type'];
  effectiveArguments: string[];
  timestamp: string;
}

export interface DailyDigest {
  date: string;
  pendingRequests: Request[];
  overdueRequests: Request[];
  suggestedEscalations: {
    request: Request;
    reason: string;
    reasonHe: string;
    suggestedAction: string;
    suggestedActionHe: string;
  }[];
  stats: {
    totalActive: number;
    newReplies: number;
    resolvedToday: number;
    averageCostPerCase: number;
  };
}
