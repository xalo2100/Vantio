'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { BarChart, Users, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalTicketsToday: 0,
        ticketsByTech: [] as { name: string; count: number }[],
        avgClosingTime: '0h',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: totalToday } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        const { data: tickets } = await supabase
            .from('tickets')
            .select(`
        id,
        asignado_a,
        perfiles:asignado_a (nombre)
      `);

        const techMap = new Map<string, number>();
        tickets?.forEach((t: any) => {
            if (t.perfiles?.nombre) {
                const name = t.perfiles.nombre;
                techMap.set(name, (techMap.get(name) || 0) + 1);
            }
        });

        const ticketsByTech = Array.from(techMap.entries()).map(([name, count]) => ({
            name,
            count,
        }));

        const { data: reports } = await supabase
            .from('reportes')
            .select(`
        created_at,
        tickets (created_at)
      `);

        let totalTimeMs = 0;
        let closedCount = 0;

        reports?.forEach((r: any) => {
            if (r.tickets?.created_at) {
                const start = new Date(r.tickets.created_at).getTime();
                const end = new Date(r.created_at).getTime();
                totalTimeMs += end - start;
                closedCount++;
            }
        });

        const avgTimeMs = closedCount > 0 ? totalTimeMs / closedCount : 0;
        const avgHours = Math.round(avgTimeMs / (1000 * 60 * 60));

        setStats({
            totalTicketsToday: totalToday || 0,
            ticketsByTech,
            avgClosingTime: `${avgHours}h`,
        });
        setLoading(false);
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Panel de Administración</h1>
                <p className="mt-2 text-lg text-gray-600">
                    Visión general del rendimiento del equipo.
                </p>
            </header>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-6 sm:grid-cols-3"
            >
                {/* KPI 1 */}
                <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart className="w-24 h-24 text-indigo-600" />
                    </div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Tickets Hoy</span>
                    </div>
                    <div className="flex items-baseline">
                        <h2 className="text-4xl font-extrabold text-gray-900">
                            {loading ? '...' : stats.totalTicketsToday}
                        </h2>
                        <span className="ml-2 text-sm font-medium text-green-600 flex items-center">
                            <ArrowUpRight className="w-4 h-4 mr-1" /> +12%
                        </span>
                    </div>
                </motion.div>

                {/* KPI 2 */}
                <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 text-purple-600" />
                    </div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Tiempo Promedio</span>
                    </div>
                    <div className="flex items-baseline">
                        <h2 className="text-4xl font-extrabold text-gray-900">
                            {loading ? '...' : stats.avgClosingTime}
                        </h2>
                        <span className="ml-2 text-sm font-medium text-gray-500">
                            por ticket
                        </span>
                    </div>
                </motion.div>

                {/* KPI 3 */}
                <motion.div variants={item} className="glass-card rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-green-600" />
                    </div>
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-green-100 rounded-xl text-green-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-500 uppercase tracking-wider">Top Técnicos</span>
                    </div>
                    <div className="mt-2">
                        <ul className="space-y-3">
                            {stats.ticketsByTech.length === 0 ? (
                                <li className="text-gray-400 italic">Sin datos aún</li>
                            ) : (
                                stats.ticketsByTech.map((t, i) => (
                                    <li key={t.name} className="flex justify-between items-center">
                                        <span className="text-gray-700 font-medium flex items-center">
                                            <span className="w-5 h-5 rounded-full bg-gray-200 text-xs flex items-center justify-center mr-2 text-gray-600">{i + 1}</span>
                                            {t.name}
                                        </span>
                                        <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md shadow-sm border border-gray-100">{t.count}</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
