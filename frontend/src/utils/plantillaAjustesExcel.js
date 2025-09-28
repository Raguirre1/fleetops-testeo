// src/utils/plantillaAjustesExcel.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const descargarPlantillaAjustes = () => {
  // Datos vacíos de ejemplo
  const data = [
    {
      buque_nombre: "Herbania",
      cuenta: "Casco",
      mes: 5,
      anio: 2024,
      valor_factura: 0,
    },
    {
      buque_nombre: "Dácil",
      cuenta: "Máquinas",
      mes: 6,
      anio: 2024,
      valor_factura: 0,
    },
  ];

  // Crear hoja de Excel
  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["buque_nombre", "cuenta", "mes", "anio", "valor_factura"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ajustes");

  // Descargar
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  saveAs(blob, "Plantilla_Ajustes_Cuentas.xlsx");
};
