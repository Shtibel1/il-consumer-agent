import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Request, Reply, ReplyOutcome, RequestStatus } from '../types';
import { 
  transitionRequest, 
  addReplyToRequest, 
  calculateCostEstimate 
} from '../services/stateMachine';
import { recordOutcome, updateCompanyStatsFromRequest } from '../services/learning';
import { formatISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface RequestStore {
  requests: Request[];
  
  createRequest: (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'replies' | 'costEstimate'>) => Request;
  updateRequest: (id: string, updates: Partial<Request>) => void;
  deleteRequest: (id: string) => void;
  
  transitionStatus: (id: string, newStatus: RequestStatus, notes?: string) => void;
  addReply: (id: string, reply: Omit<Reply, 'id' | 'responseTimeDays'>) => void;
  recordRequestOutcome: (id: string, outcome: ReplyOutcome) => void;
  
  getRequestById: (id: string) => Request | undefined;
  getRequestsByStatus: (status: RequestStatus) => Request[];
  getActiveRequests: () => Request[];
  getPendingRequests: () => Request[];
}

export const useRequestStore = create<RequestStore>()(
  persist(
    (set, get) => ({
      requests: [],
      
      createRequest: (requestData) => {
        const now = formatISO(new Date());
        const newRequest: Request = {
          ...requestData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          statusHistory: [{ status: requestData.status, timestamp: now }],
          replies: [],
          costEstimate: 0.5,
        };
        
        set(state => ({
          requests: [...state.requests, newRequest],
        }));
        
        return newRequest;
      },
      
      updateRequest: (id, updates) => {
        set(state => ({
          requests: state.requests.map(r => 
            r.id === id 
              ? { ...r, ...updates, updatedAt: formatISO(new Date()) }
              : r
          ),
        }));
      },
      
      deleteRequest: (id) => {
        set(state => ({
          requests: state.requests.filter(r => r.id !== id),
        }));
      },
      
      transitionStatus: (id, newStatus, notes) => {
        const request = get().requests.find(r => r.id === id);
        if (!request) return;
        
        try {
          const updatedRequest = transitionRequest(request, newStatus, notes);
          updatedRequest.costEstimate = calculateCostEstimate(updatedRequest);
          
          set(state => ({
            requests: state.requests.map(r => 
              r.id === id ? updatedRequest : r
            ),
          }));
        } catch (error) {
          console.error('Transition failed:', error);
        }
      },
      
      addReply: (id, reply) => {
        const request = get().requests.find(r => r.id === id);
        if (!request) return;
        
        const updatedRequest = addReplyToRequest(request, reply);
        updatedRequest.costEstimate = calculateCostEstimate(updatedRequest);
        
        set(state => ({
          requests: state.requests.map(r => 
            r.id === id ? updatedRequest : r
          ),
        }));
      },
      
      recordRequestOutcome: (id, outcome) => {
        const request = get().requests.find(r => r.id === id);
        if (!request) return;
        
        recordOutcome(request, outcome);
        updateCompanyStatsFromRequest(request);
      },
      
      getRequestById: (id) => {
        return get().requests.find(r => r.id === id);
      },
      
      getRequestsByStatus: (status) => {
        return get().requests.filter(r => r.status === status);
      },
      
      getActiveRequests: () => {
        const closedStatuses: RequestStatus[] = ['closed', 'verified'];
        return get().requests.filter(r => !closedStatuses.includes(r.status));
      },
      
      getPendingRequests: () => {
        const pendingStatuses: RequestStatus[] = ['sent', 'awaiting_reply', 'escalated'];
        return get().requests.filter(r => pendingStatuses.includes(r.status));
      },
    }),
    {
      name: 'il-consumer-agent-requests',
    }
  )
);
