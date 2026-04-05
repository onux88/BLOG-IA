const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const path = require('path');
const fs = require('fs');

router.get('/', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send('<h1>Error: No se proporcionó ningún token.</h1>');
        }

        // Buscar el token en DB
        const tokenRecord = await Token.findOne({ token });

        if (!tokenRecord) {
            return res.status(404).send('<h1>Error: El enlace de descarga no existe o es inválido.</h1>');
        }

        // Revisar si ya fue usado
        if (tokenRecord.usado) {
            return res.status(403).send('<h1>Error: Este enlace ya fue utilizado para descargar el archivo.</h1><p>Los enlaces son de un solo uso por seguridad.</p>');
        }

        // Revisar si expiró
        if (new Date() > tokenRecord.expira) {
            return res.status(403).send('<h1>Error: Este enlace ha expirado.</h1><p>El enlace es válido únicamente por 24 horas tras la compra.</p>');
        }

        // 🟢 Token Válido - Proceder con la descarga
        const rutaPdf = path.join(__dirname, '../../private/pdf/domina-la-inteligencia-artificial.pdf');

        // Validar que el archivo exista en disco
        if (!fs.existsSync(rutaPdf)) {
            console.error('El archivo PDF no existe en la ruta:', rutaPdf);
            return res.status(500).send('<h1>Error: El archivo no está disponible temporalmente. Contacte a soporte.</h1>');
        }

        // Marcar como usado ANTES o AL MISMO TIEMPO que se descarga
        tokenRecord.usado = true;
        await tokenRecord.save();

        // Enviar archivo
        res.download(rutaPdf, 'Domina_La_Inteligencia_Artificial.pdf', (err) => {
            if (err) {
                console.error("Error al enviar archivo:", err);
            }
        });

    } catch (error) {
        console.error("Error en ruta descarga: ", error);
        res.status(500).send('<h1>Error interno del servidor al procesar la descarga.</h1>');
    }
});

module.exports = router;
