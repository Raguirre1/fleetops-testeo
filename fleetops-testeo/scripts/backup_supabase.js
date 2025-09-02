const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');

// ---- CONFIGURA TUS DATOS AQUÍ ----
const SUPABASE_URL = 'https://mwwffgzjajkjshhcznen.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2ZmZ3pqYWpranNoaGN6bmVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk1NjgyMiwiZXhwIjoyMDY0NTMyODIyfQ.Z033ss4JJUhSXP_rv9YgE3qVVJmceKtOPosagfweXGc'; // <-- PON TU KEY AQUI
const BUCKET = 'cotizaciones'; // Bucket a respaldar
const TABLA = 'cotizaciones_proveedor'; // Tabla a exportar
const BARCO_ID = null; // Filtra por barco si quieres
const OUTPUT_DIR = './backup';

// --- FUNCIONES ---
async function backupTabla() {
  const url = `${SUPABASE_URL}/rest/v1/${TABLA}?select=*`;
  const headers = {
    apiKey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  let urlFiltrada = url;
  if (BARCO_ID) {
    urlFiltrada += `&buque_id=eq.${BARCO_ID}`;
  }
  const res = await fetch(urlFiltrada, { headers });
  const data = await res.json();
  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeJson(path.join(OUTPUT_DIR, `${TABLA}.json`), data, { spaces: 2 });
  console.log(`Tabla ${TABLA} exportada (${Array.isArray(data) ? data.length : 0} registros).`);
  return data;
}

async function backupBucket() {
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`;
  const headers = {
    apiKey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(storageUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix: "" }) // Necesario para buckets privados
  });
  const files = await res.json();
  console.log("Respuesta de archivos:", files); // <-- añade esto aquí

  if (!Array.isArray(files)) {
    console.error("Error al listar archivos:", files);
    return;
  }
  await fs.ensureDir(path.join(OUTPUT_DIR, BUCKET));

  for (const file of files) {
    // Solo descargar archivos (ignora "folders" que terminan en '/')
    if (file.name && !file.name.endsWith('/')) {
      const filePath = file.name;
      const downloadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(filePath)}`;
      const r = await fetch(downloadUrl, { headers });
      if (r.ok) {
        const localFile = path.join(OUTPUT_DIR, BUCKET, filePath);
        await fs.ensureDir(path.dirname(localFile));
        const buffer = await r.buffer();
        await fs.writeFile(localFile, buffer);
        console.log(`Archivo ${filePath} descargado.`);
      } else {
        console.error(`Error descargando ${filePath}:`, r.statusText);
      }
    }
  }
}

(async () => {
  try {
    await backupTabla();
    await backupBucket();
    console.log('Backup completado con éxito.');
  } catch (err) {
    console.error('Error en el backup:', err);
  }
})();
