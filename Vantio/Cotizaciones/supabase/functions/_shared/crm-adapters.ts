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

            // Fetch field definitions once per search to handle custom fields correctly
            const [personFieldsRes, orgFieldsRes] = await Promise.all([
                fetch(`${baseUrl}/personFields?api_token=${api_token}`),
                fetch(`${baseUrl}/organizationFields?api_token=${api_token}`)
            ]).catch(() => [null, null]);

            const personFields = personFieldsRes ? (await personFieldsRes.json()).data || [] : [];
            const orgFields = orgFieldsRes ? (await orgFieldsRes.json()).data || [] : [];

            // DETECT SEARCH TYPE
            const cleanTerm = searchTerm.replace(/[\.\-\s\+]/g, '');
            const isNumericSearch = /^\d+$/.test(cleanTerm) && cleanTerm.length > 3;

            if (isNumericSearch) {
                const searchResponse = await fetch(`${baseUrl}/searchResults?term=${encodeURIComponent(searchTerm)}&item_types=person,organization&limit=${limit}&api_token=${api_token}`);
                const searchData = await searchResponse.json();

                if (searchData.success && searchData.data) {
                    const detailPromises = searchData.data.map(async (item: any) => {
                        try {
                            const endpoint = item.type === 'person' ? 'persons' : 'organizations';
                            const res = await fetch(`${baseUrl}/${endpoint}/${item.id}?api_token=${api_token}`);
                            const json = await res.json();
                            if (!json.success) return null;

                            if (item.type === 'person') {
                                return await this.mapPerson(json.data, personFields, credentials, orgFields);
                            } else {
                                return await this.mapOrgWithContact(json.data, credentials, orgFields);
                            }
                        } catch (e: any) { return null; }
                    });

                    const detailResults = await Promise.all(detailPromises);
                    results.push(...detailResults.filter(r => r));
                }
            } else {
                // TEXT SEARCH
                const [personsResponse, orgsResponse] = await Promise.all([
                    fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(searchTerm)}&fields=name,email,org_name&limit=${limit}&api_token=${api_token}`),
                    fetch(`${baseUrl}/organizations/search?term=${encodeURIComponent(searchTerm)}&limit=${limit}&api_token=${api_token}`)
                ]);

                const personsData = await personsResponse.json();
                const orgsData = await orgsResponse.json();

                const detailPromises: Promise<any>[] = [];

                if (personsData.success && personsData.data?.items) {
                    detailPromises.push(...personsData.data.items.map(async (item: any) => {
                        try {
                            const res = await fetch(`${baseUrl}/persons/${item.item.id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? await this.mapPerson(json.data, personFields, credentials, orgFields) : null;
                        } catch (e: any) { return null; }
                    }));
                }

                if (orgsData.success && orgsData.data?.items) {
                    detailPromises.push(...orgsData.data.items.map(async (item: any) => {
                        try {
                            const res = await fetch(`${baseUrl}/organizations/${item.item.id}?api_token=${api_token}`);
                            const json = await res.json();
                            return json.success ? await this.mapOrgWithContact(json.data, credentials, orgFields) : null;
                        } catch (e: any) { return null; }
                    }));
                }

                const detailResults = await Promise.all(detailPromises);
                results.push(...detailResults.filter(r => r));
            }

            return results.slice(0, limit);
        } catch (error) {
            console.error('Pipedrive search error:', error);
            return [];
        }
    }

    private async mapPerson(fullPerson: any, personFields: any[] = [], credentials?: any, orgFields: any[] = []): Promise<any> {
        let rut = '';
        let rutIsExplicit = false;
        let city = '';
        let address = '';
        let companyName = fullPerson.org_name || '';

        let comunaVal = '';
        let regionVal = '';

        const fieldLabels: Record<string, string> = {};
        personFields.forEach(f => fieldLabels[f.key] = (f.name || '').toLowerCase());

        // Scan person for RUT/City/Address
        const scanObj = (obj: any, labels: Record<string, string>) => {
            Object.keys(obj).forEach(key => {
                const val = obj[key];
                if (!val || val === 'null' || val === 'undefined') return;

                const label = labels[key] || '';
                const keyLower = key.toLowerCase();
                let stringVal = (typeof val === 'object' ? (val.value || val.name || JSON.stringify(val)) : val).toString().trim();

                // 1. RUT Detection
                // REVERTED ID BLOCKING per user request.
                // const isBlockedKey = keyLower === 'id' || keyLower === 'owner_id' || keyLower === 'org_id' || keyLower === 'value';
                // If it's a known restricted key, SKIP IT.
                // if (isBlockedKey) return;

                const isRutField = label.includes('rut') || label.includes('identifica') || label.includes('tax') || label.includes('nif') || label.includes('cif') || keyLower.includes('rut') || key.match(/^[a-f0-9]{40}$/);
                const rutMatch = stringVal.match(/(\d[\d\.\-]{6,11}[\d0-9kK])/i);

                // PRIORITY FIX: If we haven't found a Strong RUT yet, OR this is a Strong one overriding a weak one
                if ((!rut || !rutIsExplicit) && (isRutField || (rutMatch && stringVal.length <= 20))) {
                    if (rutMatch) {
                        const candidate = rutMatch[1];
                        // Only accept if it has enough digits OR is explicitly a RUT field
                        // If it's explicitly a RUT field, valid even if short. If guessed, must be >= 7 chars.
                        if (isRutField || candidate.replace(/[^\d]/g, '').length >= 7) {
                            rut = candidate;
                            if (isRutField) rutIsExplicit = true;
                        }
                    }
                }

                // 2. Comuna/Region Detection
                const isComunaField = label.includes('comuna') || label.includes('ciudad') || label.includes('city') || keyLower.includes('comuna') || keyLower.includes('city');
                const isRegionField = label.includes('región') || label.includes('region') || label.includes('estado') || label.includes('state') || keyLower.includes('region');

                if (isComunaField && !comunaVal) comunaVal = stringVal;
                if (isRegionField && !regionVal) regionVal = stringVal;

                // 3. Address Detection
                const isAddressField = label.includes('direccion') || label.includes('dirección') || label.includes('address') || label.includes('calle') || label.includes('ubicacion');
                if (!address && isAddressField) address = stringVal;
            });
        };

        // 1. Scan Person Fields
        scanObj(fullPerson, fieldLabels);

        // 2. Scan Organization Fields (Fetch if exists)
        if (fullPerson.org_id && fullPerson.org_id.value && credentials) {
            try {
                const orgId = fullPerson.org_id.value;
                const { api_token, company_domain } = credentials;
                const orgUrl = `https://${company_domain}.pipedrive.com/api/v1/organizations/${orgId}?api_token=${api_token}`;
                const orgRes = await fetch(orgUrl);
                const orgJson = await orgRes.json();

                if (orgJson.success && orgJson.data) {
                    const orgData = orgJson.data;
                    companyName = orgData.name || companyName;

                    // Decode org labels
                    const orgFieldLabels: Record<string, string> = {};
                    orgFields.forEach(f => orgFieldLabels[f.key] = (f.name || '').toLowerCase());

                    // Scan Org data for RUT/Address if missing on Person
                    scanObj(orgData, orgFieldLabels);

                    // Explicit Address fallback
                    if (!address && orgData.address) address = orgData.address;
                    if (!address && orgData.address_formatted_address) address = orgData.address_formatted_address;
                }
            } catch (e) {
                console.error("Error fetching person's organization:", e);
            }
        }

        // Email filter: Skip Pipedrive BCC emails
        let email = '';
        if (fullPerson.email) {
            const emails = Array.isArray(fullPerson.email) ? fullPerson.email : [{ value: fullPerson.email }];
            const validEmail = emails.find((e: any) => {
                const val = typeof e === 'object' ? e.value : e;
                return val && !val.includes('pipedrivemail.com');
            });
            email = validEmail ? (typeof validEmail === 'object' ? validEmail.value : validEmail) : (emails[0]?.value || emails[0] || '');
        }

        // Fetch Organization Details if missing RUT/City/Comuna
        if (fullPerson.org_id && credentials && (!rut || !comunaVal || !regionVal)) {
            try {
                const orgId = typeof fullPerson.org_id === 'object' ? fullPerson.org_id.value : fullPerson.org_id;
                const { api_token, company_domain } = credentials;
                const orgRes = await fetch(`https://${company_domain}.pipedrive.com/api/v1/organizations/${orgId}?api_token=${api_token}`);
                const orgJson = await orgRes.json();

                if (orgJson.success && orgJson.data) {
                    const orgData = orgJson.data;
                    companyName = orgData.name;
                    address = orgData.address || '';
                    if (!city) city = orgData.address_city || orgData.address_locality || '';

                    // Map org labels
                    const orgFieldLabels: Record<string, string> = {};
                    orgFields.forEach(f => orgFieldLabels[f.key] = (f.name || '').toLowerCase());

                    // Scan Org for missing RUT/City/Comuna/Region
                    Object.keys(orgData).forEach(okey => {
                        const oval = orgData[okey];
                        if (!oval || oval === 'null') return;

                        const olabel = orgFieldLabels[okey] || '';
                        const okeyLower = okey.toLowerCase();
                        let ostringVal = (typeof oval === 'object' ? (oval.value || oval.name || JSON.stringify(oval)) : oval).toString().trim();

                        if (!rut) {
                            const isRutField = olabel.includes('rut') || olabel.includes('identifica') || olabel.includes('tax') || olabel.includes('nif') || olabel.includes('cif') || okeyLower.includes('rut') || okey.match(/^[a-f0-9]{40}$/);
                            const rutMatch = ostringVal.match(/(\d[\d\.\-]{6,11}[\d0-9kK])/i);
                            if (isRutField || (ostringVal.length >= 7 && ostringVal.length <= 20)) {
                                if (rutMatch) {
                                    const candidate = rutMatch[1];
                                    if (candidate.replace(/[^\d]/g, '').length >= 7) rut = candidate;
                                }
                            }
                        }

                        const isComunaField = olabel.includes('comuna') || olabel.includes('ciudad') || olabel.includes('city') || okeyLower.includes('comuna') || okeyLower.includes('city');
                        const isRegionField = olabel.includes('región') || olabel.includes('region') || olabel.includes('estado') || olabel.includes('state') || okeyLower.includes('region');

                        if (isComunaField && !comunaVal) comunaVal = ostringVal;
                        if (isRegionField && !regionVal) regionVal = ostringVal;
                    });
                }
            } catch (e: any) {
                console.error('Error fetching org details for person:', e);
            }
        }

        // Combine Comuna and Region
        if (comunaVal && regionVal) {
            city = `${comunaVal}, ${regionVal}`;
        } else {
            city = comunaVal || regionVal || city;
        }

        // Clean redundant "Chile" from city
        if (city.toLowerCase().endsWith(', chile')) {
            city = city.substring(0, city.length - 7);
        } else if (city.toLowerCase().endsWith(' chile')) {
            city = city.substring(0, city.length - 6);
        }

        return {
            id: `person_${fullPerson.id}`,
            name: fullPerson.name,
            email: email,
            phone: fullPerson.phone?.[0]?.value || '',
            company: companyName,
            address: address,
            city: city.trim(),
            source: 'pipedrive',
            type: 'person',
            externalId: fullPerson.id,
            ownerId: fullPerson.owner_id,
            rut: rut,
            customFields: { ...fullPerson, _orgDetails: (fullPerson.org_id ? companyName : null) } // Placeholder since we can't easily merge full org without more logic here, but wait...
        };
    }

    private async mapOrgWithContact(fullOrg: any, credentials?: any, fields: any[] = []): Promise<any> {
        let contactName = '';
        let contactEmail = fullOrg.cc_email || '';
        let contactPerson = null;
        let rut = '';
        let rutIsExplicit = false;
        let contactPhone = '';
        let phoneIsExplicit = false;
        let city = fullOrg.address_city || fullOrg.address_locality || '';

        let comunaVal = '';
        let regionVal = '';

        const fieldLabels: Record<string, string> = {};
        fields.forEach(f => fieldLabels[f.key] = (f.name || '').toLowerCase());

        // RUT, Email, Phone and City detection from ALL fields
        Object.keys(fullOrg).forEach(key => {
            const val = fullOrg[key];
            if (!val || val === 'null' || val === 'undefined') return;

            const label = fieldLabels[key] || '';
            const keyLower = key.toLowerCase();

            let stringVal = (typeof val === 'object' ? (val.value || val.name || JSON.stringify(val)) : val).toString().trim();

            // 1. RUT Detection
            // REVERTED ID BLOCKING per user request.
            // const isBlockedKey = keyLower === 'id' || keyLower === 'owner_id' || keyLower === 'org_id' || keyLower === 'value';
            // if (isBlockedKey) return;

            const isRutField = label.includes('rut') || label.includes('identifica') || label.includes('tax') || label.includes('nif') || label.includes('cif') || label.includes('tributario') || label.includes('contribuyente') || label.includes('id number') || keyLower.includes('rut') || key.match(/^[a-f0-9]{40}$/);
            const rutMatch = stringVal.match(/(\d[\d\.\-]{6,11}[\d0-9kK])/i);

            // PRIORITY FIX: Overwrite if found Better Candidate
            if ((!rut || !rutIsExplicit) && (isRutField || (stringVal.length >= 7 && stringVal.length <= 20))) {
                if (rutMatch) {
                    const candidate = rutMatch[1];
                    if (isRutField || candidate.replace(/[^\d]/g, '').length >= 7) {
                        rut = candidate;
                        if (isRutField) rutIsExplicit = true;
                    }
                }
            }

            // 2. Email Detection (Only if contactEmail is empty or looks like a Pipedrive BCC)
            const looksLikeBcc = contactEmail.includes('pipedrivemail.com');
            const isEmailField = label.includes('email') || label.includes('correo') || keyLower.includes('email');
            const emailMatch = stringVal.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if ((!contactEmail || looksLikeBcc) && (isEmailField || emailMatch)) {
                if (emailMatch && !emailMatch[0].includes('pipedrivemail.com')) {
                    contactEmail = emailMatch[0];
                }
            }

            // 3. Phone Detection
            const isPhoneField = label.includes('tel') || label.includes('cel') || label.includes('phon') || keyLower.includes('phone') || label.includes('whatsapp');
            // FIX: Increased limit from 15 to 60 chars to allow multiple numbers (e.g., "975169912 - 982110136")
            const phoneMatch = stringVal.match(/(\+?\d[\d\s\-\(\)]{7,60})/);

            // PRIORITY FIX: Overwrite if we find a Better Candidate
            if ((!contactPhone || !phoneIsExplicit) && (isPhoneField || phoneMatch)) {
                if (phoneMatch) {
                    const candidate = phoneMatch[1].trim();
                    // Basic validation: 7-15 digits, not a date (no 2024/2025 unless clearly phone)
                    if (candidate.length >= 7) {
                        if (isPhoneField || (!contactPhone && !stringVal.includes('-'))) {
                            contactPhone = candidate;
                            if (isPhoneField) phoneIsExplicit = true;
                        }
                    }
                }
            }

            // 4. City/Comuna/Region Detection
            const isComunaField = label.includes('comuna') || label.includes('ciudad') || label.includes('city') || keyLower.includes('comuna') || keyLower.includes('city');
            const isRegionField = label.includes('región') || label.includes('region') || label.includes('estado') || label.includes('state') || keyLower.includes('region');

            if (isComunaField && !comunaVal) comunaVal = stringVal;
            if (isRegionField && !regionVal) regionVal = stringVal;
        });

        // Combine Comuna and Region
        if (comunaVal && regionVal) {
            city = `${comunaVal}, ${regionVal}`;
        } else {
            city = comunaVal || regionVal || city;
        }

        // Clean redundant "Chile" from city
        if (city.toLowerCase().endsWith(', chile')) {
            city = city.substring(0, city.length - 7);
        } else if (city.toLowerCase().endsWith(' chile')) {
            city = city.substring(0, city.length - 6);
        }

        // Fallback for standard phone if not found in custom fields
        if (!contactPhone && fullOrg.phone) {
            contactPhone = Array.isArray(fullOrg.phone) ? (fullOrg.phone[0]?.value || '') : fullOrg.phone;
        }

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
                    // Only override if not set or if person data is valid
                    if (contactPerson.email && (!contactEmail || contactEmail.includes('pipedrivemail.com'))) {
                        contactEmail = contactPerson.email;
                    }
                    if (contactPerson.phone && !contactPhone) {
                        contactPhone = contactPerson.phone;
                    }
                }
            } catch (e: any) { }
        }

        return {
            id: `org_${fullOrg.id}`,
            name: fullOrg.name,
            email: contactEmail,
            phone: contactPhone,
            company: fullOrg.name,
            address: fullOrg.address,
            city: city.trim(),
            source: 'pipedrive',
            type: 'organization',
            externalId: fullOrg.id,
            ownerId: fullOrg.owner_id,
            contactPerson: contactPerson,
            contactName: contactName,
            rut: rut,
            customFields: fullOrg
        };
    }
}

export class PlaceholderAdapter implements CRMAdapter {
    constructor(private crmName: string) { }
    async testConnection(credentials: any): Promise<boolean> { return false; }
    async searchClients(searchTerm: string, credentials: any, limit: number): Promise<any[]> { return []; }
}

export function getAdapter(crmType: string): CRMAdapter {
    switch (crmType) {
        case 'pipedrive':
            return new PipedriveAdapter();
        default:
            return new PlaceholderAdapter(crmType);
    }
}
