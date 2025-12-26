import type { CRMAdapter, CRMSettings } from '../crm-types.ts';
import { PipedriveAdapter } from './pipedrive.ts';
// Future imports
// import { HubSpotAdapter } from './hubspot.ts';
// import { SalesforceAdapter } from './salesforce.ts';
// import { ZohoAdapter } from './zoho.ts';
// import { DefontanaAdapter } from './defontana.ts';
// import { Bitrix24Adapter } from './bitrix24.ts';
// import { FreshsalesAdapter } from './freshsales.ts';
// import { Dynamics365Adapter } from './dynamics365.ts';
// import { SugarCRMAdapter } from './sugarcrm.ts';
// import { InsightlyAdapter } from './insightly.ts';

export function getCRMAdapter(crmType: string, settings: CRMSettings): CRMAdapter {
    switch (crmType) {
        case 'pipedrive':
            return new PipedriveAdapter(settings);

        // Future CRM implementations
        // case 'hubspot':
        //     return new HubSpotAdapter(settings);
        // case 'salesforce':
        //     return new SalesforceAdapter(settings);
        // case 'zoho':
        //     return new ZohoAdapter(settings);
        // case 'defontana':
        //     return new DefontanaAdapter(settings);
        // case 'bitrix24':
        //     return new Bitrix24Adapter(settings);
        // case 'freshsales':
        //     return new FreshsalesAdapter(settings);
        // case 'dynamics365':
        //     return new Dynamics365Adapter(settings);
        // case 'sugarcrm':
        //     return new SugarCRMAdapter(settings);
        // case 'insightly':
        //     return new InsightlyAdapter(settings);

        default:
            throw new Error(`Unsupported CRM: ${crmType}. Currently only Pipedrive is supported.`);
    }
}

export const SUPPORTED_CRMS = [
    { value: 'pipedrive', label: 'Pipedrive', status: 'active' },
    { value: 'hubspot', label: 'HubSpot', status: 'coming_soon' },
    { value: 'salesforce', label: 'Salesforce', status: 'coming_soon' },
    { value: 'zoho', label: 'Zoho CRM', status: 'coming_soon' },
    { value: 'defontana', label: 'Defontana 🇨🇱', status: 'coming_soon' },
    { value: 'goldmine', label: 'GoldMine', status: 'coming_soon' },
    { value: 'bitrix24', label: 'Bitrix24', status: 'coming_soon' },
    { value: 'freshsales', label: 'Freshsales', status: 'coming_soon' },
    { value: 'dynamics365', label: 'Microsoft Dynamics 365', status: 'coming_soon' },
    { value: 'sugarcrm', label: 'SugarCRM', status: 'coming_soon' },
    { value: 'insightly', label: 'Insightly', status: 'coming_soon' },
];

