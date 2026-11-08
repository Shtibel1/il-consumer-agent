import type { 
  Request, 
  RequestStatus, 
  StatusTransition,
  Reply
} from '../types';
import { addDays, isAfter, parseISO, formatISO } from 'date-fns';
import { getSlaInfo } from './draftGenerator';

export const statusTransitions: StatusTransition[] = [
  { from: 'draft', to: 'sent', action: 'Send Request', actionHe: 'שליחת בקשה' },
  { from: 'sent', to: 'awaiting_reply', action: 'Mark Awaiting Reply', actionHe: 'ממתין לתגובה' },
  { from: 'awaiting_reply', to: 'replied', action: 'Reply Received', actionHe: 'התקבלה תגובה' },
  { from: 'replied', to: 'resolved', action: 'Mark Resolved', actionHe: 'סמן כנפתר' },
  { from: 'replied', to: 'escalated', action: 'Escalate', actionHe: 'הסלמה' },
  { from: 'awaiting_reply', to: 'escalated', action: 'Escalate (SLA Breach)', actionHe: 'הסלמה (הפרת SLA)' },
  { from: 'escalated', to: 'awaiting_reply', action: 'Escalation Sent', actionHe: 'הסלמה נשלחה' },
  { from: 'resolved', to: 'verified', action: 'Verify Resolution', actionHe: 'אימות הפתרון' },
  { from: 'verified', to: 'closed', action: 'Close Case', actionHe: 'סגירת תיק' },
  { from: 'resolved', to: 'escalated', action: 'Resolution Failed', actionHe: 'הפתרון נכשל' },
  { from: 'verified', to: 'escalated', action: 'Verification Failed', actionHe: 'האימות נכשל' },
];

export function getAvailableTransitions(currentStatus: RequestStatus): StatusTransition[] {
  return statusTransitions.filter(t => t.from === currentStatus);
}

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return statusTransitions.some(t => t.from === from && t.to === to);
}

export function transitionRequest(
  request: Request, 
  newStatus: RequestStatus,
  notes?: string
): Request {
  if (!canTransition(request.status, newStatus)) {
    throw new Error(
      `Invalid transition from ${request.status} to ${newStatus}`
    );
  }
  
  const now = formatISO(new Date());
  const updatedRequest: Request = {
    ...request,
    status: newStatus,
    updatedAt: now,
    statusHistory: [
      ...request.statusHistory,
      { status: newStatus, timestamp: now, notes },
    ],
  };
  
  if (newStatus === 'sent' && !request.sentAt) {
    updatedRequest.sentAt = now;
    
    const sla = getSlaInfo(request.companyId, request.scenario);
    if (sla) {
      updatedRequest.slaDeadline = formatISO(
        addDays(new Date(), sla.maxResponseDays)
      );
    }
  }
  
  if (newStatus === 'escalated') {
    updatedRequest.currentEscalationLevel = request.currentEscalationLevel + 1;
  }
  
  return updatedRequest;
}

export function addReplyToRequest(
  request: Request,
  reply: Omit<Reply, 'id' | 'responseTimeDays'>
): Request {
  const sentAt = request.sentAt ? parseISO(request.sentAt) : new Date();
  const receivedAt = parseISO(reply.receivedAt);
  const responseTimeDays = Math.ceil(
    (receivedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const fullReply: Reply = {
    ...reply,
    id: crypto.randomUUID(),
    responseTimeDays,
  };
  
  return {
    ...request,
    replies: [...request.replies, fullReply],
    status: 'replied',
    updatedAt: formatISO(new Date()),
    statusHistory: [
      ...request.statusHistory,
      { 
        status: 'replied', 
        timestamp: formatISO(new Date()),
        notes: `Reply received via ${reply.channel}`,
      },
    ],
  };
}

export function isSlaBreach(request: Request): boolean {
  if (!request.slaDeadline) return false;
  if (request.status === 'resolved' || 
      request.status === 'verified' || 
      request.status === 'closed') {
    return false;
  }
  
  return isAfter(new Date(), parseISO(request.slaDeadline));
}

export function getSuggestedEscalation(request: Request): {
  reason: string;
  reasonHe: string;
  suggestedAction: string;
  suggestedActionHe: string;
} | null {
  if (request.status === 'resolved' || 
      request.status === 'verified' || 
      request.status === 'closed') {
    return null;
  }
  
  if (isSlaBreach(request)) {
    return {
      reason: 'SLA deadline has passed without resolution',
      reasonHe: 'עבר מועד ה-SLA ללא פתרון',
      suggestedAction: `Escalate to level ${request.currentEscalationLevel + 1}`,
      suggestedActionHe: `הסלמה לרמה ${request.currentEscalationLevel + 1}`,
    };
  }
  
  const lastReply = request.replies[request.replies.length - 1];
  if (lastReply?.outcome === 'rejected') {
    return {
      reason: 'Request was rejected by the company',
      reasonHe: 'הבקשה נדחתה על ידי החברה',
      suggestedAction: 'Escalate to next level or file regulatory complaint',
      suggestedActionHe: 'הסלמה לרמה הבאה או הגשת תלונה לרגולטור',
    };
  }
  
  return null;
}

export function calculateCostEstimate(request: Request): number {
  let cost = 0.5;
  
  cost += request.replies.length * 0.1;
  
  cost += request.currentEscalationLevel * 0.25;
  
  if (request.status === 'resolved' || request.status === 'verified') {
    cost += 0.1;
  }
  
  return Math.round(cost * 100) / 100;
}

export function getStatusDisplayInfo(status: RequestStatus): {
  label: string;
  labelHe: string;
  color: string;
  icon: string;
} {
  const statusInfo: Record<RequestStatus, { 
    label: string; 
    labelHe: string; 
    color: string;
    icon: string;
  }> = {
    draft: { 
      label: 'Draft', 
      labelHe: 'טיוטה', 
      color: 'gray',
      icon: '📝',
    },
    sent: { 
      label: 'Sent', 
      labelHe: 'נשלח', 
      color: 'blue',
      icon: '📤',
    },
    awaiting_reply: { 
      label: 'Awaiting Reply', 
      labelHe: 'ממתין לתגובה', 
      color: 'yellow',
      icon: '⏳',
    },
    replied: { 
      label: 'Replied', 
      labelHe: 'התקבלה תגובה', 
      color: 'purple',
      icon: '💬',
    },
    escalated: { 
      label: 'Escalated', 
      labelHe: 'הועבר להסלמה', 
      color: 'orange',
      icon: '⬆️',
    },
    resolved: { 
      label: 'Resolved', 
      labelHe: 'נפתר', 
      color: 'green',
      icon: '✅',
    },
    verified: { 
      label: 'Verified', 
      labelHe: 'אומת', 
      color: 'emerald',
      icon: '✓✓',
    },
    closed: { 
      label: 'Closed', 
      labelHe: 'סגור', 
      color: 'slate',
      icon: '🔒',
    },
  };
  
  return statusInfo[status];
}
