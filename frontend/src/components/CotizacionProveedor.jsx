import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

const CotizacionProveedor = ({ numeroPedido }) => {
  const storageKey = `cotizacionesPDF-${numeroPedido}`;
  const [cotizaciones, setCotizaciones] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCotizaciones(parsed);
      } catch (e) {
        console.error("Error cargando cotizaciones:", e);
      }
    }
  }, [numeroPedido]);

  const handleAddCotizacion = () => {
    if (cotizaciones.length >= 3) return;
    setCotizaciones([...cotizaciones, { proveedor: "", valor: "", archivos: [] }]);
  };

  const handleRemoveCotizacion = (index) => {
    const updated = cotizaciones.filter((_, i) => i !== index);
    setCotizaciones(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...cotizaciones];
    updated[index][field] = value;
    setCotizaciones(updated);
  };

  const handleFileChange = async (index, event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append("archivos", file));

    try {
      const proveedor = cotizaciones[index].proveedor || `proveedor${index + 1}`;
      const proveedorCodificado = encodeURIComponent(proveedor); // 🔑 importante
      const url = `${BACKEND_URL}/upload/${numeroPedido}/cotizacion/${proveedorCodificado}`;

      const res = await fetch(url, {
        method: "POST",
        body: formData
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (!res.ok) throw new Error(data?.error || "Error al subir archivos");

      const updated = [...cotizaciones];
      updated[index].archivos = data.archivos; // [{ nombre, url }]
      setCotizaciones(updated);
      setSuccessMessage("PDFs subidos correctamente.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error al subir PDFs:", err);
      setSuccessMessage("❌ Error al subir archivos");
    }
  };


  const handleRemoveFile = async (cotizacionIndex, fileIndex) => {
    const archivo = cotizaciones[cotizacionIndex].archivos[fileIndex];
    const proveedor = cotizaciones[cotizacionIndex].proveedor || `proveedor${cotizacionIndex + 1}`;

    try {
      const res = await fetch(`${BACKEND_URL}/uploads/${numeroPedido}/cotizacion/${proveedor}/${archivo.nombre}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("No se pudo eliminar del servidor");

      const updated = [...cotizaciones];
      updated[cotizacionIndex].archivos = updated[cotizacionIndex].archivos.filter((_, i) => i !== fileIndex);
      setCotizaciones(updated);
      setSuccessMessage("Archivo eliminado correctamente.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error eliminando archivo del backend:", err);
      setSuccessMessage("❌ No se pudo eliminar el archivo del servidor.");
    }
  };

  const handleSave = () => {
    const hasEmpty = cotizaciones.some(
      c => !c.proveedor.trim() || !c.valor || c.archivos.length === 0
    );
    if (hasEmpty) {
      setSuccessMessage("❌ Todos los campos y al menos un PDF son obligatorios por proveedor.");
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(cotizaciones));
      setSuccessMessage("✅ ¡Cotizaciones guardadas correctamente!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error guardando cotizaciones:", err);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Cotizaciones de proveedores</h3>

      {cotizaciones.map((cot, index) => (
        <div key={index} className="mb-6 p-4 border rounded">
          <div className="mb-4">
            <label className="block font-medium mb-1">Proveedor</label>
            <input
              type="text"
              value={cot.proveedor}
              onChange={(e) => handleChange(index, "proveedor", e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Valor (€)</label>
            <input
              type="number"
              value={cot.valor}
              onChange={(e) => handleChange(index, "valor", e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Subir PDF(s)</label>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => handleFileChange(index, e)}
            />
          </div>

          {cot.archivos.length > 0 && (
            <ul className="mb-4 space-y-2">
              {cot.archivos.map((archivo, fileIndex) => (
                <li key={fileIndex} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <a href={archivo.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    {archivo.nombre || archivo.name}
                  </a>
                  <button
                    onClick={() => handleRemoveFile(index, fileIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => handleRemoveCotizacion(index)}
            className="text-red-600 hover:text-red-800"
          >
            Eliminar proveedor
          </button>
        </div>
      ))}

      {cotizaciones.length >= 3 && (
        <div className="text-sm text-gray-500 mb-2">Máximo 3 proveedores por pedido.</div>
      )}

      <button
        onClick={handleAddCotizacion}
        className="bg-gray-100 border px-4 py-2 rounded hover:bg-gray-200"
        disabled={cotizaciones.length >= 3}
      >
        Añadir proveedor
      </button>

      {cotizaciones.length > 0 && (
        <button
          onClick={handleSave}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Guardar cotizaciones
        </button>
      )}

      {successMessage && <div className="text-green-600 mt-3">{successMessage}</div>}
    </div>
  );
};

CotizacionProveedor.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
};

export default CotizacionProveedor;
