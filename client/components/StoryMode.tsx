import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface StoryModeProps {
    transactions: any[];
    aiInsight: any;
    onClose: () => void;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
    })
};

export default function StoryMode({ transactions, aiInsight, onClose }: StoryModeProps) {
    const [page, setPage] = useState(0);
    const [direction, setDirection] = useState(0);

    const totalIn = transactions.filter(t => t.type === 'RECEIVE').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'SEND' || t.type === 'PAYBILL').reduce((acc, t) => acc + t.amount, 0);
    const topTransaction = transactions.sort((a, b) => b.amount - a.amount)[0];

    const slides = [
        {
            bg: "bg-green-600",
            content: (
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">Your 2025 Wrapped</h1>
                    <p className="text-xl opacity-80">Let's see how money moved.</p>
                </div>
            )
        },
        {
            bg: "bg-blue-600",
            content: (
                <div className="text-center">
                    <p className="text-xl mb-2 opacity-80">You received</p>
                    <h2 className="text-5xl font-bold">Ksh {totalIn.toLocaleString()}</h2>
                    <p className="mt-4 text-sm opacity-70">That's a lot of incoming!</p>
                </div>
            )
        },
        {
            bg: "bg-red-600",
            content: (
                <div className="text-center">
                    <p className="text-xl mb-2 opacity-80">You spent</p>
                    <h2 className="text-5xl font-bold">Ksh {totalOut.toLocaleString()}</h2>
                    <p className="mt-4 text-sm opacity-70">Money comes, money goes.</p>
                </div>
            )
        },
        {
            bg: "bg-purple-600",
            content: (
                <div className="text-center px-6">
                    <p className="text-xl mb-6 opacity-80">Biggest Splash 💸</p>
                    <h3 className="text-2xl font-bold mb-2">{topTransaction?.description || "N/A"}</h3>
                    <p className="text-4xl font-bold text-yellow-300">Ksh {topTransaction?.amount.toLocaleString()}</p>
                </div>
            )
        },
        {
            bg: "bg-neutral-900 border border-green-500",
            content: (
                <div className="text-center px-6">
                    <p className="text-xl mb-4 opacity-80">The AI Verdict 🤖</p>
                    <div className="bg-neutral-800 p-6 rounded-xl">
                        <p className="text-2xl font-bold text-green-400 mb-2">"{aiInsight?.persona || 'The Mystery'}"</p>
                        <p className="italic text-gray-300">"{aiInsight?.vibe || 'Loading...'}"</p>
                    </div>
                </div>
            )
        }
    ];

    const paginate = (newDirection: number) => {
        const nextPage = page + newDirection;
        if (nextPage >= 0 && nextPage < slides.length) {
            setPage(nextPage);
            setDirection(newDirection);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <button onClick={onClose} className="absolute top-6 right-6 z-50 text-white hover:text-gray-300">
                <X className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-md h-full md:h-[80vh] bg-black md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className={`absolute inset-0 flex items-center justify-center text-white ${slides[page].bg}`}
                    >
                        {slides[page].content}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation (Overlay) */}
                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-10">
                    <button
                        onClick={() => paginate(-1)}
                        disabled={page === 0}
                        className={`p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur transition-all ${page === 0 ? 'opacity-0' : 'opacity-100'}`}
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={() => paginate(1)}
                        disabled={page === slides.length - 1}
                        className={`p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur transition-all ${page === slides.length - 1 ? 'opacity-0' : 'opacity-100'}`}
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Progress Indicators */}
                <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 px-6 z-10">
                    {slides.map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i === page ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}
