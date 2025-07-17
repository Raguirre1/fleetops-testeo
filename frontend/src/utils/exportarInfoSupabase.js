import { supabase } from '../supabaseClient';
import * as XLSX from "xlsx";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Exportar pedidos de un solo buque
export async function exportarPedidosBuque(buqueId) {
  const zip = new JSZip();
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

  for (const pedido of pedidos || []) {
    const numeroPedido = pedido.numero_pedido || pedido.numeropedido;
    if (!numeroPedido) continue;
    let filesRes = await supabase
      .storage
      .from('cotizaciones')
      .list(`${numeroPedido}/`, { limit: 100 });

    const files = (filesRes.data || []);
    const archivosDirectos = files.filter(f => f && f.name && f.name.indexOf('.') > -1);
    const carpetas = files.filter(f => f && f.name && !f.name.includes('.'));
    let archivosSubcarpetas = [];
    for (const carpeta of carpetas) {
      let subFilesRes = await supabase
        .storage
        .from('cotizaciones')
        .list(`${numeroPedido}/${carpeta.name}/`, { limit: 100 });
      const subArchivos = (subFilesRes.data || []).filter(f => f && f.name && f.name.indexOf('.') > -1);
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
      const { data: fileData } = await supabase
        .storage
        .from('cotizaciones')
        .download(file.ruta);
      if (fileData) zip.file(file.ruta, fileData);
    }
  }

  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `Pedidos_buque_${buqueId}.zip`);
  } catch (e) {
    alert("Error generando ZIP: " + e.message);
  }
}

// Exportar TODO lo de una flota
export async function exportarFlotaCompleta(flotaId) {
  const zip = new JSZip();

  // 1. Obtener info de la flota
  const { data: flotas, error: errorFlota } = await supabase
    .from('flotas')
    .select('id, nombre')
    .eq('id', flotaId)
    .limit(1);
  if (errorFlota || !flotas || flotas.length === 0) {
    alert("Error obteniendo la flota: " + (errorFlota?.message || 'No encontrada'));
    return;
  }
  const flotaNombre = flotas[0].nombre.replace(/[/\\?%*:|"<>]/g, '-'); // limpia nombre

  // 2. Obtener buques de esa flota
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

  // 3. Para cada buque, exportar datos + archivos
  for (const buque of buques) {
    const buqueNombre = buque.nombre.replace(/[/\\?%*:|"<>]/g, '-');
    // a) Pedidos de ese buque
    const { data: pedidos, error: errorPedidos } = await supabase
      .from('solicitudes_compra')
      .select('*')
      .eq('buque_id', buque.id);
    // b) Exportar pedidos a Excel
    if (pedidos && pedidos.length > 0) {
      try {
        const ws = XLSX.utils.json_to_sheet(pedidos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        zip.file(`${flotaNombre}/${buqueNombre}/Pedidos.xlsx`, excelBuffer);
      } catch (e) {}
    }
    // c) Exportar archivos del bucket de cada pedido
    for (const pedido of pedidos || []) {
      const numeroPedido = pedido.numero_pedido || pedido.numeropedido;
      if (!numeroPedido) continue;
      let filesRes = await supabase
        .storage
        .from('cotizaciones')
        .list(`${numeroPedido}/`, { limit: 100 });
      const files = (filesRes.data || []);
      const archivosDirectos = files.filter(f => f && f.name && f.name.indexOf('.') > -1);
      const carpetas = files.filter(f => f && f.name && !f.name.includes('.'));
      let archivosSubcarpetas = [];
      for (const carpeta of carpetas) {
        let subFilesRes = await supabase
          .storage
          .from('cotizaciones')
          .list(`${numeroPedido}/${carpeta.name}/`, { limit: 100 });
        const subArchivos = (subFilesRes.data || []).filter(f => f && f.name && f.name.indexOf('.') > -1);
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
        const { data: fileData } = await supabase
          .storage
          .from('cotizaciones')
          .download(file.ruta);
        if (fileData) zip.file(`${flotaNombre}/${buqueNombre}/${file.ruta}`, fileData);
      }
    }
  }

  // 4. Descargar ZIP final
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `Flota_${flotaNombre}.zip`);
  } catch (e) {
    alert("Error generando ZIP: " + e.message);
  }
}
