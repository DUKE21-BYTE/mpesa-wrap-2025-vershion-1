import { GoogleGenAI } from "@google/genai";
import { FinancialSummary } from "../types";

// NOTE: In a real production app, this call would likely be proxied through a backend
// to protect the API key, or the user would provide their own key in the UI for a client-only app.
// Per instructions, we assume process.env.API_KEY is available.

export const generateAIInsights = async (summary: FinancialSummary): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API Key not found. Returning mock insight.");
    return "AI Insights are unavailable without a valid API Key. However, based on your data, your highest spending category is " + summary.topCategory + ". Consider setting a budget for this next month.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are a financial advisor analyzing a user's "Year in Review" for M-PESA (mobile money).
      Here is the summary data:
      - Total Income: ${summary.totalIncome}
      - Total Expense: ${summary.totalExpense}
      - Net Balance: ${summary.netBalance}
      - Top Expense Category: ${summary.topCategory}
      - Transaction Count: ${summary.transactionCount}
      
      Please provide a friendly, encouraging, and concise (max 3 sentences) insight or tip for the user based on these numbers. 
      Do not format as markdown. plain text only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return "We encountered an error contacting the intelligence engine. Please try again later.";
  }
};
