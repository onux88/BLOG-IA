const mongoose = require('mongoose');

const pagoCryptoSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    payment_id: {
        type: String,
        required: true,
        unique: true
    },
    order_id: {
        type: String,
        required: true
    },
    estado: {
        type: String,
        default: 'waiting' // waiting, confirming, confirmed, finished, failed, expired
    },
    monto_fiat: {
        type: Number,
        default: 19.99
    },
    monto_crypto: {
        type: Number
    },
    moneda_crypto: {
        type: String,
        default: 'usdtbsc'
    },
    pay_address: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('PagoCrypto', pagoCryptoSchema);
