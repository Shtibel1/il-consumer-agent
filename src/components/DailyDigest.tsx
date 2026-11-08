import { useMemo } from 'react';
import { useRequestStore } from '../stores/requestStore';
import { generateDailyDigest } from '../services/learning';
import { getCompanyById } from '../data/companies';
import { getStatusDisplayInfo } from '../services/stateMachine';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import styles from './DailyDigest.module.css';

export function DailyDigest() {
  const { requests } = useRequestStore();
  
  const digest = useMemo(() => {
    return generateDailyDigest(requests);
  }, [requests]);
  
  if (requests.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <h2>אין נתונים להצגה</h2>
        <p>צור פניות חדשות כדי לראות את הסיכום היומי</p>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>סיכום יומי</h2>
        <span className={styles.date}>
          {format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he })}
        </span>
      </header>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📋</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{digest.stats.totalActive}</span>
            <span className={styles.statLabel}>בקשות פעילות</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💬</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{digest.stats.newReplies}</span>
            <span className={styles.statLabel}>תגובות חדשות היום</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✅</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{digest.stats.resolvedToday}</span>
            <span className={styles.statLabel}>נפתרו היום</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💰</span>
          <div className={styles.statContent}>
            <span className={styles.statValue}>${digest.stats.averageCostPerCase.toFixed(2)}</span>
            <span className={styles.statLabel}>עלות ממוצעת לתיק</span>
          </div>
        </div>
      </div>
      
      {digest.overdueRequests.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.alertIcon}>⚠️</span>
            בקשות שעברו את ה-SLA ({digest.overdueRequests.length})
          </h3>
          <div className={styles.requestList}>
            {digest.overdueRequests.map(request => {
              const company = getCompanyById(request.companyId);
              const statusInfo = getStatusDisplayInfo(request.status);
              
              return (
                <div key={request.id} className={`${styles.requestCard} ${styles.overdue}`}>
                  <div className={styles.requestHeader}>
                    <span className={styles.companyName}>{company?.nameHe}</span>
                    <span className={`badge badge-${statusInfo.color}`}>
                      {statusInfo.labelHe}
                    </span>
                  </div>
                  <p className={styles.requestDesc}>{request.userDescription.slice(0, 100)}...</p>
                  <div className={styles.requestMeta}>
                    <span>נוצר: {format(parseISO(request.createdAt), 'dd/MM/yyyy', { locale: he })}</span>
                    {request.slaDeadline && (
                      <span className={styles.slaOverdue}>
                        SLA: {format(parseISO(request.slaDeadline), 'dd/MM/yyyy', { locale: he })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      
      {digest.suggestedEscalations.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span>⬆️</span>
            הסלמות מומלצות ({digest.suggestedEscalations.length})
          </h3>
          <div className={styles.requestList}>
            {digest.suggestedEscalations.map(({ request, reasonHe, suggestedActionHe }) => {
              const company = getCompanyById(request.companyId);
              
              return (
                <div key={request.id} className={`${styles.requestCard} ${styles.escalation}`}>
                  <div className={styles.requestHeader}>
                    <span className={styles.companyName}>{company?.nameHe}</span>
                    <span className="badge badge-orange">
                      רמה {request.currentEscalationLevel}
                    </span>
                  </div>
                  <p className={styles.requestDesc}>{request.userDescription.slice(0, 80)}...</p>
                  <div className={styles.escalationReason}>
                    <strong>סיבה:</strong> {reasonHe}
                  </div>
                  <div className={styles.suggestedAction}>
                    <strong>פעולה מומלצת:</strong> {suggestedActionHe}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>📋</span>
          בקשות ממתינות ({digest.pendingRequests.length})
        </h3>
        {digest.pendingRequests.length === 0 ? (
          <p className={styles.noData}>אין בקשות ממתינות</p>
        ) : (
          <div className={styles.requestList}>
            {digest.pendingRequests.slice(0, 10).map(request => {
              const company = getCompanyById(request.companyId);
              const statusInfo = getStatusDisplayInfo(request.status);
              
              return (
                <div key={request.id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <span className={styles.companyName}>{company?.nameHe}</span>
                    <span className={`badge badge-${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.labelHe}
                    </span>
                  </div>
                  <p className={styles.requestDesc}>{request.userDescription.slice(0, 100)}...</p>
                  <div className={styles.requestMeta}>
                    <span>עודכן: {format(parseISO(request.updatedAt), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                    <span>{request.replies.length} תגובות</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
