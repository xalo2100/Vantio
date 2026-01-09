const fetch = require('node-fetch');

const apiToken = '953ec1694bf55a1532febb12f974026da471cc4c'; // From previous diagnosis
const companyDomain = 'alfapack-sandbox'; // Need to confirm this

async function testSync() {
    const baseUrl = `https://alfapack.pipedrive.com/api/v1`; // Trying real domain
    const token = apiToken;

    const clientData = {
        name: 'Test Person 2',
        email: 'test2@example.com',
        company: 'Test Org 2',
        phone: '+56912345678',
        rut: '12.345.678-9',
        city: 'Santiago',
        address: 'Av. Test 123'
    };

    console.log('--- Testing Pipedrive Sync ---');

    // 1. Search Org
    console.log(`Searching for Org: ${clientData.company}`);
    const searchRes = await fetch(`${baseUrl}/organizations/search?term=${encodeURIComponent(clientData.company)}&api_token=${token}`);
    const searchData = await searchRes.json();
    console.log('Search Data:', JSON.stringify(searchData, null, 2));

    let orgId = null;
    if (searchData.success && searchData.data?.items?.length > 0) {
        orgId = searchData.data.items[0].item.id;
        console.log(`Found Org ID: ${orgId}`);
    } else {
        console.log('Creating Org...');
        const createRes = await fetch(`${baseUrl}/organizations?api_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: clientData.company })
        });
        const createData = await createRes.json();
        if (createData.success) {
            orgId = createData.data.id;
            console.log(`Created Org ID: ${orgId}`);
        } else {
            console.error('Create Org Failed:', createData);
        }
    }

    // 2. Create Person
    if (orgId) {
        console.log('Creating Person linked to Org...');
        const personRes = await fetch(`${baseUrl}/persons?api_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: clientData.name,
                email: [{ value: clientData.email, primary: true, label: 'work' }],
                org_id: orgId
            })
        });
        const personData = await personRes.json();
        if (personData.success) {
            console.log(`Created Person ID: ${personData.data.id} linked to Org ${orgId}`);
        } else {
            console.error('Create Person Failed:', personData);
        }
    }
}

testSync();
