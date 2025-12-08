export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
  [key: string]: any;
}

export interface CategorySummary {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  topCategory: string;
  monthlyData: MonthlySummary[];
  categoryData: CategorySummary[];
  recentTransactions: Transaction[];
}

export type ViewState = 'LANDING' | 'UPLOAD' | 'DASHBOARD';