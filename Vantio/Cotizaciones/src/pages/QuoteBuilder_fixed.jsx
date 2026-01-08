                </div >
            </div >
    {/* Cierre del grid principal */ }
            </div >
        </div >

    {/* Client Creation Modal */ }
    < CreateClientModal
isOpen = { showCreateClientModal }
onClose = {() => setShowCreateClientModal(false)}
organizationId = { profile?.organization_id }
sellerEmail = { profile?.email }
onClientCreated = {(client) => {
    setQuoteData(prev => ({
        ...prev,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone || '',
        clientRut: client.rut || '',
        clientCity: client.city || '',
        clientAddress: client.address || '',
        companyName: client.company || client.name
    }));
    setClientSearchTerm('');
}}
        />
    </div >
    );
};

export default QuoteBuilder;
