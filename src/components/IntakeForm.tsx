import { useState, useEffect } from 'react';
import { classify } from '../services/classifier';
import { generateDraft } from '../services/draftGenerator';
import { getCompanyById, companies } from '../data/companies';
import { scenarios } from '../data/scenarios';
import { useRequestStore } from '../stores/requestStore';
import type { ScenarioType, ClassificationResult } from '../types';
import styles from './IntakeForm.module.css';

export function IntakeForm() {
  const [userInput, setUserInput] = useState('');
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('other');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [step, setStep] = useState<'input' | 'review' | 'draft'>('input');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const { createRequest } = useRequestStore();
  
  useEffect(() => {
    if (userInput.length > 5) {
      const result = classify(userInput);
      setClassification(result);
      
      if (result.companyId && result.companyConfidence > 0.3) {
        setSelectedCompany(result.companyId);
      }
      if (result.scenarioConfidence > 0.2) {
        setSelectedScenario(result.scenario);
      }
    }
  }, [userInput]);
  
  const handleClassify = () => {
    if (!selectedCompany) {
      alert('נא לבחור חברה');
      return;
    }
    setStep('review');
  };
  
  const handleGenerateDraft = () => {
    try {
      const result = generateDraft({
        companyId: selectedCompany,
        scenario: selectedScenario,
        userDescription: userInput,
        customerName: customerName || undefined,
        customerId: customerId || undefined,
        amount: classification?.extractedDetails.amount,
        date: classification?.extractedDetails.date,
      });
      
      setDraftContent(result.contentHe);
      setStep('draft');
    } catch (error) {
      console.error('Failed to generate draft:', error);
      alert('שגיאה ביצירת הטיוטה');
    }
  };
  
  const handleSaveDraft = () => {
    const company = getCompanyById(selectedCompany);
    if (!company) return;
    
    const request = createRequest({
      companyId: selectedCompany,
      scenario: selectedScenario,
      userDescription: userInput,
      draftContent: draftContent,
      draftContentHe: draftContent,
      status: 'draft',
      currentEscalationLevel: 0,
      tags: [],
    });
    
    alert(`הטיוטה נשמרה! מספר בקשה: ${request.id.slice(0, 8)}`);
    resetForm();
  };
  
  const handleMockSend = () => {
    const company = getCompanyById(selectedCompany);
    if (!company) return;
    
    const request = createRequest({
      companyId: selectedCompany,
      scenario: selectedScenario,
      userDescription: userInput,
      draftContent: draftContent,
      draftContentHe: draftContent,
      status: 'draft',
      currentEscalationLevel: 0,
      tags: [],
    });
    
    const { transitionStatus } = useRequestStore.getState();
    transitionStatus(request.id, 'sent', 'Mock send - demo mode');
    transitionStatus(request.id, 'awaiting_reply');
    
    alert(`📤 הפנייה "נשלחה" (מצב דמו)\n\nמספר בקשה: ${request.id.slice(0, 8)}\nחברה: ${company.nameHe}\n\nבמצב ייצור, הפנייה תישלח לערוץ המומלץ.`);
    resetForm();
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const resetForm = () => {
    setUserInput('');
    setClassification(null);
    setSelectedCompany('');
    setSelectedScenario('other');
    setCustomerName('');
    setCustomerId('');
    setDraftContent('');
    setStep('input');
  };
  
  const company = selectedCompany ? getCompanyById(selectedCompany) : null;
  
  return (
    <div className={styles.container}>
      {step === 'input' && (
        <div className={styles.card}>
          <h2 className={styles.title}>ספר/י לנו מה קרה</h2>
          <p className={styles.description}>
            תאר/י את הבעיה בקצרה. אנחנו נזהה את החברה ונעזור לך לנסח פנייה מתאימה.
          </p>
          
          <div className={styles.examples}>
            <span className={styles.examplesTitle}>דוגמאות:</span>
            <button 
              className={styles.example}
              onClick={() => setUserInput('רוצה לבטל את ההוט')}
            >
              רוצה לבטל את ההוט
            </button>
            <button 
              className={styles.example}
              onClick={() => setUserInput('סלקום חייבו אותי פעמיים על אותו חשבון')}
            >
              חייבו אותי פעמיים
            </button>
            <button 
              className={styles.example}
              onClick={() => setUserInput('האינטרנט של בזק לא עובד כבר שבוע')}
            >
              תקלה שלא מטופלת
            </button>
          </div>
          
          <textarea
            className={styles.textarea}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="לדוגמה: רוצה לבטל את המנוי בהוט, אבל הם לא עונים..."
            rows={4}
          />
          
          {classification && userInput.length > 5 && (
            <div className={styles.classification}>
              <div className={styles.classificationItem}>
                <span className={styles.classificationLabel}>חברה מזוהה:</span>
                <select 
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className={styles.select}
                >
                  <option value="">בחר חברה</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nameHe}</option>
                  ))}
                </select>
                {classification.companyConfidence > 0 && (
                  <span className={styles.confidence}>
                    ({Math.round(classification.companyConfidence * 100)}% בטחון)
                  </span>
                )}
              </div>
              
              <div className={styles.classificationItem}>
                <span className={styles.classificationLabel}>סוג פנייה:</span>
                <select 
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as ScenarioType)}
                  className={styles.select}
                >
                  {scenarios.map(s => (
                    <option key={s.type} value={s.type}>{s.nameHe}</option>
                  ))}
                </select>
              </div>
              
              {classification.extractedDetails.amount && (
                <div className={styles.extracted}>
                  💰 סכום מזוהה: {classification.extractedDetails.amount} ש"ח
                </div>
              )}
            </div>
          )}
          
          <button 
            className={`btn-primary ${styles.submitBtn}`}
            onClick={handleClassify}
            disabled={!userInput || !selectedCompany}
          >
            המשך לפרטים נוספים →
          </button>
        </div>
      )}
      
      {step === 'review' && company && (
        <div className={styles.card}>
          <button className={styles.backBtn} onClick={() => setStep('input')}>
            → חזרה
          </button>
          
          <h2 className={styles.title}>פרטים נוספים</h2>
          
          <div className={styles.companyInfo}>
            <h3>{company.nameHe}</h3>
            <div className={styles.companyMeta}>
              <span className="badge badge-blue">{scenarios.find(s => s.type === selectedScenario)?.nameHe}</span>
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                {company.website}
              </a>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label>שם הלקוח (אופציונלי)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="השם המלא כפי שמופיע בחשבון"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>מספר לקוח / חשבון (אופציונלי)</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="מספר הלקוח או החשבון"
            />
          </div>
          
          <div className={styles.channelInfo}>
            <h4>ערוץ מומלץ לפנייה:</h4>
            {company.contactChannels.slice(0, 3).map((channel, i) => (
              <div key={i} className={styles.channel}>
                <span className={styles.channelType}>
                  {channel.type === 'phone' ? '📞' : 
                   channel.type === 'fax' ? '📠' :
                   channel.type === 'email' ? '✉️' :
                   channel.type === 'webform' ? '🌐' :
                   channel.type === 'whatsapp' ? '💬' : '📱'}
                </span>
                <span>{channel.value}</span>
                {!channel.verified && (
                  <span className="badge badge-yellow">לאימות</span>
                )}
              </div>
            ))}
          </div>
          
          <button 
            className={`btn-primary ${styles.submitBtn}`}
            onClick={handleGenerateDraft}
          >
            צור טיוטת פנייה ✨
          </button>
        </div>
      )}
      
      {step === 'draft' && company && (
        <div className={styles.card}>
          <button className={styles.backBtn} onClick={() => setStep('review')}>
            → חזרה לעריכה
          </button>
          
          <div className={styles.draftHeader}>
            <h2 className={styles.title}>טיוטת הפנייה</h2>
            <div className={styles.draftActions}>
              <button 
                className={`btn-secondary ${styles.copyBtn} ${copySuccess ? styles.copied : ''}`}
                onClick={handleCopy}
              >
                {copySuccess ? '✓ הועתק!' : '📋 העתק'}
              </button>
            </div>
          </div>
          
          <textarea
            className={styles.draftTextarea}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={15}
          />
          
          <div className={styles.draftFooter}>
            <div className={styles.disclaimer}>
              <span>⚠️</span>
              <span>
                הפנייה נשלחת בשמך ובהסכמתך. זוהי לא ייעוץ משפטי.
                נא לוודא שכל הפרטים נכונים לפני השליחה.
              </span>
            </div>
            
            <div className={styles.buttonGroup}>
              <button 
                className="btn-secondary"
                onClick={handleSaveDraft}
              >
                שמור כטיוטה
              </button>
              <button 
                className="btn-primary"
                onClick={handleMockSend}
              >
                📤 שלח (דמו)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
