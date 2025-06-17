// backupBuckets.js
// Script para hacer backup de los buckets "cotizaciones" y "asistencias" desde Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ✅ CONFIGURA tus claves reales de Supabase aquí:
const SUPABASE_URL = "https://mwwffgzjajkjshhcznen.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2ZmZ3pqYWpranNoaGN6bmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTY4MjIsImV4cCI6MjA2NDUzMjgyMn0.gWwMEHexhd9L3VE6E5BR_SatNhENuNWcSfIwGt0zdXU"; // ⚠️ Solo usar en entorno seguro (nunca frontend)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Buckets a respaldar
const BUCKETS = ['cotizaciones', 'asistencias'];

const downloadBucket = async (bucket) => {
  console.log(`📦 Descargando archivos del bucket: ${bucket}`);

  const { data: fileList, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });

  if (error) {
    console.error(`❌ Error al listar archivos en ${bucket}:`, error.message);
    return;
  }

  const baseDir = path.join(__dirname, 'backup', bucket);
  fs.mkdirSync(baseDir, { recursive: true });

  for (const file of fileList) {
    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(file.name);

    if (downloadError) {
      console.error(`⚠️ Error al descargar ${file.name}:`, downloadError.message);
      continue;
    }

    const filePath = path.join(baseDir, file.name);
    const buffer = Buffer.from(await fileData.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Guardado: ${filePath}`);
  }
};

const backupAllBuckets = async () => {
  for (const bucket of BUCKETS) {
    await downloadBucket(bucket);
  }
  console.log('✅ Copia de seguridad completada.');
};

backupAllBuckets();
