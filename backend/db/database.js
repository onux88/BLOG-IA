const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // En producción el proceso .env debe cargar MONGODB_URI
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/blog_ia_ventas');

        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
