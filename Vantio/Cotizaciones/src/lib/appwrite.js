import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

if (endpoint && projectId) {
    client
        .setEndpoint(endpoint)
        .setProject(projectId);
} else {
    console.warn('⚠️ Appwrite credentials not found. Please update .env with VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID');
}

export const appwrite = client;
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
    collections: {
        quotes: import.meta.env.VITE_APPWRITE_QUOTES_COLLECTION || '',
        clients: import.meta.env.VITE_APPWRITE_CLIENTS_COLLECTION || '',
        logs: import.meta.env.VITE_APPWRITE_LOGS_COLLECTION || '',
        settings: import.meta.env.VITE_APPWRITE_SETTINGS_COLLECTION || ''
    },
    buckets: {
        pdfs: import.meta.env.VITE_APPWRITE_PDFS_BUCKET || ''
    }
};
