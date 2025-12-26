import { useEffect } from 'react';
import { useRole } from './useRole';
import { supabase } from '../lib/supabase';

/**
 * Custom hook to dynamically update favicon based on organization settings
 */
export const useFavicon = () => {
    const { profile } = useRole();

    useEffect(() => {
        if (!profile?.organization_id) return;

        const fetchFavicon = async () => {
            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('favicon_url')
                    .eq('id', profile.organization_id)
                    .single();

                if (error) {
                    console.error('Error fetching favicon:', error);
                    return;
                }

                if (data?.favicon_url) {
                    // Update favicon
                    let link = document.querySelector("link[rel~='icon']");
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.head.appendChild(link);
                    }
                    link.href = data.favicon_url;
                }
            } catch (error) {
                console.error('Error updating favicon:', error);
            }
        };

        fetchFavicon();
    }, [profile?.organization_id]);
};
