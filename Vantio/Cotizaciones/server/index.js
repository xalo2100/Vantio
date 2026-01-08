const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public' (donde irá el build de Vite)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint de prueba / Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Ejemplo de endpoint seguro (si necesitas ocultar claves)
// app.get('/api/secure-data', (req, res) => {
//     // Aquí podrías usar process.env.SUPABASE_SERVICE_ROLE_KEY
//     res.json({ secret: 'data' });
// });

// Manejo de SPA (Single Page Application)
// Cualquier ruta no reconocida por la API se redirige al index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
