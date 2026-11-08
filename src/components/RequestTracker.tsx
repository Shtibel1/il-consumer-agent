import { useState } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { getCompanyById } from '../data/companies';
import { 
  getStatusDisplayInfo, 
  getAvailableTransitions, 
  isSlaBreach,
  getSuggestedEscalation 
} from '../services/stateMachine';
import { scenarios } from '../data/scenarios';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Request, RequestStatus, ReplyOutcome } from '../types';
import styles from './RequestTracker.module.css';

export function RequestTracker() {
  const { requests, transitionStatus, addReply, recordRequestOutcome, deleteRequest } = useRequestStore();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyOutcome, setReplyOutcome] = useState<ReplyOutcome>('pending');
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  
  const filteredRequests = requests.filter(r => {
    if (filter === 'active') {
      return !['resolved', 'verified', 'closed'].includes(r.status);
    }
    if (filter === 'resolved') {
      return ['resolved', 'verified', 'closed'].includes(r.status);
    }
    return true;
  }).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  const handleTransition = (requestId: string, newStatus: RequestStatus) => {
    const notes = prompt('הערות (אופציונלי):');
    transitionStatus(requestId, newStatus, notes || undefined);
  };
  
  const handleAddReply = (requestId: string) => {
    if (!replyContent.trim()) return;
    
    addReply(requestId, {
      content: replyContent,
      receivedAt: new Date().toISOString(),
      channel: 'email',
      outcome: replyOutcome,
      sentiment: replyOutcome === 'resolved' ? 'positive' : 
                 replyOutcome === 'rejected' ? 'negative' : 'neutral',
    });
    
    recordRequestOutcome(requestId, replyOutcome);
    setReplyContent('');
    setReplyOutcome('pending');
  };
  
  const handleDelete = (requestId: string) => {
    if (confirm('האם למחוק את הבקשה?')) {
      deleteRequest(requestId);
      setSelectedRequest(null);
    }
  };
  
  const selected = selectedRequest 
    ? requests.find(r => r.id === selectedRequest) 
    : null;
  
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            הכל ({requests.length})
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            פעיל
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'resolved' ? styles.active : ''}`}
            onClick={() => setFilter('resolved')}
          >
            נפתר
          </button>
        </div>
        
        <div className={styles.requestList}>
          {filteredRequests.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>אין בקשות להצגה</p>
              <p className={styles.emptyHint}>צור פנייה חדשה כדי להתחיל</p>
            </div>
          ) : (
            filteredRequests.map(request => {
              const company = getCompanyById(request.companyId);
              const statusInfo = getStatusDisplayInfo(request.status);
              const breach = isSlaBreach(request);
              
              return (
                <button
                  key={request.id}
                  className={`${styles.requestItem} ${selectedRequest === request.id ? styles.selected : ''} ${breach ? styles.overdue : ''}`}
                  onClick={() => setSelectedRequest(request.id)}
                >
                  <div className={styles.requestHeader}>
                    <span className={styles.companyName}>{company?.nameHe || request.companyId}</span>
                    <span className={`badge badge-${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.labelHe}
                    </span>
                  </div>
                  <p className={styles.requestPreview}>
                    {request.userDescription.slice(0, 60)}...
                  </p>
                  <div className={styles.requestMeta}>
                    <span>{formatDistanceToNow(parseISO(request.updatedAt), { locale: he, addSuffix: true })}</span>
                    {breach && <span className={styles.breachBadge}>⚠️ SLA</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      
      <div className={styles.detail}>
        {selected ? (
          <RequestDetail 
            request={selected}
            onTransition={handleTransition}
            onAddReply={handleAddReply}
            onDelete={handleDelete}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            replyOutcome={replyOutcome}
            setReplyOutcome={setReplyOutcome}
          />
        ) : (
          <div className={styles.noSelection}>
            <span className={styles.noSelectionIcon}>👈</span>
            <p>בחר בקשה מהרשימה לצפייה בפרטים</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RequestDetailProps {
  request: Request;
  onTransition: (id: string, status: RequestStatus) => void;
  onAddReply: (id: string) => void;
  onDelete: (id: string) => void;
  replyContent: string;
  setReplyContent: (v: string) => void;
  replyOutcome: ReplyOutcome;
  setReplyOutcome: (v: ReplyOutcome) => void;
}

function RequestDetail({ 
  request, 
  onTransition, 
  onAddReply, 
  onDelete,
  replyContent,
  setReplyContent,
  replyOutcome,
  setReplyOutcome
}: RequestDetailProps) {
  const company = getCompanyById(request.companyId);
  const scenario = scenarios.find(s => s.type === request.scenario);
  const statusInfo = getStatusDisplayInfo(request.status);
  const transitions = getAvailableTransitions(request.status);
  const escalation = getSuggestedEscalation(request);
  const breach = isSlaBreach(request);
  
  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <div>
          <h2>{company?.nameHe}</h2>
          <div className={styles.detailMeta}>
            <span className={`badge badge-${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.labelHe}
            </span>
            <span className="badge badge-blue">{scenario?.nameHe}</span>
            {request.currentEscalationLevel > 0 && (
              <span className="badge badge-orange">
                רמת הסלמה {request.currentEscalationLevel}
              </span>
            )}
          </div>
        </div>
        <button className={styles.deleteBtn} onClick={() => onDelete(request.id)}>
          🗑️
        </button>
      </div>
      
      {breach && (
        <div className={styles.breachAlert}>
          <span>⚠️</span>
          <span>עבר מועד ה-SLA! מומלץ להסלים את הפנייה.</span>
        </div>
      )}
      
      {escalation && (
        <div className={styles.escalationSuggestion}>
          <strong>המלצה:</strong> {escalation.reasonHe}
          <br />
          <em>{escalation.suggestedActionHe}</em>
        </div>
      )}
      
      <div className={styles.section}>
        <h3>תיאור הבקשה</h3>
        <p>{request.userDescription}</p>
      </div>
      
      <div className={styles.section}>
        <h3>טיוטת הפנייה</h3>
        <pre className={styles.draftPreview}>{request.draftContentHe}</pre>
      </div>
      
      <div className={styles.section}>
        <h3>היסטוריית סטטוס</h3>
        <div className={styles.timeline}>
          {request.statusHistory.map((entry, i) => {
            const info = getStatusDisplayInfo(entry.status);
            return (
              <div key={i} className={styles.timelineItem}>
                <span className={styles.timelineIcon}>{info.icon}</span>
                <div>
                  <strong>{info.labelHe}</strong>
                  <span className={styles.timelineDate}>
                    {format(parseISO(entry.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </span>
                  {entry.notes && <p className={styles.timelineNotes}>{entry.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {request.replies.length > 0 && (
        <div className={styles.section}>
          <h3>תגובות שהתקבלו</h3>
          {request.replies.map(reply => (
            <div key={reply.id} className={styles.reply}>
              <div className={styles.replyHeader}>
                <span className={styles.replyChannel}>
                  {reply.channel === 'email' ? '✉️' : 
                   reply.channel === 'phone' ? '📞' : '💬'} {reply.channel}
                </span>
                <span>{format(parseISO(reply.receivedAt), 'dd/MM/yyyy', { locale: he })}</span>
                <span className={`badge badge-${reply.outcome === 'resolved' ? 'green' : reply.outcome === 'rejected' ? 'red' : 'gray'}`}>
                  {reply.outcome === 'resolved' ? 'נפתר' :
                   reply.outcome === 'rejected' ? 'נדחה' :
                   reply.outcome === 'needs_more_info' ? 'דרוש מידע נוסף' : 'ממתין'}
                </span>
              </div>
              <p>{reply.content}</p>
              <span className={styles.responseTime}>
                זמן תגובה: {reply.responseTimeDays} ימים
              </span>
            </div>
          ))}
        </div>
      )}
      
      {!['closed', 'verified'].includes(request.status) && (
        <div className={styles.section}>
          <h3>הוסף תגובה מהחברה</h3>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="הדבק כאן את תוכן התגובה שקיבלת..."
            rows={4}
          />
          <div className={styles.replyForm}>
            <select 
              value={replyOutcome} 
              onChange={(e) => setReplyOutcome(e.target.value as ReplyOutcome)}
            >
              <option value="pending">ממתין להמשך</option>
              <option value="resolved">נפתר</option>
              <option value="partial_resolution">פתרון חלקי</option>
              <option value="rejected">נדחה</option>
              <option value="needs_more_info">דרוש מידע נוסף</option>
            </select>
            <button 
              className="btn-primary"
              onClick={() => onAddReply(request.id)}
              disabled={!replyContent.trim()}
            >
              הוסף תגובה
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.actions}>
        <h3>פעולות</h3>
        <div className={styles.actionButtons}>
          {transitions.map(t => (
            <button
              key={t.to}
              className={`btn-secondary ${t.to === 'escalated' ? 'btn-warning' : ''} ${t.to === 'resolved' || t.to === 'verified' ? 'btn-success' : ''}`}
              onClick={() => onTransition(request.id, t.to)}
            >
              {t.actionHe}
            </button>
          ))}
        </div>
      </div>
      
      <div className={styles.costInfo}>
        💰 עלות מוערכת לתיק: ${request.costEstimate.toFixed(2)}
      </div>
    </div>
  );
}
