const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    usado: {
        type: Boolean,
        default: false
    },
    expira: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        default: 'cliente@email.com' // Si tu checkout no requiere email, o si puedes extraerlo del webhook
    },
    paymentId: {
        type: String,
        required: true // Para mantener una traza de qué pago generó este token
    }
}, { timestamps: true });

module.exports = mongoose.model('Token', tokenSchema);
