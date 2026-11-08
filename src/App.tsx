import { useState } from 'react';
import { Header } from './components/Header';
import { IntakeForm } from './components/IntakeForm';
import { RequestTracker } from './components/RequestTracker';
import { DailyDigest } from './components/DailyDigest';
import { Companies } from './components/Companies';
import './App.css';

type TabType = 'new' | 'tracker' | 'digest' | 'companies';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('new');

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="main-content">
        <div className="content-container">
          {activeTab === 'new' && <IntakeForm />}
          {activeTab === 'tracker' && <RequestTracker />}
          {activeTab === 'digest' && <DailyDigest />}
          {activeTab === 'companies' && <Companies />}
        </div>
      </main>
      
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">🛡️</span>
            <span>סוכן הצרכן</span>
          </div>
          <div className="footer-links">
            <a href="https://github.com/Shtibel1/il-consumer-agent" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <span className="footer-divider">•</span>
            <a href="https://www.kolzchut.org.il/he/%D7%A2%D7%9E%D7%95%D7%93_%D7%A8%D7%90%D7%A9%D7%99" target="_blank" rel="noopener noreferrer">
              כל זכות
            </a>
          </div>
          <div className="footer-disclaimer">
            אינו מהווה ייעוץ משפטי • מצב דמו - פניות אינן נשלחות בפועל
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
