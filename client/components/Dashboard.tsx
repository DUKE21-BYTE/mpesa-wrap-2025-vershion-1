import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp, CreditCard, Sparkles, Lightbulb, User, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateFinancialInsights } from '../services/ai';
import StoryMode from './StoryMode';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'SEND' | 'RECEIVE' | 'PAYBILL';
}

interface DashboardProps {
  transactions: Transaction[];
  onBack: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard({ transactions, onBack }: DashboardProps) {
  const [showStory, setShowStory] = useState(false);
  const [insight, setInsight] = useState<any>(null);

  useEffect(() => {
    generateFinancialInsights(transactions).then(data => {
      setInsight(data);
    });
  }, [transactions]);

  const stats = useMemo(() => {
    const totalIn = transactions.filter(t => t.type === 'RECEIVE').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'SEND' || t.type === 'PAYBILL').reduce((acc, t) => acc + t.amount, 0);
    const net = totalIn - totalOut;

    // Group by type for Pie Chart
    const byType = [
      { name: 'Sent', value: transactions.filter(t => t.type === 'SEND').reduce((a, t) => a + t.amount, 0) },
      { name: 'Received', value: totalIn },
      { name: 'Paybill', value: transactions.filter(t => t.type === 'PAYBILL').reduce((a, t) => a + t.amount, 0) },
    ].filter(i => i.value > 0);

    return { totalIn, totalOut, net, byType };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowStory(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Play className="w-4 h-4" /> Story Mode
            </button>
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
              Upload Another
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.1} className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <ArrowDownLeft className="text-green-500 w-6 h-6" />
              </div>
              <span className="text-xs text-gray-400 bg-neutral-900 px-2 py-1 rounded">Total In</span>
            </div>
            <h3 className="text-3xl font-bold">Ksh {stats.totalIn.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.2} className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <ArrowUpRight className="text-red-500 w-6 h-6" />
              </div>
              <span className="text-xs text-gray-400 bg-neutral-900 px-2 py-1 rounded">Total Out</span>
            </div>
            <h3 className="text-3xl font-bold">Ksh {stats.totalOut.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.3} className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="text-blue-500 w-6 h-6" />
              </div>
              <span className="text-xs text-gray-400 bg-neutral-900 px-2 py-1 rounded">Net Flow</span>
            </div>
            <h3 className={`text-3xl font-bold ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.net >= 0 ? '+' : ''}Ksh {stats.net.toLocaleString()}
            </h3>
          </motion.div>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Activity Chart (Pie) */}
          <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
            <h3 className="text-lg font-semibold mb-6">Spending Breakdown</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {stats.byType.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name}: {((entry.value / (stats.totalIn + stats.totalOut)) * 100).toFixed(0)}%
                </div>
              ))}
            </div>
          </div>

          {/* Transaction List (Brief) */}
          <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {transactions.slice(0, 10).map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-neutral-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${t.type === 'RECEIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">{t.description}</p>
                      <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-mono font-medium ${t.type === 'RECEIVE' ? 'text-green-400' : 'text-white'}`}>
                    {t.type === 'RECEIVE' ? '+' : '-'} {t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Coach Section */}
        <AiCoach insight={insight} />

        {/* Story Mode Overlay */}
        {showStory && (
          <StoryMode
            transactions={transactions}
            aiInsight={insight}
            onClose={() => setShowStory(false)}
          />
        )}
      </div>
    </div>
  );
}

function AiCoach({ insight }: { insight: any }) {
  if (!insight) return <div className="p-6 bg-neutral-800 rounded-2xl border border-neutral-700 animate-pulse h-48"></div>;

  return (
    <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-6 rounded-2xl border border-neutral-700 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-32 h-32 text-green-400" />
      </div>

      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="text-yellow-400 w-5 h-5" /> AI Financial Coach
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-2">
          <span className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Vibe Check</span>
          <p className="text-lg font-medium text-white">"{insight?.vibe}"</p>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" /> Pro Tip
          </span>
          <p className="text-gray-300">{insight?.tip}</p>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" /> Your Persona
          </span>
          <div className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold border border-green-500/30">
            {insight?.persona}
          </div>
        </div>
      </div>
    </div>
  );
}
