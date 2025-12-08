import { Transaction, FinancialSummary, TransactionType, MonthlySummary, CategorySummary } from '../types';
import { COLORS } from '../constants';

export const processTransactions = (transactions: Transaction[]): FinancialSummary => {
  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  const categoryMap = new Map<string, number>();

  transactions.forEach((t) => {
    const date = new Date(t.date);
    const monthKey = date.toLocaleString('default', { month: 'short' });

    // Initialize month if not exists
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { income: 0, expense: 0 });
    }

    const monthData = monthlyMap.get(monthKey)!;

    if (t.type === TransactionType.INCOME) {
      totalIncome += t.amount;
      monthData.income += t.amount;
    } else {
      totalExpense += t.amount;
      monthData.expense += t.amount;
      
      // Category processing (only for expenses usually)
      const currentCatVal = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, currentCatVal + t.amount);
    }
  });

  // Format Monthly Data for Charts
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData: MonthlySummary[] = monthOrder.map((m) => {
    const data = monthlyMap.get(m) || { income: 0, expense: 0 };
    return {
      month: m,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    };
  });

  // Format Category Data for Charts
  const categoryData: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const topCategory = categoryData.length > 0 ? categoryData[0].name : 'N/A';

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    topCategory,
    monthlyData,
    categoryData,
    recentTransactions: transactions.slice(0, 10),
  };
};

export const parseCSV = (csvText: string): Transaction[] => {
  // Simple CSV parser for demonstration
  // Assumes format: Date,Description,Amount,Type,Category
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 4) {
      const typeStr = parts[3].toUpperCase().trim();
      const amount = parseFloat(parts[2]);
      
      if (!isNaN(amount)) {
        transactions.push({
            id: `CSV-${i}`,
            date: new Date(parts[0]).toISOString(),
            description: parts[1],
            amount: amount,
            type: typeStr.includes('IN') ? TransactionType.INCOME : TransactionType.EXPENSE,
            category: parts[4] || 'Uncategorized'
        });
      }
    }
  }
  return transactions;
};
