import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

const KaizenModal = ({ insight, onConfirm }) => {
    if (!insight) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-petrol-900/40 backdrop-blur-md animate-in fade-in duration-500" />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header with Sparkles */}
                <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={120} className="text-purple-600 rotate-12" />
                    </div>

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-200 mb-4 animate-bounce-slow">
                        <Sparkles className="text-white" size={32} />
                    </div>

                    <h2 className="text-3xl font-black text-petrol-900 tracking-tight">
                        Kaizen del Día
                    </h2>
                    <p className="text-purple-600 font-bold uppercase tracking-widest text-xs mt-2">
                        Mejora Continua Inteligente
                    </p>
                </div>

                {/* Content Area */}
                <div className="p-8 pt-2">
                    <div className="bg-white/50 rounded-2xl p-6 border border-white/60 shadow-inner">
                        <p className="text-lg text-petrol-800 leading-relaxed font-medium text-center">
                            "{insight.content || insight.title}"
                        </p>

                        {insight.benefit && (
                            <div className="mt-4 py-2 px-4 bg-green-50 rounded-lg border border-green-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center">
                                    <TrendingUp size={16} className="text-white" />
                                </div>
                                <p className="text-sm text-green-700 font-semibold">
                                    Potencial impacto: <span className="text-green-800">{insight.benefit}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => onConfirm(insight.id)}
                        className="w-full mt-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-200 transition-all active:scale-[0.98] group flex items-center justify-center gap-3"
                    >
                        <span>Entendido y Aplicaré</span>
                        <CheckCircle2 size={24} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-center text-gray-400 text-[10px] mt-4 uppercase tracking-tighter">
                        Esta es una recomendación personalizada basada en tu desempeño reciente
                    </p>
                </div>
            </div>
        </div>
    );
};

export default KaizenModal;
