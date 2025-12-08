import { Transaction, TransactionType } from './types';

export const COLORS = ['#43B02A', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#E4002B'];

export const CATEGORIES = [
  'Groceries',
  'Utilities',
  'Transport',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Transfers',
];

// Helper to generate realistic mock data for demo purposes
export const generateMockTransactions = (count: number = 100): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const isExpense = Math.random() > 0.3;
    const amount = isExpense 
      ? Math.floor(Math.random() * 5000) + 100 
      : Math.floor(Math.random() * 20000) + 500;
    
    transactions.push({
      id: `TRX-${Math.random().toString(36).substr(2, 9)}`,
      date: date.toISOString(),
      description: isExpense ? `Payment to ${CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]} Merchant` : 'Money Received',
      amount,
      type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
      category: isExpense ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] : 'Income',
    });
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
