const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
// Middleware para procesar JSON (esencial para recibir data de webhooks)
app.use(express.json());

// ------------------------------------------------------------------
// 💾 BASE DE DATOS EN MEMORIA
// (Nota: Para producción en un entorno serverless o si reinicias 
// el servidor frecuentemente, usa Redis, MongoDB, o un archivo JSON)
// ------------------------------------------------------------------
const tokensDB = new Map();

// ------------------------------------------------------------------
// ⚙️ CONFIGURACIÓN
// ------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
// Dominio base, cambia a tu dominio real (Ej: https://tusitio.com)
const DOMAIN = `http://localhost:${PORT}`;
// Ruta simulada del archivo a descargar
const PDF_FILE_PATH = path.join(__dirname, 'producto.pdf');

// ==================================================================
// 1️⃣ ENDPOINT DEL WEBHOOK (RECIBE EL PAGO Y GENERA EL TOKEN)
// ==================================================================
app.post('/webhook', (req, res) => {
    // 1. Simulación de los datos recibidos por MercadoPago o PayPal
    const payload = req.body;

    // Verificamos que el pago esté aprobado (ajustar según pasarela)
    const isPaymentApproved = payload.status === 'approved' || payload.estado === 'pagado';
    const clientEmail = payload.email || 'comprador@anonimo.com';

    if (!isPaymentApproved) {
        // Responder `200` o `400` según lo exija la pasarela si falla la validación
        return res.status(400).json({ error: 'Pago no completado o en estado pendiente' });
    }

    // 2. GENERACIÓN DEL TOKEN SEGURO
    // randomBytes(16) genera 16 bytes aleatorios, toString("hex") los convierte a 32 caracteres
    const secureToken = crypto.randomBytes(16).toString("hex");

    // 3. ESTRUCTURA Y FECHA DE EXPIRACIÓN (24 horas = 24 * 60 * 60 * 1000 ms)
    const expirationTime = Date.now() + (24 * 60 * 60 * 1000);

    const tokenData = {
        token: secureToken,
        usado: false,
        expira: expirationTime,
        email: clientEmail
    };

    // 4. GUARDAR TOKEN EN "BASE DE DATOS"
    tokensDB.set(secureToken, tokenData);

    // 5. CREACIÓN DEL LINK ÚNICO
    const downloadLink = `${DOMAIN}/descargar?token=${secureToken}`;

    // 🔥 EXTRAS: Imprimir en consola y preparar para enviar email
    console.log('\n✅ [WEBHOOK] NUEVO PAGO CONFIRMADO');
    console.log(`📧 Cliente: ${clientEmail}`);
    console.log(`🔗 Link de descarga: ${downloadLink}`);
    console.log(`⏳ Expira en: 24 horas\n`);

    // Retorna un JSON de respuesta notificando éxito a la pasarela
    return res.status(200).json({
        success: true,
        message: 'Pago procesado exitosamente y link generado',
        downloadLink: downloadLink, // Este link lo puedes mandar por email a través de Nodemailer
        data: tokenData
    });
});

// ==================================================================
// 2️⃣ ENDPOINT DE DESCARGA (VALIDA Y ENTREGA EL PDF OCULTO)
// ==================================================================
app.get('/descargar', (req, res) => {
    const { token } = req.query;

    // Validación 1: Verificar que el usuario envió un token
    if (!token) {
        return res.status(400).send('<h1>Error 400</h1><p>Token no proporcionado o enlace inválido.</p>');
    }

    // Validación 2: Verificar que el token exista en la base de datos
    const tokenData = tokensDB.get(token);
    if (!tokenData) {
        return res.status(404).send('<h1>Error 404</h1><p>El enlace de descarga es inválido o no existe.</p>');
    }

    // Validación 3: Verificar que NO haya sido usado
    if (tokenData.usado) {
        return res.status(403).send('<h1>Link ya utilizado</h1><p>Por seguridad, este enlace solo se permite usar 1 vez para iniciar la descarga.</p>');
    }

    // Validación 4: Verificar expiración (24 horas)
    if (Date.now() > tokenData.expira) {
        return res.status(403).send('<h1>Link Expirado</h1><p>Este enlace ha excedido las 24 horas permitidas. Por favor solicita uno nuevo.</p>');
    }

    // ==============================================================
    // TODAS LAS VALIDACIONES PASARON: ENTREGAR EL ARCHIVO SEGURO
    // ==============================================================

    // MARCAR COMO USADO (Esto evita reutilización inmediata por bots o compartir enlaces)
    tokenData.usado = true;
    tokensDB.set(token, tokenData);

    console.log(`\n📥 [DESCARGA] El token ${token} ha sido CONSUMIDO por el cliente ${tokenData.email}.\n`);

    // ENTREGAR PDF DE FORMA SEGURA (Sin exponer la URL real del archivo)
    if (fs.existsSync(PDF_FILE_PATH)) {
        // Envia el archivo con res.download para forzar la descarga en el navegador
        res.download(PDF_FILE_PATH, 'Ebook_Premium.pdf', (err) => {
            if (err) {
                console.error("Error interrumpiendo descarga:", err);
            }
        });
    } else {
        // FALLBACK: Si no hay un PDF real todavía, forzamos un archivo de texto generico de prueba
        res.setHeader('Content-disposition', 'attachment; filename=Producto_Digital_Test.txt');
        res.setHeader('Content-type', 'text/plain');
        res.send(`Este es el contenido de tu producto digital (Modo Prueba).\n\nPara enviar tu PDF real, coloca el archivo "producto.pdf" junto a server.js.`);
    }
});

// ==================================================================
// 🚀 INICIAR SERVIDOR
// ==================================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor backend operando en puerto ${PORT}`);
    console.log(`📡 URL Webhook: ${DOMAIN}/webhook`);
    console.log(`🔐 URL Descargas: ${DOMAIN}/descargar`);

    console.log(`\n👇 PARA PROBAR EL WEBHOOK, CORRE ESTE COMANDO EN OTRA CONSOLA:`);
    console.log(`curl -X POST ${DOMAIN}/webhook -H "Content-Type: application/json" -d "{\\"status\\":\\"approved\\", \\"email\\":\\"test@cliente.com\\"}"`);
});
