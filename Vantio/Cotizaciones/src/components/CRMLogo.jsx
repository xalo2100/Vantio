import React from 'react';

/**
 * CRM Logo Component
 * Displays brand logos for different CRM systems
 */
const CRMLogo = ({ crmType, size = 32 }) => {
    const logos = {
        pipedrive: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="#00A550" />
                    <path d="M12 10h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v4h-2V10zm2 6h2c1.1 0 2-.9 2-2s-.9-2-2-2h-2v4z" fill="white" />
                </svg>
            </div>
        ),
        hubspot: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#FF7A59" />
                    <path d="M20 12v-2c0-.6-.4-1-1-1h-2V7c0-.6-.4-1-1-1s-1 .4-1 1v2h-2c-.6 0-1 .4-1 1v2h-2c-.6 0-1 .4-1 1v6c0 .6.4 1 1 1h10c.6 0 1-.4 1-1v-6c0-.6-.4-1-1-1h-2zm0 6h-8v-4h8v4z" fill="white" />
                </svg>
            </div>
        ),
        odoo: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#714B67" />
                    <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" fill="none" />
                </svg>
            </div>
        ),
        defontana: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#0066CC" />
                    <text x="16" y="20" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle">D</text>
                </svg>
            </div>
        ),
        goldmine: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#FFD700" />
                    <path d="M16 8l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z" fill="#333" />
                </svg>
            </div>
        ),
        upnify: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#4A90E2" />
                    <path d="M12 20v-8l4 4 4-4v8h-8z" fill="white" />
                </svg>
            </div>
        ),
        crmchile: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#D52B1E" />
                    <path d="M16 10l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="white" />
                </svg>
            </div>
        ),
        simply: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#6B7280" />
                    <circle cx="16" cy="16" r="4" fill="white" />
                </svg>
            </div>
        ),
        sap: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="4" fill="#0FAAFF" />
                    <text x="16" y="21" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">SAP</text>
                </svg>
            </div>
        ),
        datacrm: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#6366F1" />
                    <rect x="10" y="12" width="3" height="8" fill="white" />
                    <rect x="14.5" y="10" width="3" height="10" fill="white" />
                    <rect x="19" y="14" width="3" height="6" fill="white" />
                </svg>
            </div>
        ),
        netsuite: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#1E3A8A" />
                    <path d="M8 16l8-6v4h8l-8 6v-4H8z" fill="white" />
                </svg>
            </div>
        ),
        siebel: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#C74634" />
                    <rect x="8" y="8" width="16" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
                </svg>
            </div>
        ),
        salesforce: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#00A1E0" />
                    <path d="M12 14c0-1.1.9-2 2-2 .5 0 1 .2 1.4.6.5-.9 1.5-1.6 2.6-1.6 1.7 0 3 1.3 3 3 0 .3 0 .5-.1.8 1 .3 1.7 1.2 1.7 2.2 0 1.3-1.1 2.4-2.4 2.4H14c-1.1 0-2-.9-2-2 0-.8.5-1.5 1.2-1.8-.1-.2-.2-.4-.2-.6z" fill="white" />
                </svg>
            </div>
        ),
        zoho: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#E42527" />
                    <text x="16" y="21" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle">Z</text>
                </svg>
            </div>
        ),
        bitrix24: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#2FC6F6" />
                    <path d="M10 12h4v8h-4zm6-2h4v10h-4zm6 4h4v6h-4z" fill="white" />
                </svg>
            </div>
        ),
        freshsales: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#00C48C" />
                    <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2" fill="none" />
                    <circle cx="16" cy="16" r="2" fill="white" />
                </svg>
            </div>
        ),
        dynamics365: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#002050" />
                    <rect x="8" y="8" width="6" height="6" fill="#00BCF2" />
                    <rect x="18" y="8" width="6" height="6" fill="#00BCF2" />
                    <rect x="8" y="18" width="6" height="6" fill="#00BCF2" />
                    <rect x="18" y="18" width="6" height="6" fill="#00BCF2" />
                </svg>
            </div>
        ),
        sugarcrm: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#E61E28" />
                    <text x="16" y="21" fontSize="14" fontWeight="bold" fill="white" textAnchor="middle">S</text>
                </svg>
            </div>
        ),
        insightly: (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="6" fill="#5C6AC4" />
                    <circle cx="16" cy="16" r="4" fill="white" />
                    <circle cx="16" cy="16" r="2" fill="#5C6AC4" />
                </svg>
            </div>
        )
    };

    return logos[crmType] || (
        <div className="flex items-center justify-center bg-gray-200 rounded" style={{ width: size, height: size }}>
            <span className="text-gray-500 text-xs">?</span>
        </div>
    );
};

export default CRMLogo;
