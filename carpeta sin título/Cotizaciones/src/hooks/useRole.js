import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to get the current user's role and profile information
 * @returns {Object} { profile, role, isLoading, isSuperAdmin, isAdmin, error }
 */
export const useRole = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                console.log('🔍 [useRole] Fetching profile for user:', user.id);
                console.log('🔍 [useRole] User email:', user.email);

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                console.log('📦 [useRole] Profile fetch result:', { data, error });

                if (error) {
                    console.error('❌ [useRole] Error fetching profile:', error);
                    throw error;
                }

                console.log('✅ [useRole] Profile loaded successfully:', data);
                console.log('🏢 [useRole] Organization ID:', data?.organization_id);
                console.log('👤 [useRole] Role:', data?.role);

                setProfile(data);
                setError(null);
            } catch (err) {
                console.error('💥 [useRole] Error in fetchProfile:', err);
                setError(err.message);
                setProfile(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();

        // Subscribe to profile changes
        const subscription = supabase
            .channel('profile-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, () => {
                fetchProfile();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const role = profile?.role || 'vendedor';
    const isSuperAdmin = role === 'super_admin';
    const isAdmin = role === 'admin' || role === 'super_admin';

    console.log('🎭 [useRole] Final values:', {
        profile,
        role,
        isSuperAdmin,
        isAdmin,
        organization_id: profile?.organization_id
    });

    return {
        profile,
        role,
        isLoading,
        isSuperAdmin,
        isAdmin,
        error
    };
};
