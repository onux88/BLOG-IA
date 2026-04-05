require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Conexión a Base de Datos
connectDB();

// 2. Middlewares
// CORS permite que el frontend hable con este servidor si están en dominios distintos
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(morgan('dev'));
app.use(express.json()); // Necesario para parsear el req.body de payloads y webhooks

// 3. Servir frontend estáticamente (OPCIONAL y ÚTIL para pruebas o un servidor monolítico)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// 4. Rutas de la API (Backend seguro)
app.use('/api/pagos', require('./routes/pagos.routes'));
app.use('/api/descargar', require('./routes/descarga.routes'));

// 5. Manejo de Rutas no encontradas (Frontend Fallback o API Error)
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({ error: 'Endpoint no encontrado' });
    } else {
        res.sendFile(path.join(frontendPath, 'index.html'));
    }
});

// 6. Iniciar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
