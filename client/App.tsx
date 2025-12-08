import { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';

function App() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [view, setView] = useState<'upload' | 'dashboard'>('upload');

  const handleDataLoaded = (data: any[]) => {
    setTransactions(data);
    setView('dashboard');
  };

  return (
    <>
      {view === 'upload' && <FileUpload onDataLoaded={handleDataLoaded} />}
      {view === 'dashboard' && <Dashboard transactions={transactions} onBack={() => setView('upload')} />}
    </>
  );
}

export default App;