const selfsigned = require('selfsigned');
const fs = require('fs');

try {
    console.log("Generando archivos...");
    const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365 });
    fs.writeFileSync('key.pem', pems.private);
    fs.writeFileSync('cert.pem', pems.cert);
    console.log("✅ ARCHIVOS CREADOS: key.pem y cert.pem aparecen ahora en tu carpeta.");
} catch (e) {
    console.error("Error:", e);
}