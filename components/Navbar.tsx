'use client';

import Link from 'next/link';
import { useAuth } from './AuthContext';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function Navbar() {
    const { profile, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { href: '/sales', label: 'Ventas' },
        { href: '/technician', label: 'Técnico' },
        { href: '/admin', label: 'Admin' },
    ];

    return (
        <nav className="glass-nav fixed w-full z-50 top-0 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                CRM AI
                            </span>
                        </Link>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="relative group inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                                >
                                    {link.label}
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 ease-out" />
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center">
                        {profile ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                                    <User className="h-4 w-4 mr-2" />
                                    <span>{profile.nombre}</span>
                                    <span className="ml-1 text-indigo-400">| {profile.rol}</span>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 font-medium">
                                Modo Demo
                            </div>
                        )}
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="sm:hidden glass border-b border-gray-200"
                    >
                        <div className="pt-2 pb-3 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-indigo-500 hover:text-indigo-700"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
