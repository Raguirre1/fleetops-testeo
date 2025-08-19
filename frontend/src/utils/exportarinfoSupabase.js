// frontend/src/util/exportarinfoSupabase.js
import { supabase } from '../supabaseClient';
import * as XLSX from "xlsx";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// helpers
const SAFE = /[/\\?%*:|"<>]/g;
const safe = (s) => (s ?? '').toString().replace(SAFE, '-');
const pct  = (x) => Math.max(0, Math.min(100, Math.round(x || 0)));

// ========================
//  Exportar BUQUE (pedidos + asistencias) con progreso
//  Callbacks opcionales: onStage(text), onProgress({done,total,percent,etaSeconds}), onZipProgress(percent)
// ========================
export async function exportarPedidosBuque(
  buqueId,
  { onStage, onProgress, onZipProgress } = {}
) {
  const emitStage = (t) => { try { onStage && onStage(t); } catch {} };
  const emitProg  = (o) => { try { onProgress && onProgress(o); } catch {} };
  const emitZip   = (p) => { try { onZipProgress && onZipProgress(p); } catch {} };

  const zip = new JSZip();

  emitStage("Obteniendo datos...");

  // ----- PEDIDOS -----
  const { data: pedidos, error } = await supabase
    .from('solicitudes_compra')
    .select('*')
    .eq('buque_id', buqueId);

  if (error) {
    alert('Error al obtener pedidos: ' + error.message);
    return;
  }

  if (pedidos && pedidos.length > 0) {
    try {
      const ws = XLSX.utils.json_to_sheet(pedidos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      zip.file('Pedidos.xlsx', excelBuffer);
    } catch (e) {
      alert('Error generando Excel: ' + e.message);
    }
  }

  // ----- ASISTENCIAS -----
  const { data: asistencias, error: errorAsist } = await supabase
    .from('solicitudes_asistencia') // nombre de tu tabla
    .select('*')
    .eq('buque_id', buqueId);

  if (errorAsist) {
    alert('Error al obtener asistencias: ' + errorAsist.message);
  }

  if (asistencias && asistencias.length > 0) {
    try {
      const wsA = XLSX.utils.json_to_sheet(asistencias);
      const wbA = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbA, wsA, 'Asistencias');
      const excelBufferA = XLSX.write(wbA, { bookType: 'xlsx', type: 'array' });
      zip.file('Asistencias.xlsx', excelBufferA);
    } catch (e) {
      alert('Error generando Excel de asistencias: ' + e.message);
    }
  }

  // ========= PRE-LISTADO PARA PROGRESO =========
  emitStage("Listando archivos...");
  const descargas = []; // { bucket, ruta, zipRuta }

  // Archivos de cada pedido (bucket cotizaciones) — MISMA LÓGICA QUE YA TENÍAS
  for (const pedido of pedidos || []) {
    const numeroPedido = pedido.numero_pedido || pedido.numeropedido;
    if (!numeroPedido) continue;

    let filesRes = await supabase
      .storage
      .from('cotizaciones')
      .list(`${numeroPedido}/`, { limit: 100 });

    const files = (filesRes?.data || []);
    const archivosDirectos = files.filter(f => f?.name && f.name.indexOf('.') > -1);
    const carpetas = files.filter(f => f?.name && !f.name.includes('.'));

    let archivosSubcarpetas = [];
    for (const carpeta of carpetas) {
      let subFilesRes = await supabase
        .storage
        .from('cotizaciones')
        .list(`${numeroPedido}/${carpeta.name}/`, { limit: 100 });
      const subArchivos = (subFilesRes?.data || []).filter(f => f?.name && f.name.indexOf('.') > -1);
      subArchivos.forEach(f => archivosSubcarpetas.push({
        ...f,
        ruta: `${numeroPedido}/${carpeta.name}/${f.name}`
      }));
    }

    const todosArchivos = [
      ...archivosDirectos.map(f => ({ ...f, ruta: `${numeroPedido}/${f.name}` })),
      ...archivosSubcarpetas
    ];

    for (const file of todosArchivos) {
      descargas.push({ bucket: 'cotizaciones', ruta: file.ruta, zipRuta: file.ruta });
    }
  }

  // Archivos de cada asistencia (bucket asistencias) — usando numero_ate
  for (const a of asistencias || []) {
    const numeroAsistencia =
      a.numero_ate ||
      a.numero_asistencia ||
      a.numeroAsistencia ||
      a.numero ||
      a.numeropedido;
    if (!numeroAsistencia) continue;

    let filesRes = await supabase
      .storage
      .from('asistencias')
      .list(`${numeroAsistencia}/`, { limit: 100 });

    const files = (filesRes?.data || []);
    const archivosDirectos = files.filter(f => f?.name && f.name.indexOf('.') > -1);
    const carpetas = files.filter(f => f?.name && !f.name.includes('.'));

    let archivosSubcarpetas = [];
    for (const carpeta of carpetas) {
      let subFilesRes = await supabase
        .storage
        .from('asistencias')
        .list(`${numeroAsistencia}/${carpeta.name}/`, { limit: 100 });
      const subArchivos = (subFilesRes?.data || []).filter(f => f?.name && f.name.indexOf('.') > -1);
      subArchivos.forEach(f => archivosSubcarpetas.push({
        ...f,
        ruta: `${numeroAsistencia}/${carpeta.name}/${f.name}`
      }));
    }

    const todosArchivos = [
      ...archivosDirectos.map(f => ({ ...f, ruta: `${numeroAsistencia}/${f.name}` })),
      ...archivosSubcarpetas
    ];

    for (const file of todosArchivos) {
      descargas.push({ bucket: 'asistencias', ruta: file.ruta, zipRuta: file.ruta });
    }
  }

  // ========= DESCARGA CON PORCENTAJE & ETA =========
  const total = descargas.length;
  let done = 0;
  const t0 = Date.now();
  emitStage(total ? "Descargando archivos..." : "Comprimiendo ZIP...");
  emitProg({ done, total, percent: total ? 0 : 100, etaSeconds: 0 });

  for (const item of descargas) {
    try {
      const { data: fileData } = await supabase
        .storage
        .from(item.bucket)
        .download(item.ruta);

      if (fileData) zip.file(item.zipRuta, fileData);
    } catch (err) {
      console.warn(`Fallo descargando ${item.bucket}/${item.ruta}`, err?.message || err);
    } finally {
      done++;
      const elapsed = (Date.now() - t0) / 1000; // seg transcurridos
      const rate = done ? elapsed / done : 0;   // seg/archivo aprox
      const remaining = Math.max(0, total - done);
      const eta = rate * remaining;             // seg restantes
      emitProg({ done, total, percent: pct((done / Math.max(1, total)) * 100), etaSeconds: eta });
    }
  }

  // ========= ZIP CON PROGRESO =========
  emitStage("Comprimiendo ZIP...");
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => emitZip(pct(meta.percent))
  );

  // Nombre del ZIP por NOMBRE de buque (no id)
  const { data: buqueRow } = await supabase
    .from('buques')
    .select('nombre')
    .eq('id', buqueId)
    .single();

  const buqueNombreSeguro = safe(buqueRow?.nombre || String(buqueId));
  saveAs(zipBlob, `Pedidos y Asistencia_${buqueNombreSeguro}.zip`);

  emitStage("Listo");
  emitProg({ done: total, total, percent: 100, etaSeconds: 0 });
}

// ========================
//  Exportar FLOTA COMPLETA (pedidos + asistencias) con progreso
//  Callbacks opcionales: onStage(text), onProgress({done,total,percent,etaSeconds}), onZipProgress(percent)
// ========================
export async function exportarFlotaCompleta(
  flotaId,
  { onStage, onProgress, onZipProgress } = {}
) {
  const emitStage = (t) => { try { onStage && onStage(t); } catch {} };
  const emitProg  = (o) => { try { onProgress && onProgress(o); } catch {} };
  const emitZip   = (p) => { try { onZipProgress && onZipProgress(p); } catch {} };

  const zip = new JSZip();

  // 1) Flota
  const { data: flotas, error: errorFlota } = await supabase
    .from('flotas')
    .select('id, nombre')
    .eq('id', flotaId)
    .limit(1);
  if (errorFlota || !flotas || flotas.length === 0) {
    alert("Error obteniendo la flota: " + (errorFlota?.message || 'No encontrada'));
    return;
  }
  const flotaNombre = flotas[0].nombre.replace(/[/\\?%*:|"<>]/g, '-');

  // 2) Buques
  const { data: buques, error: errorBuques } = await supabase
    .from('buques')
    .select('id, nombre')
    .eq('flota_id', flotaId);

  if (errorBuques) {
    alert("Error obteniendo buques: " + errorBuques.message);
    return;
  }
  if (!buques || buques.length === 0) {
    alert("No hay buques en esta flota");
    return;
  }

  // ========= PRE-LISTADO PARA PROGRESO =========
  emitStage("Listando archivos de la flota...");
  const descargas = []; // { bucket, ruta, zipRuta }

  for (const buque of buques) {
    const buqueNombre = buque.nombre.replace(/[/\\?%*:|"<>]/g, '-');
    const base = `${flotaNombre}/${buqueNombre}`;

    // ----- PEDIDOS -----
    const { data: pedidos } = await supabase
      .from('solicitudes_compra')
      .select('*')
      .eq('buque_id', buque.id);

    if (pedidos && pedidos.length > 0) {
      try {
        const ws = XLSX.utils.json_to_sheet(pedidos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(`${base}/Pedidos.xlsx`, excelBuffer);
      } catch (e) {}
    }

    // Archivos de pedidos (misma lógica que ya tenías)
    for (const pedido of pedidos || []) {
      const numeroPedido = pedido.numero_pedido || pedido.numeropedido;
      if (!numeroPedido) continue;

      let filesRes = await supabase
        .storage
        .from('cotizaciones')
        .list(`${numeroPedido}/`, { limit: 100 });

      const files = (filesRes?.data || []);
      const archivosDirectos = files.filter(f => f?.name && f.name.indexOf('.') > -1);
      const carpetas = files.filter(f => f?.name && !f.name.includes('.'));

      let archivosSubcarpetas = [];
      for (const carpeta of carpetas) {
        let subFilesRes = await supabase
          .storage
          .from('cotizaciones')
          .list(`${numeroPedido}/${carpeta.name}/`, { limit: 100 });
        const subArchivos = (subFilesRes?.data || []).filter(f => f?.name && f.name.indexOf('.') > -1);
        subArchivos.forEach(f => archivosSubcarpetas.push({
          ...f,
          ruta: `${numeroPedido}/${carpeta.name}/${f.name}`
        }));
      }

      const todosArchivos = [
        ...archivosDirectos.map(f => ({ ...f, ruta: `${numeroPedido}/${f.name}` })),
        ...archivosSubcarpetas
      ];

      for (const file of todosArchivos) {
        descargas.push({
          bucket: 'cotizaciones',
          ruta: file.ruta,
          zipRuta: `${base}/${file.ruta}`
        });
      }
    }

    // ----- ASISTENCIAS -----
    const { data: asistencias } = await supabase
      .from('solicitudes_asistencia')
      .select('*')
      .eq('buque_id', buque.id);

    if (asistencias && asistencias.length > 0) {
      try {
        const wsA = XLSX.utils.json_to_sheet(asistencias);
        const wbA = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbA, wsA, 'Asistencias');
        const excelBufferA = XLSX.write(wbA, { bookType: 'xlsx', type: 'array' });
        zip.file(`${base}/Asistencias.xlsx`, excelBufferA);
      } catch (e) {}
    }

    // Archivos de asistencias (usando numero_ate)
    for (const a of asistencias || []) {
      const numeroAsistencia =
        a.numero_ate ||
        a.numero_asistencia ||
        a.numeroAsistencia ||
        a.numero ||
        a.numeropedido;
      if (!numeroAsistencia) continue;

      let filesRes = await supabase
        .storage
        .from('asistencias')
        .list(`${numeroAsistencia}/`, { limit: 100 });

      const files = (filesRes?.data || []);
      const archivosDirectos = files.filter(f => f?.name && f.name.indexOf('.') > -1);
      const carpetas = files.filter(f => f?.name && !f.name.includes('.'));

      let archivosSubcarpetas = [];
      for (const carpeta of carpetas) {
        let subFilesRes = await supabase
          .storage
          .from('asistencias')
          .list(`${numeroAsistencia}/${carpeta.name}/`, { limit: 100 });
        const subArchivos = (subFilesRes?.data || []).filter(f => f?.name && f.name.indexOf('.') > -1);
        subArchivos.forEach(f => archivosSubcarpetas.push({
          ...f,
          ruta: `${numeroAsistencia}/${carpeta.name}/${f.name}`
        }));
      }

      const todosArchivos = [
        ...archivosDirectos.map(f => ({ ...f, ruta: `${numeroAsistencia}/${f.name}` })),
        ...archivosSubcarpetas
      ];

      for (const file of todosArchivos) {
        descargas.push({
          bucket: 'asistencias',
          ruta: file.ruta,
          zipRuta: `${base}/${file.ruta}`
        });
      }
    }
  }

  // ========= DESCARGA CON PORCENTAJE & ETA =========
  const total = descargas.length;
  let done = 0;
  const t0 = Date.now();
  emitStage(total ? "Descargando archivos de la flota..." : "Comprimiendo ZIP...");
  emitProg({ done, total, percent: total ? 0 : 100, etaSeconds: 0 });

  for (const item of descargas) {
    try {
      const { data: fileData } = await supabase
        .storage
        .from(item.bucket)
        .download(item.ruta);

      if (fileData) zip.file(item.zipRuta, fileData);
    } catch (err) {
      console.warn(`Fallo descargando ${item.bucket}/${item.ruta}`, err?.message || err);
    } finally {
      done++;
      const elapsed = (Date.now() - t0) / 1000; // seg transcurridos
      const rate = done ? elapsed / done : 0;   // seg/archivo aprox
      const remaining = Math.max(0, total - done);
      const eta = rate * remaining;             // seg restantes
      emitProg({ done, total, percent: pct((done / Math.max(1, total)) * 100), etaSeconds: eta });
    }
  }

  // ========= ZIP CON PROGRESO =========
  emitStage("Comprimiendo ZIP...");
  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => emitZip(pct(meta.percent))
  );

  // 4) Descargar ZIP final
  saveAs(zipBlob, `Flota_${flotaNombre}.zip`);

  emitStage("Listo");
  emitProg({ done: total, total, percent: 100, etaSeconds: 0 });
}
