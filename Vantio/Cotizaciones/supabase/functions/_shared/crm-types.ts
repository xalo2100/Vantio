// Base CRM Adapter Interface
export interface CRMClient {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    rut?: string;
    crmId: string | number;
    ownerId?: string | number;
}

export interface CRMDeal {
    id: string | number;
    title: string;
    value: number;
    personId: string | number;
    ownerId?: string | number;
}

export interface CRMUser {
    id: string | number;
    name: string;
    email: string;
}

export interface CRMAdapter {
    // Connection
    testConnection(): Promise<boolean>;

    // Clients (Persons/Contacts)
    searchClients(term: string, limit?: number): Promise<CRMClient[]>;
    createClient(data: Partial<CRMClient>): Promise<CRMClient>;
    updateClient(id: string | number, data: Partial<CRMClient>): Promise<CRMClient>;

    // Deals/Opportunities
    createDeal(data: Partial<CRMDeal>): Promise<CRMDeal>;
    updateDeal(id: string | number, data: Partial<CRMDeal>): Promise<CRMDeal>;

    // Users (for assignment)
    findUserByEmail(email: string): Promise<CRMUser | null>;
}

export interface CRMSettings {
    active_crm: string;

    // Pipedrive
    pipedrive_api_token?: string;
    pipedrive_company_domain?: string;
    pipedrive_sync_enabled?: boolean;

    // HubSpot
    hubspot_api_key?: string;
    hubspot_portal_id?: string;
    hubspot_sync_enabled?: boolean;

    // Salesforce
    salesforce_instance_url?: string;
    salesforce_access_token?: string;
    salesforce_refresh_token?: string;
    salesforce_sync_enabled?: boolean;

    // Zoho
    zoho_api_domain?: string;
    zoho_access_token?: string;
    zoho_refresh_token?: string;
    zoho_sync_enabled?: boolean;

    // Defontana
    defontana_api_key?: string;
    defontana_company_id?: string;
    defontana_sync_enabled?: boolean;

    // GoldMine
    goldmine_api_url?: string;
    goldmine_username?: string;
    goldmine_password?: string;
    goldmine_sync_enabled?: boolean;

    // Bitrix24
    bitrix24_webhook_url?: string;
    bitrix24_sync_enabled?: boolean;

    // Freshsales
    freshsales_api_key?: string;
    freshsales_domain?: string;
    freshsales_sync_enabled?: boolean;

    // Dynamics 365
    dynamics365_tenant_id?: string;
    dynamics365_client_id?: string;
    dynamics365_client_secret?: string;
    dynamics365_resource_url?: string;
    dynamics365_sync_enabled?: boolean;

    // SugarCRM
    sugarcrm_url?: string;
    sugarcrm_username?: string;
    sugarcrm_password?: string;
    sugarcrm_sync_enabled?: boolean;

    // Insightly
    insightly_api_key?: string;
    insightly_sync_enabled?: boolean;
}
