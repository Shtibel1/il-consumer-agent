import { describe, it, expect } from 'vitest';
import { 
  canTransition, 
  transitionRequest, 
  getAvailableTransitions,
  getStatusDisplayInfo,
  addReplyToRequest,
  isSlaBreach
} from './stateMachine';
import type { Request } from '../types';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'test-id',
    companyId: 'hot',
    scenario: 'cancellation',
    userDescription: 'Test request',
    draftContent: 'Draft content',
    draftContentHe: 'תוכן טיוטה',
    status: 'draft',
    currentEscalationLevel: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
    statusHistory: [{ status: 'draft', timestamp: new Date().toISOString() }],
    tags: [],
    costEstimate: 0.5,
    ...overrides,
  };
}

describe('stateMachine', () => {
  describe('canTransition', () => {
    it('should allow draft to sent transition', () => {
      expect(canTransition('draft', 'sent')).toBe(true);
    });

    it('should allow sent to awaiting_reply transition', () => {
      expect(canTransition('sent', 'awaiting_reply')).toBe(true);
    });

    it('should allow awaiting_reply to replied transition', () => {
      expect(canTransition('awaiting_reply', 'replied')).toBe(true);
    });

    it('should allow replied to resolved transition', () => {
      expect(canTransition('replied', 'resolved')).toBe(true);
    });

    it('should allow resolved to verified transition', () => {
      expect(canTransition('resolved', 'verified')).toBe(true);
    });

    it('should not allow draft to resolved transition', () => {
      expect(canTransition('draft', 'resolved')).toBe(false);
    });

    it('should not allow closed to any transition', () => {
      expect(canTransition('closed', 'draft')).toBe(false);
      expect(canTransition('closed', 'sent')).toBe(false);
    });
  });

  describe('transitionRequest', () => {
    it('should transition from draft to sent', () => {
      const request = createMockRequest({ status: 'draft' });
      const updated = transitionRequest(request, 'sent');
      
      expect(updated.status).toBe('sent');
      expect(updated.sentAt).toBeDefined();
      expect(updated.statusHistory.length).toBe(2);
    });

    it('should set SLA deadline when sent', () => {
      const request = createMockRequest({ status: 'draft' });
      const updated = transitionRequest(request, 'sent');
      
      expect(updated.slaDeadline).toBeDefined();
    });

    it('should increment escalation level when escalated', () => {
      const request = createMockRequest({ status: 'awaiting_reply', currentEscalationLevel: 0 });
      const updated = transitionRequest(request, 'escalated');
      
      expect(updated.currentEscalationLevel).toBe(1);
    });

    it('should throw error for invalid transition', () => {
      const request = createMockRequest({ status: 'draft' });
      
      expect(() => transitionRequest(request, 'resolved')).toThrow();
    });

    it('should add notes to status history', () => {
      const request = createMockRequest({ status: 'draft' });
      const updated = transitionRequest(request, 'sent', 'Test notes');
      
      expect(updated.statusHistory[1].notes).toBe('Test notes');
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return correct transitions for draft', () => {
      const transitions = getAvailableTransitions('draft');
      expect(transitions).toHaveLength(1);
      expect(transitions[0].to).toBe('sent');
    });

    it('should return multiple transitions for replied', () => {
      const transitions = getAvailableTransitions('replied');
      expect(transitions.length).toBeGreaterThan(1);
      expect(transitions.map(t => t.to)).toContain('resolved');
      expect(transitions.map(t => t.to)).toContain('escalated');
    });

    it('should return empty for closed', () => {
      const transitions = getAvailableTransitions('closed');
      expect(transitions).toHaveLength(0);
    });
  });

  describe('getStatusDisplayInfo', () => {
    it('should return correct info for draft', () => {
      const info = getStatusDisplayInfo('draft');
      expect(info.label).toBe('Draft');
      expect(info.labelHe).toBe('טיוטה');
      expect(info.color).toBe('gray');
    });

    it('should return correct info for resolved', () => {
      const info = getStatusDisplayInfo('resolved');
      expect(info.label).toBe('Resolved');
      expect(info.labelHe).toBe('נפתר');
      expect(info.color).toBe('green');
    });
  });

  describe('addReplyToRequest', () => {
    it('should add reply and calculate response time', () => {
      const sentDate = new Date();
      sentDate.setDate(sentDate.getDate() - 3);
      
      const request = createMockRequest({ 
        status: 'awaiting_reply',
        sentAt: sentDate.toISOString(),
      });
      
      const updated = addReplyToRequest(request, {
        content: 'Test reply',
        receivedAt: new Date().toISOString(),
        channel: 'email',
        outcome: 'resolved',
        sentiment: 'positive',
      });
      
      expect(updated.replies).toHaveLength(1);
      expect(updated.replies[0].responseTimeDays).toBeGreaterThanOrEqual(3);
      expect(updated.status).toBe('replied');
    });
  });

  describe('isSlaBreach', () => {
    it('should return false for resolved requests', () => {
      const request = createMockRequest({ 
        status: 'resolved',
        slaDeadline: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(isSlaBreach(request)).toBe(false);
    });

    it('should return false for requests without deadline', () => {
      const request = createMockRequest({ status: 'awaiting_reply' });
      expect(isSlaBreach(request)).toBe(false);
    });

    it('should return true for overdue requests', () => {
      const request = createMockRequest({ 
        status: 'awaiting_reply',
        slaDeadline: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(isSlaBreach(request)).toBe(true);
    });

    it('should return false for requests within SLA', () => {
      const request = createMockRequest({ 
        status: 'awaiting_reply',
        slaDeadline: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(isSlaBreach(request)).toBe(false);
    });
  });
});
