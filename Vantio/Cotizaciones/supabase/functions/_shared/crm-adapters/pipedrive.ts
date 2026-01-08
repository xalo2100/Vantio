import type { CRMAdapter, CRMClient, CRMDeal, CRMUser, CRMSettings } from '../_shared/crm-types.ts';

export class PipedriveAdapter implements CRMAdapter {
    private apiToken: string;
    private baseUrl: string;

    constructor(settings: CRMSettings) {
        if (!settings.pipedrive_api_token || !settings.pipedrive_company_domain) {
            throw new Error('Pipedrive credentials not configured');
        }
        this.apiToken = settings.pipedrive_api_token;
        this.baseUrl = `https://${settings.pipedrive_company_domain}.pipedrive.com/api/v1`;
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/users/me?api_token=${this.apiToken}`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async searchClients(term: string, limit = 10): Promise<CRMClient[]> {
        const url = `${this.baseUrl}/persons/search?term=${encodeURIComponent(term)}&fields=name,email,phone,org_name&limit=${limit}&api_token=${this.apiToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to search Pipedrive');
        }

        return (data.data?.items || []).map((item: any) => {
            const person = item.item;
            return {
                id: person.id,
                name: person.name,
                email: person.emails?.[0]?.value || '',
                phone: person.phones?.[0]?.value || '',
                company: person.org_name || '',
                crmId: person.id,
                ownerId: person.owner_id
            };
        });
    }

    async createClient(data: Partial<CRMClient>): Promise<CRMClient> {
        const response = await fetch(`${this.baseUrl}/persons?api_token=${this.apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: data.name,
                email: data.email ? [{ value: data.email, primary: true, label: 'work' }] : [],
                phone: data.phone ? [{ value: data.phone, primary: true, label: 'work' }] : [],
                owner_id: data.ownerId
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to create person in Pipedrive');
        }

        const person = result.data;
        return {
            id: person.id,
            name: person.name,
            email: person.emails?.[0]?.value || '',
            phone: person.phones?.[0]?.value || '',
            company: person.org_name || '',
            crmId: person.id,
            ownerId: person.owner_id
        };
    }

    async updateClient(id: string | number, data: Partial<CRMClient>): Promise<CRMClient> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.ownerId) updateData.owner_id = data.ownerId;

        const response = await fetch(`${this.baseUrl}/persons/${id}?api_token=${this.apiToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to update person in Pipedrive');
        }

        const person = result.data;
        return {
            id: person.id,
            name: person.name,
            email: person.emails?.[0]?.value || '',
            phone: person.phones?.[0]?.value || '',
            company: person.org_name || '',
            crmId: person.id,
            ownerId: person.owner_id
        };
    }

    async createDeal(data: Partial<CRMDeal>): Promise<CRMDeal> {
        const response = await fetch(`${this.baseUrl}/deals?api_token=${this.apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: data.title,
                value: data.value,
                person_id: data.personId,
                user_id: data.ownerId
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to create deal in Pipedrive');
        }

        return {
            id: result.data.id,
            title: result.data.title,
            value: result.data.value,
            personId: result.data.person_id,
            ownerId: result.data.user_id
        };
    }

    async updateDeal(id: string | number, data: Partial<CRMDeal>): Promise<CRMDeal> {
        const response = await fetch(`${this.baseUrl}/deals/${id}?api_token=${this.apiToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to update deal in Pipedrive');
        }

        return {
            id: result.data.id,
            title: result.data.title,
            value: result.data.value,
            personId: result.data.person_id,
            ownerId: result.data.user_id
        };
    }

    async findUserByEmail(email: string): Promise<CRMUser | null> {
        const response = await fetch(
            `${this.baseUrl}/users/find?term=${encodeURIComponent(email)}&api_token=${this.apiToken}`
        );
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
            return null;
        }

        const exactMatch = data.data.find((u: any) =>
            u.email?.toLowerCase() === email.toLowerCase()
        );

        const user = exactMatch || data.data[0];
        return {
            id: user.id,
            name: user.name,
            email: user.email
        };
    }
}
