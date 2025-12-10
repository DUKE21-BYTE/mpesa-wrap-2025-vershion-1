import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Check, Shield, Zap, Star, Loader2, Smartphone, ArrowRight } from 'lucide-react';

interface PlanSelectionProps {
    sessionID: string;
    onPaymentSuccess: (reportType: string) => void;
    onBack: () => void;
}

const PLANS = [
    {
        id: 'summary',
        name: 'Quick Summary',
        price: 0,
        features: ['Total In/Out', 'Net Flow', 'Top 5 Expenses'],
        color: 'from-gray-500 to-gray-700',
        icon: Zap
    },
    {
        id: 'full_report',
        name: 'Full Report',
        price: 10,
        features: ['Detailed Analytics', 'Monthly Breakdown', 'Category Analysis', 'PDF Download'],
        color: 'from-green-500 to-emerald-700',
        icon: Star,
        popular: true
    },
    {
        id: 'deep_analysis',
        name: 'Deep Analysis',
        price: 20,
        features: ['AI Financial Coach', 'Spending Anomalies', 'Investment Advice', 'Priority Support'],
        color: 'from-purple-500 to-indigo-700',
        icon: Shield
    }
];

export default function PlanSelection({ sessionID, onPaymentSuccess, onBack }: PlanSelectionProps) {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'waiting_payment' | 'success' | 'failed'>('idle');
    const [error, setError] = useState('');

    const initiatePayment = async () => {
        if (!selectedPlan) return;
        setLoading(true);
        setError('');

        const plan = PLANS.find(p => p.id === selectedPlan);
        if (!plan) return;

        // Direct success for FREE tier
        if (plan.price === 0) {
            try {
                await axios.post('http://localhost:5999/api/payment/initiate-payment', {
                    sessionID,
                    reportType: plan.id,
                    phoneNumber: '0000000000' // Dummy for free
                });
                onPaymentSuccess(plan.id);
            } catch (e) {
                setError('Failed to generate free report.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid M-Pesa phone number.');
            setLoading(false);
            return;
        }

        try {
            // 1. Initiate STK Push
            await axios.post('http://localhost:5999/api/payment/initiate-payment', {
                sessionID,
                reportType: plan.id,
                phoneNumber
            });

            setStatus('waiting_payment');

            // 2. Poll for Status
            checkStatusLoop();

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Payment initiation failed.');
            setLoading(false);
        }
    };

    const checkStatusLoop = async () => {
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes (if 2s interval)

        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await axios.get(`http://localhost:5999/api/payment/status/${sessionID}`);
                if (res.data.status === 'PAID') {
                    clearInterval(interval);
                    setStatus('success');
                    setTimeout(() => {
                        onPaymentSuccess(selectedPlan || 'full_report');
                    }, 1500);
                } else if (res.data.status === 'FAILED') {
                    clearInterval(interval);
                    setStatus('failed');
                    setError('Payment failed or was cancelled.');
                    setLoading(false);
                }
            } catch (e) {
                console.error("Polling error", e);
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setStatus('failed');
                setError('Payment timed out.');
                setLoading(false);
            }
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl w-full"
            >
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Choose Your Insights</h2>
                    <p className="text-gray-400">Unlock the power of your financial data.</p>
                </div>

                {status === 'waiting_payment' ? (
                    <div className="flex flex-col items-center justify-center space-y-6 bg-neutral-800 p-12 rounded-3xl border border-neutral-700 max-w-md mx-auto">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                            <div className="relative bg-neutral-900 p-4 rounded-full border border-green-500/50">
                                <Smartphone className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">Check your phone</h3>
                            <p className="text-gray-400">An M-Pesa prompt has been sent to <span className="text-white font-mono">{phoneNumber}</span>.</p>
                            <p className="text-xs text-gray-500 mt-4">Waiting for confirmation...</p>
                        </div>
                        <Loader2 className="animate-spin w-6 h-6 text-green-500" />

                        {/* DEBUG BUTTON FOR SANDBOX TESTING */}
                        <button
                            onClick={() => {
                                setStatus('success');
                                setTimeout(() => {
                                    onPaymentSuccess(selectedPlan || 'full_report');
                                }, 1000);
                            }}
                            className="text-xs text-gray-600 underline hover:text-green-500 mt-4 cursor-pointer"
                        >
                            [DEBUG: I HAVE PAID]
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => {
                            const isSelected = selectedPlan === plan.id;
                            const Icon = plan.icon;

                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`relative p-8 rounded-3xl border transition-all cursor-pointer overflow-hidden group
                    ${isSelected
                                            ? `border-${plan.color.split('-')[1]}-500 bg-neutral-800 ring-2 ring-${plan.color.split('-')[1]}-500/50`
                                            : 'border-neutral-700 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-600'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-green-500 to-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                            POPULAR
                                        </div>
                                    )}

                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="text-3xl font-bold mb-6">
                                        {plan.price === 0 ? 'FREE' : `KES ${plan.price}`}
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                                                <Check className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                                                {feat}
                                            </li>
                                        ))}
                                    </ul>

                                    {isSelected && (
                                        <div className="absolute inset-0 border-2 border-white/10 rounded-3xl pointer-events-none"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {selectedPlan && status !== 'waiting_payment' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 max-w-md mx-auto bg-neutral-800 p-6 rounded-2xl border border-neutral-700 shadow-2xl"
                    >
                        {PLANS.find(p => p.id === selectedPlan)?.price !== 0 && (
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-400 ml-1">M-Pesa Number</label>
                                <input
                                    type="text"
                                    placeholder="0712 345 678"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white mt-2 focus:outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={onBack}
                                className="flex-1 py-4 rounded-xl font-bold bg-neutral-700 hover:bg-neutral-600 text-gray-300 transition-all"
                            >
                                Back
                            </button>
                            <button
                                onClick={initiatePayment}
                                disabled={loading}
                                className="flex-[2] py-4 rounded-xl font-bold bg-white text-black hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        {PLANS.find(p => p.id === selectedPlan)?.price === 0 ? 'Generate Report' : 'Pay & Unlock'}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

            </motion.div>
        </div>
    );
}
