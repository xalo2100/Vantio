'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { Perfil, Role } from '@/types/database';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Perfil | null;
    loading: boolean;
    signIn: (role: Role) => Promise<void>; // Dev helper to simulate login or real login
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Perfil | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (role: Role) => {
        // Dev Login Implementation
        const mockUser = {
            id: 'dev-user-' + role,
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as User;

        const mockProfile: Perfil = {
            id: 'dev-user-' + role,
            email: `${role}@example.com`,
            nombre: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            rol: role,
            especialidad: role === 'tecnico' ? 'General' : null,
        };

        setUser(mockUser);
        setProfile(mockProfile);
        setSession({
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: mockUser,
        });
        setLoading(false);
    };

    const signOut = async () => {
        // await supabase.auth.signOut(); // Keep real signout if needed, but for dev we just clear state
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
