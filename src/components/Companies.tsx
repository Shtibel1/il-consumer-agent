import { useState } from 'react';
import { companies, searchCompanies } from '../data/companies';
import type { Company } from '../types';
import styles from './Companies.module.css';

export function Companies() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const filteredCompanies = searchQuery 
    ? searchCompanies(searchQuery)
    : companies;
  
  const industryLabels: Record<string, string> = {
    telecom: 'תקשורת',
    utilities: 'תשתיות',
    banking: 'בנקאות',
    insurance: 'ביטוח',
    internet: 'אינטרנט',
    tv: 'טלוויזיה',
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>מאגר החברות</h2>
        <p>מידע על ערוצי התקשרות, הסלמה וזכויות צרכן</p>
      </div>
      
      <div className={styles.searchBar}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש חברה..."
          className={styles.searchInput}
        />
      </div>
      
      <div className={styles.layout}>
        <div className={styles.list}>
          {filteredCompanies.map(company => (
            <button
              key={company.id}
              className={`${styles.companyCard} ${selectedCompany?.id === company.id ? styles.selected : ''}`}
              onClick={() => setSelectedCompany(company)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.companyName}>{company.nameHe}</span>
                <span className={`badge badge-blue`}>{industryLabels[company.industry]}</span>
              </div>
              <div className={styles.cardMeta}>
                <span>{company.contactChannels.length} ערוצי קשר</span>
                <span>•</span>
                <span>{company.escalationLadder.length} שלבי הסלמה</span>
              </div>
            </button>
          ))}
        </div>
        
        <div className={styles.detail}>
          {selectedCompany ? (
            <CompanyDetail company={selectedCompany} />
          ) : (
            <div className={styles.noSelection}>
              <span className={styles.noSelectionIcon}>🏢</span>
              <p>בחר חברה לצפייה בפרטים</p>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.contribute}>
        <h3>🤝 תורמים למאגר</h3>
        <p>
          המאגר הזה הוא קוד פתוח! אם מצאת מידע לא מעודכן או רוצה להוסיף חברה, 
          אפשר לתרום ב-GitHub.
        </p>
        <a 
          href="https://github.com/Shtibel1/il-consumer-agent/tree/main/src/data/companies" 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.contributeLink}
        >
          צפה במאגר ב-GitHub →
        </a>
      </div>
    </div>
  );
}

function CompanyDetail({ company }: { company: Company }) {
  const [activeTab, setActiveTab] = useState<'contact' | 'escalation' | 'sla'>('contact');
  
  const channelIcons: Record<string, string> = {
    phone: '📞',
    email: '✉️',
    webform: '🌐',
    whatsapp: '💬',
    chat: '💬',
    fax: '📠',
    app: '📱',
  };
  
  const channelLabels: Record<string, string> = {
    phone: 'טלפון',
    email: 'אימייל',
    webform: 'טופס אינטרנט',
    whatsapp: 'וואטסאפ',
    chat: "צ'אט",
    fax: 'פקס',
    app: 'אפליקציה',
  };
  
  return (
    <div className={styles.detailContent}>
      <div className={styles.detailHeader}>
        <h2>{company.nameHe}</h2>
        <span className={styles.englishName}>{company.name}</span>
        <a href={company.website} target="_blank" rel="noopener noreferrer">
          {company.website}
        </a>
      </div>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'contact' ? styles.active : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          ערוצי קשר
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'escalation' ? styles.active : ''}`}
          onClick={() => setActiveTab('escalation')}
        >
          סולם הסלמה
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'sla' ? styles.active : ''}`}
          onClick={() => setActiveTab('sla')}
        >
          זמני תגובה
        </button>
      </div>
      
      {activeTab === 'contact' && (
        <div className={styles.tabContent}>
          <div className={styles.channelList}>
            {company.contactChannels.map((channel, i) => (
              <div key={i} className={styles.channelItem}>
                <span className={styles.channelIcon}>{channelIcons[channel.type]}</span>
                <div className={styles.channelInfo}>
                  <span className={styles.channelType}>{channelLabels[channel.type]}</span>
                  <span className={styles.channelValue}>{channel.value}</span>
                  {channel.description && (
                    <span className={styles.channelDesc}>{channel.description}</span>
                  )}
                </div>
                <div className={styles.channelMeta}>
                  {!channel.verified && (
                    <span className="badge badge-yellow">לאימות</span>
                  )}
                  <a 
                    href={channel.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    מקור
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'escalation' && (
        <div className={styles.tabContent}>
          <div className={styles.escalationLadder}>
            {company.escalationLadder.map((step, i) => (
              <div key={i} className={styles.escalationStep}>
                <div className={styles.stepNumber}>{step.level}</div>
                <div className={styles.stepContent}>
                  <h4>{step.nameHe}</h4>
                  <p>{step.descriptionHe}</p>
                  <div className={styles.stepMeta}>
                    <span>זמן תגובה טיפוסי: {step.typicalResponseDays} ימים</span>
                    {!step.verified && (
                      <span className="badge badge-yellow">לאימות</span>
                    )}
                  </div>
                  {step.channels.length > 0 && (
                    <div className={styles.stepChannels}>
                      {step.channels.map((ch, j) => (
                        <span key={j} className={styles.stepChannel}>
                          {channelIcons[ch.type]} {ch.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.regulatorInfo}>
            <h4>רגולטור:</h4>
            <p>
              <strong>{company.regulator.nameHe}</strong>
              <br />
              <a href={company.regulator.complaintUrl} target="_blank" rel="noopener noreferrer">
                להגשת תלונה לרגולטור →
              </a>
            </p>
          </div>
        </div>
      )}
      
      {activeTab === 'sla' && (
        <div className={styles.tabContent}>
          <div className={styles.slaList}>
            {company.slaInfo.map((sla, i) => (
              <div key={i} className={styles.slaItem}>
                <span className={styles.slaScenario}>
                  {sla.scenario === 'cancellation' ? 'ביטול' :
                   sla.scenario === 'wrong_charge' ? 'חיוב שגוי' :
                   sla.scenario === 'unresolved_fault' ? 'תקלה' : 'אחר'}
                </span>
                <div className={styles.slaTimes}>
                  <span>תגובה: עד {sla.maxResponseDays} ימים</span>
                  <span>פתרון: עד {sla.maxResolutionDays} ימים</span>
                </div>
                {!sla.verified && (
                  <span className="badge badge-yellow">לאימות</span>
                )}
              </div>
            ))}
          </div>
          
          <p className={styles.slaNote}>
            * זמני התגובה הם הערכה בלבד ועשויים להשתנות בהתאם לעומס ולמורכבות הבקשה.
          </p>
        </div>
      )}
      
      <div className={styles.lastUpdated}>
        עודכן לאחרונה: {company.lastUpdated}
      </div>
    </div>
  );
}
