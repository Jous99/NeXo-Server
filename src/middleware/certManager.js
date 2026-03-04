const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

/**
 * GESTOR DE CERTIFICADOS EDEN
 * Genera una identidad SSL única y persistente para el servidor.
 */

// Definimos las rutas de almacenamiento
const CERTS_DIR = path.join(__dirname, '../../certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.cert');
const PUBLIC_CRT = path.join(CERTS_DIR, 'INSTALAR_EN_WINDOWS.crt');

function getOrCreate() {
    // 1. Verificar si la carpeta /certs existe, si no, crearla
    if (!fs.existsSync(CERTS_DIR)) {
        fs.mkdirSync(CERTS_DIR, { recursive: true });
    }

    // 2. Si los archivos ya existen, cargarlos y devolverlos
    if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
        console.log("📂 [CertManager] Cargando identidad SSL persistente...");
        return {
            key: fs.readFileSync(KEY_PATH, 'utf8'),
            cert: fs.readFileSync(CERT_PATH, 'utf8')
        };
    }

    // 3. Si no existen, generar una nueva pareja de clave y certificado
    console.log("🛠️  [CertManager] Generando nuevos certificados por primera vez...");
    
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + Date.now(); // Serial único basado en tiempo
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // 10 años

    // Atributos de la entidad
    const attrs = [
        { name: 'commonName', value: 'accounts-api-lp1.raptor.network' },
        { name: 'organizationName', value: 'Eden Network' },
        { name: 'organizationalUnitName', value: 'Eden Infrastructure' },
        { name: 'countryName', value: 'ES' }
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Extensiones críticas para validación de navegadores modernos y emuladores
    cert.setExtensions([
        { name: 'basicConstraints', cA: true },
        { 
            name: 'keyUsage', 
            keyCertSign: true, 
            digitalSignature: true, 
            nonRepudiation: true, 
            keyEncipherment: true, 
            dataEncipherment: true 
        },
        {
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: 'accounts-api-lp1.raptor.network' },
                { type: 2, value: 'config-lp1.raptor.network' },
                { type: 2, value: 'localhost' },
                { type: 7, ip: '127.0.0.1' }
            ]
        }
    ]);

    // Firmar el certificado
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Convertir a PEM
    const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
    const pemCert = forge.pki.certificateToPem(cert);

    // Guardar archivos físicamente
    fs.writeFileSync(KEY_PATH, pemKey);
    fs.writeFileSync(CERT_PATH, pemCert);
    fs.writeFileSync(PUBLIC_CRT, pemCert); // Este es el que el usuario debe instalar

    console.log(`✅ [CertManager] Nueva identidad creada con éxito.`);
    console.log(`👉 Archivo para Windows: ${PUBLIC_CRT}`);

    return { key: pemKey, cert: pemCert };
}

module.exports = { getOrCreate };