import { ID, Query } from 'appwrite';
import { databases, storage, APPWRITE_CONFIG } from '../lib/appwrite';

export const appwriteService = {
    // Database Operations
    async createDocument(collectionKey, data) {
        try {
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections[collectionKey],
                ID.unique(),
                data
            );
        } catch (error) {
            console.error(`Appwrite: Error creating document in ${collectionKey}:`, error);
            throw error;
        }
    },

    async updateDocument(collectionKey, documentId, data) {
        try {
            return await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections[collectionKey],
                documentId,
                data
            );
        } catch (error) {
            console.error(`Appwrite: Error updating document ${documentId} in ${collectionKey}:`, error);
            throw error;
        }
    },

    async listDocuments(collectionKey, queries = []) {
        try {
            return await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections[collectionKey],
                queries
            );
        } catch (error) {
            console.error(`Appwrite: Error listing documents in ${collectionKey}:`, error);
            throw error;
        }
    },

    async getDocument(collectionKey, documentId) {
        try {
            return await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections[collectionKey],
                documentId
            );
        } catch (error) {
            console.error(`Appwrite: Error getting document ${documentId} in ${collectionKey}:`, error);
            throw error;
        }
    },

    // Storage Operations
    async uploadFile(bucketKey, file) {
        try {
            return await storage.createFile(
                APPWRITE_CONFIG.buckets[bucketKey],
                ID.unique(),
                file
            );
        } catch (error) {
            console.error(`Appwrite: Error uploading file to ${bucketKey}:`, error);
            throw error;
        }
    },

    getFileView(bucketKey, fileId) {
        return storage.getFileView(APPWRITE_CONFIG.buckets[bucketKey], fileId);
    },

    getFileDownload(bucketKey, fileId) {
        return storage.getFileDownload(APPWRITE_CONFIG.buckets[bucketKey], fileId);
    }
};
