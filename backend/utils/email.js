const nodemailer = require('nodemailer');

const enviarCorreoRespaldo = async (emailDestino, token) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("No config de EMAIL, saltando envío por correo.");
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail', // or configured host/port
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const urlDescarga = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/descarga.html?token=${token}`;

        const mailOptions = {
            from: `"DOMINA LA IA" <${process.env.EMAIL_USER}>`,
            to: emailDestino,
            subject: 'Tu acceso a DOMINA LA INTELIGENCIA ARTIFICIAL',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                    <h2>¡Gracias por tu compra!</h2>
                    <p>Como prometimos, aquí tienes el enlace único para descargar tu Manual Hacker de IA.</p>
                    <p style="color: red; font-size: 12px;">Importante: Este enlace caducará en 24 horas y solo se puede usar una vez.</p>
                    <br>
                    <a href="${urlDescarga}" style="padding: 12px 24px; background: #9d4edd; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Descargar PDF
                    </a>
                    <br><br>
                    <p>Si tienes problemas, responde a este correo.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Correo enviado exitosamente a: ${emailDestino}`);
    } catch (error) {
        console.error("❌ Error enviando correo:", error);
    }
};

module.exports = { enviarCorreoRespaldo };
