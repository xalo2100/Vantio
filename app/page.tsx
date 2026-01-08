'use client';

import { useAuth } from '@/components/AuthContext';
import { Users, Wrench, BarChart, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async (role: 'ventas' | 'tecnico' | 'admin') => {
    await signIn(role);
    if (role === 'ventas') router.push('/sales');
    else if (role === 'tecnico') router.push('/technician');
    else if (role === 'admin') router.push('/admin');
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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="sm:mx-auto sm:w-full sm:max-w-2xl text-center z-10"
      >
        <motion.div variants={item} className="flex justify-center mb-6">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
            <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
            Potenciado por Google Gemini AI
          </span>
        </motion.div>

        <motion.h2 variants={item} className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Soporte Técnico <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Inteligente</span>
        </motion.h2>

        <motion.p variants={item} className="mt-4 text-xl text-gray-600 max-w-xl mx-auto">
          Gestiona tickets, automatiza reportes y monitorea métricas en tiempo real con nuestra plataforma todo en uno.
        </motion.p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-16 sm:mx-auto sm:w-full sm:max-w-4xl px-4"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Sales Card */}
          <motion.button
            variants={item}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLogin('ventas')}
            className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 group"
          >
            <div className="p-4 bg-indigo-50 rounded-full mb-6 group-hover:bg-indigo-100 transition-colors">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ventas</h3>
            <p className="text-gray-500 mb-6 text-sm">Ingreso rápido de tickets y seguimiento de clientes.</p>
            <div className="mt-auto flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Ingresar <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </motion.button>

          {/* Technician Card */}
          <motion.button
            variants={item}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLogin('tecnico')}
            className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 group ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent"
          >
            <div className="p-4 bg-green-50 rounded-full mb-6 group-hover:bg-green-100 transition-colors">
              <Wrench className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Técnico</h3>
            <p className="text-gray-500 mb-6 text-sm">Gestión de reparaciones y reportes automáticos con IA.</p>
            <div className="mt-auto flex items-center text-green-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Ingresar <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </motion.button>

          {/* Admin Card */}
          <motion.button
            variants={item}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleLogin('admin')}
            className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 group"
          >
            <div className="p-4 bg-gray-50 rounded-full mb-6 group-hover:bg-gray-100 transition-colors">
              <BarChart className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Admin</h3>
            <p className="text-gray-500 mb-6 text-sm">Control total de métricas y rendimiento del equipo.</p>
            <div className="mt-auto flex items-center text-gray-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Ingresar <ArrowRight className="ml-2 h-4 w-4" />
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
