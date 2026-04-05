const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Token = require('../models/Token');
const { enviarCorreoRespaldo } = require('../utils/email');

// MERCADOPAGO CONFIG
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-DEMO' });

// ==========================================
// 1. /crear-pago
// ==========================================
router.post('/crear-pago', async (req, res) => {
    try {
        const { metodo } = req.body;

        if (metodo === 'mercadopago') {
            const preference = new Preference(client);
            
            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: 'pdf-ia-premium',
                            title: 'DOMINA LA INTELIGENCIA ARTIFICIAL',
                            description: 'Manual Completo en PDF',
                            quantity: 1,
                            unit_price: 19.99,
                            currency_id: 'USD'
                        }
                    ],
                    back_urls: {
                        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gracias.html`,
                        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=pago`,
                        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=pending`
                    },
                    auto_return: "approved",
                    notification_url: `${process.env.BACKEND_URL || 'https://tu-backend.render.com'}/api/pagos/webhook/mercadopago`
                }
            });

            return res.status(200).json({ url: response.init_point });
        } 
        
        else if (metodo === 'paypal') {
            // Ejemplo de llamada a la API REST de PayPal (Para producción requiere OAuth2 Token)
            // Se asume obtención del Bearer token (Simplificado aquí por legibilidad)
            const requestBody = {
                intent: "CAPTURE",
                purchase_units: [
                    {
                        reference_id: "pdf-ia-premium",
                        amount: {
                            currency_code: "USD",
                            value: "19.99"
                        },
                        description: "DOMINA LA INTELIGENCIA ARTIFICIAL"
                    }
                ],
                application_context: {
                    return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gracias.html`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?error=pago`
                }
            };

            const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
            const paypalSecret = process.env.PAYPAL_SECRET || '';
            const paypalAuthBasic = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');

            // Fetch a PayPal API
            const paypalResponse = await fetch(`${process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${paypalAuthBasic}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!paypalResponse.ok) throw new Error("Error creando orden PayPal");
            
            const paypalData = await paypalResponse.json();
            const urlCheckout = paypalData.links.find(link => link.rel === "approve").href;

            return res.status(200).json({ url: urlCheckout });
        }

        else {
            return res.status(400).json({ error: "Método de pago no válido" });
        }

    } catch (error) {
        console.error("Error al crear pago:", error);
        res.status(500).json({ error: "Error en el servidor al generar Checkout." });
    }
});

// ==========================================
// 2. /webhook/mercadopago
// ==========================================
router.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;

        // Mercado Pago avisa de "payment"
        if (type === 'payment') {
            const paymentId = data.id;
            
            // Instanciar y validar el pago
            const paymentConfig = new Payment(client);
            const pagoNotificado = await paymentConfig.get({ id: paymentId });

            if (pagoNotificado.status === 'approved') {
                // Generar Token
                await generarTokenPDF(pagoNotificado.payer?.email || 'cliente@desconocido.com', `mp-${paymentId}`);
            }
        }

        // Siempre devolver 200 inmediatamente a MercadoPago
        res.status(200).send("OK");

    } catch (error) {
        console.error("Error en webhook de MP:", error);
        res.status(500).send("Error");
    }
});

// ==========================================
// 3. /webhook/paypal
// ==========================================
router.post('/webhook/paypal', async (req, res) => {
    try {
        const eventType = req.body.event_type;

        if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            const resource = req.body.resource;
            const orderId = resource.id;
            const status = resource.status;
            
            // Validar estado COMPLETED
            if (status === 'COMPLETED') {
                const email = resource.payer?.email_address || 'cliente@desconocido.com';
                await generarTokenPDF(email, `pp-${orderId}`);
            }
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Error en webhook paypal:", error);
        res.status(500).send("Error");
    }
});



// ==========================================
// UTILIDADES: GENERACIÓN DE TOKEN OBLIGATORIA
// ==========================================
async function generarTokenPDF(email, paymentId) {
    try {
        // Validar si este pago ya generó un token (evita duplicidad por webhooks repetidos)
        const tokenExistente = await Token.findOne({ paymentId });
        if (tokenExistente) {
            console.log(`El pago ${paymentId} ya generó un token previamente.`);
            return;
        }

        // Crear token: crypto.randomBytes(16).toString('hex')
        const rawToken = crypto.randomBytes(16).toString('hex');
        
        // Expiración 24h: current timestamp + 24 horas (en milisegundos)
        const expiracion = new Date();
        expiracion.setHours(expiracion.getHours() + 24);

        const nuevoToken = new Token({
            token: rawToken,
            usado: false,
            expira: expiracion,
            email: email,
            paymentId: paymentId
        });

        await nuevoToken.save();
        console.log(`✅ Token de descarga generado exitosamente. Token: ${rawToken}`);

        // Opcional: Enviar email (no bloquea la operación si falla)
        if (email !== 'cliente@desconocido.com') {
            enviarCorreoRespaldo(email, rawToken);
        }

    } catch (error) {
        console.error("❌ Error generando token local:", error);
    }
}

module.exports = router;
