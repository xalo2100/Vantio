import React from 'react';
import { TrendingUp, Award, AlertCircle, Target, BarChart3, X } from 'lucide-react';

const InsightCard = ({ insight, onMarkAsRead, onDismiss }) => {
    const icons = {
        improvement: Target,
        recognition: Award,
        alert: AlertCircle,
        pattern: TrendingUp,
        benchmark: BarChart3
    };

    const Icon = icons[insight.type] || Target;

    const priorityStyles = {
        high: 'border-l-4 border-red-500 bg-red-50',
        medium: 'border-l-4 border-orange-500 bg-orange-50',
        low: 'border-l-4 border-blue-500 bg-blue-50'
    };

    const typeEmojis = {
        improvement: '🎯',
        recognition: '⭐',
        alert: '⚠️',
        pattern: '🔍',
        benchmark: '📈'
    };

    return (
        <div className={`glass-panel p-6 rounded-xl ${priorityStyles[insight.priority] || priorityStyles.medium} relative group`}>
            {onDismiss && (
                <button
                    onClick={() => onDismiss(insight.id)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                >
                    <X size={18} />
                </button>
            )}

            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-petrol-500 flex-shrink-0">
                    <Icon className="text-white" size={24} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{typeEmojis[insight.type]}</span>
                        <h3 className="text-xl font-bold text-petrol-800">{insight.title}</h3>
                    </div>
                    <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </span>
                </div>

                {!insight.is_read && (
                    <span className="px-3 py-1 bg-orange-500 text-white text-xs rounded-full font-medium flex-shrink-0">
                        Nuevo
                    </span>
                )}
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">{insight.message}</p>

            {insight.actions && insight.actions.length > 0 && (
                <div className="mb-4 p-4 bg-white/50 rounded-lg">
                    <p className="text-sm font-semibold text-petrol-800 mb-3 flex items-center gap-2">
                        <span>💡</span> Acciones Sugeridas:
                    </p>
                    <ul className="space-y-2">
                        {insight.actions.map((action, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-green-600 font-bold mt-0.5">✓</span>
                                <span>{action}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {insight.expected_impact && (
                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                        <span>🎯</span> Impacto Esperado:
                    </p>
                    <p className="text-sm text-green-700">{insight.expected_impact}</p>
                </div>
            )}

            {!insight.is_read && onMarkAsRead && (
                <button
                    onClick={() => onMarkAsRead(insight.id)}
                    className="btn-secondary text-sm w-full sm:w-auto"
                >
                    Marcar como leído
                </button>
            )}
        </div>
    );
};

export default InsightCard;
