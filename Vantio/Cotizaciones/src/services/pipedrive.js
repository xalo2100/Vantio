import { supabase } from '../lib/supabase';

export const searchPipedrivePerson = async (term) => {
    // Placeholder for Pipedrive API integration
    // In a real implementation, this would call a backend function (Edge Function) 
    // to avoid exposing the API key on the client side.
    console.log('Searching Pipedrive person:', term);

    // Simulating response for now
    return {
        success: false,
        message: "Integration not configured. Please configure Pipedrive API key."
    };
};

export const searchPipedriveOrganization = async (term) => {
    console.log('Searching Pipedrive organization:', term);
    return {
        success: false,
        message: "Integration not configured."
    };
};
