import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';

let model: any = null;

if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
} else {
    console.warn("Gemini API Key not found. AI features will be disabled or mocked.");
}

export async function generateFinancialInsights(transactions: any[]) {
    if (!model) {
        // --- Local "Smart" Fallback ---
        // Basic rule-based logic to make it interesting without an API Key
        const totalIn = transactions.filter(t => t.type === 'RECEIVE').reduce((acc, t) => acc + t.amount, 0);
        const totalOut = transactions.filter(t => t.type === 'SEND' || t.type === 'PAYBILL').reduce((acc, t) => acc + t.amount, 0);
        const ratio = totalOut > 0 ? totalIn / totalOut : 0;

        let vibe = "Balancing act ⚖️";
        let tip = "Try to save at least 10% of your inflows.";
        let persona = "The Strategist";

        // Logic based on spending habits
        if (totalOut > totalIn) {
            vibe = "Living large (maybe too large?) 💸";
            tip = "Your outflow exceeds your inflow. Cut back on discretionary spending.";
            persona = "The Big Spender";
        } else if (ratio > 2) {
            vibe = "Stacking paper 💰";
            tip = "You're saving well! Consider investing your surplus.";
            persona = "The Saver";
        } else {
            // Check categories based on descriptions
            const descriptions = transactions.map(t => t.description.toLowerCase()).join(' ');
            if (descriptions.includes('uber') || descriptions.includes('bolt')) {
                vibe = "Always on the move 🚗";
                tip = "Transport costs are adding up. Ever tried a matatu?";
                persona = "The Commuter";
            } else if (descriptions.includes('kfc') || descriptions.includes('java') || descriptions.includes('bistro')) {
                vibe = "Foodie life 🍔";
                tip = "Cooking at home could save you thousands.";
                persona = "The Foodie";
            }
        }

        return { vibe, tip, persona };
    }

    // summarize data to Context
    const totalIn = transactions.filter(t => t.type === 'RECEIVE').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'SEND' || t.type === 'PAYBILL').reduce((acc, t) => acc + t.amount, 0);

    // Get top 5 largest expenses
    const topExpenses = transactions
        .filter(t => t.type === 'SEND' || t.type === 'PAYBILL')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(t => `${t.description}: ${t.amount}`);

    const prompt = `
    You are a financial advisor for a user's "M-PESA Wrapped" (Year in Review).
    Here is their summary:
    - Total Received: Ksh ${totalIn}
    - Total Spent: Ksh ${totalOut}
    - Net Flow: Ksh ${totalIn - totalOut}
    - Top 5 Expenses: 
      ${topExpenses.join('\n      ')}
    
    Roleplay as a witty, helpful financial coach. 
    1. Give a 1-sentence "Vibe Check" on their spending.
    2. Suggest 1 concrete way to save money based on the top expenses (if any).
    3. Determine their "Financial Persona" (e.g., "The Baller", "The Saver", "The Generous Soul").
    
    Return pure JSON format:
    {
      "vibe": "...",
      "tip": "...",
      "persona": "..."
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        // Clean code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Error:", error);
        return {
            vibe: "Calculating your financial destiny...",
            tip: "Keep tracking your spending!",
            persona: "The Mystery Spender"
        };
    }
}
