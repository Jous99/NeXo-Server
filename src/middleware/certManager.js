const fs = require('fs');
const path = require('path');

/**
 * Eden Network - SSL Manager (Corregido)
 * Este archivo busca la carpeta /certs en la raíz del proyecto.
 */
const certManager = {
    getOptions: () => {
        try {
            // Usamos process.cwd() para ir directo a la carpeta raíz del proyecto (Server/)
            const rootDir = process.cwd();
            const certsDir = path.join(rootDir, 'certs');

            // Nombres de archivo estandarizados
            const keyPath = path.join(certsDir, 'server.key');
            const certPath = path.join(certsDir, 'server.crt');

            // Diagnóstico rápido por consola
            console.log('--------------------------------------------------');
            console.log('🔍 [CertManager] Buscando certificados en:');
            console.log(`📂 Directorio: ${certsDir}`);

            // Verificamos si los archivos existen
            if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
                // Si no existen, listamos lo que sí hay en esa carpeta para ayudarte a depurar
                const filesFound = fs.existsSync(certsDir) ? fs.readdirSync(certsDir) : 'Carpeta no encontrada';
                
                console.error('❌ ERROR: Archivos no encontrados.');
                console.error(`Contenido actual de /certs: ${JSON.stringify(filesFound)}`);
                console.error('Asegúrate de que se llamen: server.key y server.crt');
                
                throw new Error('SSL_FILES_MISSING');
            }

            console.log('✅ [CertManager] Archivos encontrados y cargados.');
            console.log('--------------------------------------------------');

            return {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
        } catch (error) {
            if (error.message !== 'SSL_FILES_MISSING') {
                console.error('❌ [Critical Error]:', error.message);
            }
            process.exit(1);
        }
    }
};

module.exports = certManager;