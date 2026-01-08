import React, { useState, useEffect } from 'react';
import { Sparkles, Filter, CheckCheck } from 'lucide-react';
import InsightCard from '../components/InsightCard';
import { insightsService } from '../services/insightsService';
import { useAuth } from '../context/AuthContext';

const KaizenDashboard = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, high
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadInsights();

    // Subscribe to real-time updates
    const subscription = insightsService.subscribeToInsights(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        setInsights(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setInsights(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
      }
    });

    return () => {
      insightsService.unsubscribeFromInsights(subscription);
    };
  }, [user]);

  // Automatic Generation Logic
  useEffect(() => {
    if (!loading && !generating && user) {
      const lastGenKey = `kaizen_last_auto_gen_${user.id}`;
      const lastGen = localStorage.getItem(lastGenKey);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // If never generated or more than 24h ago
      if (!lastGen || (now - parseInt(lastGen)) > oneDay) {
        // Removed lottery to ensure automatic generation
        console.log("✨ Kaizen: Triggering automatic insight generation...");
        handleGenerateWeekly();
        localStorage.setItem(lastGenKey, now.toString());
      }
    }
  }, [loading, generating, user]);

  const loadInsights = async () => {
    setLoading(true);
    const result = await insightsService.getUserInsights(20, false);
    if (result.success) {
      setInsights(result.insights);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (insightId) => {
    const result = await insightsService.markAsRead(insightId);
    if (result.success) {
      setInsights(prev => prev.map(i =>
        i.id === insightId ? { ...i, is_read: true } : i
      ));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await insightsService.markAllAsRead();
    if (result.success) {
      setInsights(prev => prev.map(i => ({ ...i, is_read: true })));
    }
  };

  const handleGenerateWeekly = async () => {
    setGenerating(true);
    const result = await insightsService.generateWeeklyInsights(user.id);
    if (result.success) {
      await loadInsights();
      alert('✅ Insights generados exitosamente!');
    } else {
      alert('❌ Error al generar insights: ' + result.error);
    }
    setGenerating(false);
  };

  const filteredInsights = insights.filter(insight => {
    if (filter === 'unread') return !insight.is_read;
    if (filter === 'high') return insight.priority === 'high';
    return true;
  });

  const unreadCount = insights.filter(i => !i.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold text-petrol-800 flex items-center gap-3">
            <Sparkles className="text-orange-500" size={36} />
            Kaizen - Mejora Continua
          </h2>
          <p className="text-gray-600 mt-2">
            Insights personalizados para mejorar tu rendimiento en ventas
          </p>
        </div>

        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary flex items-center gap-2"
            >
              <CheckCheck size={18} />
              Marcar todo leído ({unreadCount})
            </button>
          )}

          <button
            onClick={handleGenerateWeekly}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles size={18} />
            {generating ? 'Generando...' : 'Generar Insights'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-petrol-800">
            <Filter size={18} />
            Filtrar:
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                ? 'bg-petrol-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos ({insights.length})
            </button>

            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'unread'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              No leídos ({unreadCount})
            </button>

            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'high'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Alta prioridad
            </button>
          </div>
        </div>
      </div>

      {/* Insights List */}
      {loading || generating ? (
        <div className="glass-panel p-12 text-center rounded-xl border border-purple-100 shadow-sm">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h4 className="text-xl font-bold text-petrol-800 mb-2">
            {generating ? 'Generando tus insights con IA...' : 'Cargando insights...'}
          </h4>
          <p className="text-gray-600">Esto puede tomar unos segundos, estamos analizando tu rendimiento histórico.</p>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-xl text-center border-dashed border-2 border-gray-200">
          <Sparkles className="mx-auto text-gray-300 mb-4 animate-pulse" size={64} />
          <h3 className="text-2xl font-bold text-petrol-800 mb-2">
            Estamos preparando tu Kaizen...
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Analizando métricas y detectando patrones para tu mejora continua. Un momento por favor.
          </p>
        </div>
      )}
      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  );
};

export default KaizenDashboard;
