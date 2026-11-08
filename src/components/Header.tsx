import styles from './Header.module.css';

interface HeaderProps {
  activeTab: 'new' | 'tracker' | 'digest' | 'companies';
  onTabChange: (tab: 'new' | 'tracker' | 'digest' | 'companies') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const tabs = [
    { id: 'new' as const, label: 'פנייה חדשה', icon: '✍️' },
    { id: 'tracker' as const, label: 'מעקב בקשות', icon: '📋' },
    { id: 'digest' as const, label: 'סיכום יומי', icon: '📊' },
    { id: 'companies' as const, label: 'חברות', icon: '🏢' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🛡️</span>
          <div>
            <h1 className={styles.title}>סוכן הצרכן</h1>
            <p className={styles.subtitle}>מטפל בפניות שלך עד לפתרון מאומת</p>
          </div>
        </div>
        
        <nav className={styles.nav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      <div className={styles.disclaimer}>
        <span>⚠️</span>
        <span>
          שירות זה אינו מהווה ייעוץ משפטי. הפניות נשלחות בשם הלקוח ובהסכמתו.
          במצב דמו - הפניות אינן נשלחות בפועל.
        </span>
      </div>
    </header>
  );
}
