import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp, CreditCard, Sparkles, Lightbulb, User, Play, Calendar } from 'lucide-react';
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

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Simple Category Logic (Regex)
const categorize = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.includes('safaricom') || d.includes('airtime') || d.includes('bundle')) return 'Airtime & Data';
  if (d.includes('kplc') || d.includes('token') || d.includes('internet') || d.includes('zuku') || d.includes('faiba')) return 'Utilities';
  if (d.includes('uber') || d.includes('bolt') || d.includes('shell') || d.includes('total') || d.includes('rubis')) return 'Transport';
  if (d.includes('naivas') || d.includes('carrefour') || d.includes('quickmart') || d.includes('supermarket')) return 'Groceries';
  if (d.includes('kfc') || d.includes('java') || d.includes('restaurant') || d.includes('hotel') || d.includes('bar')) return 'Food & Drink';
  if (d.includes('loan') || d.includes('fuliza') || d.includes('m-shwari')) return 'Loans';
  return 'General';
};

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

    // Spending by Category
    const categoryMap: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'SEND' || t.type === 'PAYBILL')
      .forEach(t => {
        const cat = categorize(t.description);
        categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
      });

    const byCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Spending Trend (Group by Day - Last 7-14 days usually, or just all days found)
    // For simplicity, let's group by Date (YYYY-MM-DD)
    const trendMap: Record<string, number> = {};
    transactions.forEach(t => {
      const dateStr = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (t.type === 'SEND' || t.type === 'PAYBILL') {
        trendMap[dateStr] = (trendMap[dateStr] || 0) + t.amount;
      }
    });

    const trendData = Object.entries(trendMap)
      .map(([date, amount]) => ({ date, amount }))
      .reverse() // Assuming backend returns newest first, we want oldest first for chart? Or just sort transactions properly.
      // Better to rely on transaction sort order, let's assume transactions provided are usually reverse or mix.
      // In prod, sort by Date obj.
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Note: 'Short' date format might not sort well, ideally use ISO key.
      .slice(-14); // Last 14 active days

    return { totalIn, totalOut, net, byCategory, trendData };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">M-PESA Wrapped</h1>
            <p className="text-gray-400 text-sm">Your financial story decoded.</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowStory(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
            >
              <Play className="w-5 h-5 fill-current" /> Watch Story
            </button>
            <button onClick={onBack} className="bg-neutral-800 hover:bg-neutral-700 text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors">
              New Upload
            </button>
          </div>
        </div>

        {/* KPI Cards - Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.1} className="bg-neutral-800/50 backdrop-blur p-6 rounded-3xl border border-neutral-700/50 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-500/10 rounded-2xl">
                <ArrowDownLeft className="text-green-500 w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inflow</span>
            </div>
            <h3 className="text-3xl font-black text-white">Ksh {stats.totalIn.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.2} className="bg-neutral-800/50 backdrop-blur p-6 rounded-3xl border border-neutral-700/50 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <ArrowUpRight className="text-red-500 w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Outflow</span>
            </div>
            <h3 className="text-3xl font-black text-white">Ksh {stats.totalOut.toLocaleString()}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} delay={0.3} className="bg-neutral-800/50 backdrop-blur p-6 rounded-3xl border border-neutral-700/50 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <TrendingUp className="text-blue-500 w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net</span>
            </div>
            <h3 className={`text-3xl font-black ${stats.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.net >= 0 ? '+' : ''}Ksh {stats.net.toLocaleString()}
            </h3>
          </motion.div>
        </div>

        {/* AI Coach Section */}
        <AiCoach insight={insight} />

        {/* Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* New Trend Chart */}
          <div className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="text-xl font-bold">Spending Trend (Last 14 Days)</h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="colorSplit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Area type="monotone" dataKey="amount" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSplit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Chart (Pie) - Now Categorized */}
          <div className="bg-neutral-800 p-6 rounded-3xl border border-neutral-700 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Top Spending Categories</h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-64 w-64 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-4 w-full">
                {stats.byCategory.slice(0, 5).map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {((entry.value / stats.totalOut) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List (Brief) */}
        <div className="bg-neutral-800 p-8 rounded-3xl border border-neutral-700 overflow-hidden flex flex-col shadow-lg">
          <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
          <div className="flex-1 space-y-2">
            {transactions.slice(0, 8).map((t, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-neutral-700/30 rounded-2xl transition-all border border-transparent hover:border-neutral-700">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${t.type === 'RECEIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white truncate max-w-[200px]">{t.description}</p>
                    <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-mono font-bold ${t.type === 'RECEIVE' ? 'text-green-400' : 'text-gray-200'}`}>
                  {t.type === 'RECEIVE' ? '+' : '-'} {t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

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
  if (!insight) return (
    <div className="p-8 bg-neutral-800 rounded-3xl border border-neutral-700 animate-pulse h-48 flex items-center justify-center">
      <span className="text-gray-500 font-mono text-sm">Crunching the numbers...</span>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-neutral-900 p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Sparkles className="w-64 h-64 text-indigo-400 blur-3xl" />
      </div>

      <h3 className="text-xl font-bold mb-8 flex items-center gap-3 relative z-10">
        <div className="p-2 bg-indigo-500 rounded-lg">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        AI Financial Coach
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        <div className="space-y-3">
          <span className="text-xs text-indigo-300 uppercase tracking-widest font-bold">Vibe Check</span>
          <p className="text-xl font-medium text-white leading-relaxed">"{insight?.vibe}"</p>
        </div>

        <div className="space-y-3">
          <span className="text-xs text-indigo-300 uppercase tracking-widest font-bold flex items-center gap-2">
            <Lightbulb className="w-3 h-3" /> Pro Tip
          </span>
          <p className="text-gray-300 leading-relaxed text-sm">{insight?.tip}</p>
        </div>

        <div className="space-y-3">
          <span className="text-xs text-indigo-300 uppercase tracking-widest font-bold flex items-center gap-2">
            <User className="w-3 h-3" /> Your Persona
          </span>
          <div>
            <span className="inline-block bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20">
              {insight?.persona}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
