// CRM Adapter Base Interface
export interface CRMAdapter {
    testConnection(credentials: any): Promise<boolean>;
    searchClients(searchTerm: string, credentials: any, limit: number): Promise<any[]>;
}

// Pipedrive Adapter
export class PipedriveAdapter implements CRMAdapter {
    async testConnection(credentials: any): Promise<boolean> {
        try {
            const { api_token, company_domain } = credentials;
            const url = `https://${company_domain}.pipedrive.com/api/v1/users/me?api_token=${api_token}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Pipedrive connection test failed:', error);
            return false;
        }
    }

    async searchClients(searchTerm: string, credentials: any, limit: number = 10): Promise<any[]> {
        try {
            const { api_token, company_domain } = credentials;
            const baseUrl = `https://${company_domain}.pipedrive.com/api/v1`;
            const results: any[] = [];

            // DETECT SEARCH TYPE: Is it a Name or a Number (RUT/Phone)?
            // Remove common separators to check for digits
            const cleanTerm = searchTerm.replace(/[\.\-\s\+]/g, '');
            const isNumericSearch = /^\d+$/.test(cleanTerm) && cleanTerm.length > 3;

            // Strategy: 
            // - If numeric (RUT/Phone): Use /searchResults (Global Search) which finds custom fields/phones.
            // - If text (Name): Use standard /search for speed.

            if (isNumericSearch) {
                console.log('🔢 Numeric search detected (RUT/Phone). Using Global Search.');

                // Use Global Search for numeric terms
                const searchResponse = await fetch(`${baseUrl}/searchResults?term=${encodeURIComponent(searchTerm)}&item_types=person,organization&limit=${limit}&api_token=${api_token}`);
                const searchData = await searchResponse.json();

                if (searchData.success && searchData.data) {
                    // Extract IDs to fetch details
                    const personIds = searchData.data
                        .filter((item: any) => item.type === 'person')
                        .map((item: any) => item.id);

                    const orgIds = searchData.data
                        .filter((item: any) => item.type === 'organization')
                        .map((item: any) => item.id);

                    // Fetch details in parallel logic (reused below)
                    // We need to construct specific fetches for these IDs

                    // Fetch Persons by ID
                    const personPromises = personIds.map(async (id: number) => {
                        try {
                            const res = await fetch(`${baseUrl}/persons/${id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? { item: json.data, type: 'person' } : null;
                        } catch (e) { return null; }
                    });

                    // Fetch Orgs by ID
                    const orgPromises = orgIds.map(async (id: number) => {
                        try {
                            const res = await fetch(`${baseUrl}/organizations/${id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? { item: json.data, type: 'organization' } : null;
                        } catch (e) { return null; }
                    });

                    const [personsDetails, orgsDetails] = await Promise.all([
                        Promise.all(personPromises),
                        Promise.all(orgPromises)
                    ]);

                    // Process found Persons
                    personsDetails.forEach((p: any) => {
                        if (p) results.push(this.mapPerson(p.item));
                    });

                    // Process found Orgs
                    orgsDetails.forEach((o: any) => {
                        if (o) results.push(this.mapOrgWithContact(o.item));
                    });
                }

            } else {
                // TEXT SEARCH (Names/Emails) - Use specialized endpoints
                const [personsResponse, orgsResponse] = await Promise.all([
                    fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(searchTerm)}&fields=name,email,org_name&limit=${limit}&api_token=${api_token}`),
                    fetch(`${baseUrl}/organizations/search?term=${encodeURIComponent(searchTerm)}&limit=${limit}&api_token=${api_token}`)
                ]);

                const personsData = await personsResponse.json();
                const orgsData = await orgsResponse.json();

                // Process Persons
                if (personsData.success && personsData.data?.items) {
                    const personPromises = personsData.data.items.map(async (item: any) => {
                        try {
                            const res = await fetch(`${baseUrl}/persons/${item.item.id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? this.mapPerson(json.data) : null;
                        } catch (e) { return null; }
                    });
                    const personResults = await Promise.all(personPromises);
                    results.push(...personResults.filter(r => r));
                }

                // Process Orgs
                if (orgsData.success && orgsData.data?.items) {
                    const orgPromises = orgsData.data.items.map(async (item: any) => {
                        try {
                            const res = await fetch(`${baseUrl}/organizations/${item.item.id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? this.mapOrgWithContact(json.data, credentials) : null;
                        } catch (e) { return null; }
                    });
                    const orgResults = await Promise.all(orgPromises);
                    results.push(...orgResults.filter(r => r));
                }
            }

            return results.slice(0, limit);
        } catch (error) {
            console.error('Pipedrive search error:', error);
            // Return empty array on error instead of breaking
            return [];
        }
    }

    // Helper: Map Full Person Object
    private mapPerson(fullPerson: any): any {
        const customFields: any = {};
        Object.keys(fullPerson).forEach(key => {
            if (key.match(/^[a-f0-9]{40}$/)) customFields[key] = fullPerson[key];
        });

        return {
            id: `person_${fullPerson.id}`,
            name: fullPerson.name,
            email: fullPerson.email?.[0]?.value || '',
            phone: fullPerson.phone?.[0]?.value || '',
            company: fullPerson.org_name || '',
            source: 'pipedrive',
            type: 'person',
            externalId: fullPerson.id,
            ownerId: fullPerson.owner_id,
            customFields: fullPerson
        };
    }

    // Helper: Map Full Org Object try to find contact
    private async mapOrgWithContact(fullOrg: any, credentials?: any): Promise<any> {
        let contactName = '';
        let contactEmail = fullOrg.cc_email || '';
        let contactPhone = '';
        let contactPerson = null;

        // Extract basic data from Org
        if (fullOrg.phone) {
            contactPhone = Array.isArray(fullOrg.phone) ? (fullOrg.phone[0]?.value || '') : fullOrg.phone;
        }

        // Try to fetch related persons (First contact)
        if (credentials) {
            try {
                const { api_token, company_domain } = credentials;
                const personsUrl = `https://${company_domain}.pipedrive.com/api/v1/organizations/${fullOrg.id}/persons?limit=1&api_token=${api_token}`;
                const res = await fetch(personsUrl);
                const json = await res.json();

                if (json.success && json.data && json.data.length > 0) {
                    const person = json.data[0];
                    contactName = person.name;
                    contactPerson = {
                        id: person.id,
                        name: person.name,
                        email: person.email?.[0]?.value || '',
                        phone: person.phone?.[0]?.value || ''
                    };
                    // Prefer person contact details if available
                    if (contactPerson.email) contactEmail = contactPerson.email;
                    if (contactPerson.phone) contactPhone = contactPerson.phone;
                }
            } catch (e) {
                console.error("Error fetching org persons:", e);
            }
        }

        // Custom Fields
        const orgCustomFields: any = {};
        Object.keys(fullOrg).forEach(key => {
            if (key.match(/^[a-f0-9]{40}$/)) orgCustomFields[key] = fullOrg[key];
        });

        return {
            id: `org_${fullOrg.id}`,
            name: fullOrg.name,
            email: contactEmail,
            phone: contactPhone,
            company: fullOrg.name,
            address: fullOrg.address, // Include address for City extraction
            comuna: fullOrg.address_formatted_address, // Fallback fields
            source: 'pipedrive',
            type: 'organization',
            externalId: fullOrg.id,
            ownerId: fullOrg.owner_id,
            customFields: orgCustomFields,
            contactPerson: contactPerson, // Return the found person
            contactName: contactName // specific field
        };
    }
}

// Placeholder adapter for other CRMs
export class PlaceholderAdapter implements CRMAdapter {
    constructor(private crmName: string) { }

    async testConnection(credentials: any): Promise<boolean> {
        console.log(`${this.crmName} adapter not yet implemented`);
        return false;
    }

    async searchClients(searchTerm: string, credentials: any, limit: number): Promise<any[]> {
        console.log(`${this.crmName} search not yet implemented`);
        return [];
    }
}

// Adapter factory
export function getAdapter(crmType: string): CRMAdapter {
    switch (crmType) {
        case 'pipedrive':
            return new PipedriveAdapter();
        case 'hubspot':
        case 'salesforce':
        case 'zoho':
        case 'odoo':
        case 'defontana':
        case 'goldmine':
        case 'upnify':
        case 'crmchile':
        case 'simply':
        case 'sap':
        case 'datacrm':
        case 'netsuite':
        case 'siebel':
        case 'bitrix24':
        case 'freshsales':
        case 'dynamics365':
        case 'sugarcrm':
        case 'insightly':
            return new PlaceholderAdapter(crmType);
        default:
            throw new Error(`Unknown CRM type: ${crmType}`);
    }
}
