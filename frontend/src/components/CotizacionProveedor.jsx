import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const CotizacionProveedor = ({ numeroPedido }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const storageKey = `cotizaciones-${numeroPedido}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCotizaciones(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando cotizaciones:", e);
      }
    }
  }, [numeroPedido]);

  const handleAdd = () => {
    setCotizaciones([
      ...cotizaciones,
      {
        proveedor: "",
        valor: "",
        archivos: [],
        estado: "pendiente",
      },
    ]);
  };

  const handleRemoveProveedor = (index) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este proveedor?")) {
      const updated = [...cotizaciones];
      updated.splice(index, 1);
      setCotizaciones(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const handleFileChange = (e, index) => {
    const selected = Array.from(e.target.files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));

    const updated = [...cotizaciones];
    updated[index].archivos = [...updated[index].archivos, ...selected];
    setCotizaciones(updated);
  };

  const handleRemoveFile = (cotIndex, fileIndex) => {
    const updated = [...cotizaciones];
    updated[cotIndex].archivos.splice(fileIndex, 1);
    setCotizaciones(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...cotizaciones];
    updated[index][field] = value;
    setCotizaciones(updated);
  };

  const handleEstado = (index, estado) => {
    const updated = [...cotizaciones];
    updated[index].estado = estado;
    setCotizaciones(updated);

    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSuccessMessage(`Cotización marcada como ${estado === "aceptada" ? "aceptada ✅" : "cancelada ❌"}`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(cotizaciones));
    setSuccessMessage("Cotizaciones guardadas correctamente");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div className="p-4 border rounded mt-8">
      <h3 className="text-lg font-semibold mb-4">Cotizaciones por Proveedor</h3>

      {cotizaciones.map((cot, i) => (
        <div
          key={i}
          className="mb-6 p-4 border rounded"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 font-medium">
                Proveedor {cot.estado === "aceptada" && <span title="Cotización aceptada" className="text-yellow-500">⭐</span>}
              </label>
              <input
                type="text"
                value={cot.proveedor}
                onChange={(e) => handleChange(i, "proveedor", e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Valor (€)</label>
              <input
                type="number"
                value={cot.valor}
                onChange={(e) => handleChange(i, "valor", e.target.value)}
                className="w-full border rounded p-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-medium">Archivos PDF</label>
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => handleFileChange(e, i)}
            />
            <ul className="mt-2 space-y-1">
              {cot.archivos.map((archivo, j) => (
                <li key={j} className="flex justify-between items-center">
                  <a
                    href={archivo.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {archivo.name}
                  </a>
                  <button
                    onClick={() => handleRemoveFile(i, j)}
                    className="ml-4"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <span className="font-medium">Estado:</span>
            <button onClick={() => handleEstado(i, "aceptada")}>✅ Aceptada</button>
            <button onClick={() => handleEstado(i, "cancelada")}>❌ Cancelada</button>
            <button
              onClick={() => handleRemoveProveedor(i)}
              className="text-red-600 hover:underline ml-4"
            >
              🗑️ Eliminar proveedor
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-4 mt-6">
        <button onClick={handleAdd}>Añadir proveedor</button>
        <button onClick={handleSave}>Guardar todo</button>
      </div>

      {successMessage && <div className="mt-4">{successMessage}</div>}
    </div>
  );
};

CotizacionProveedor.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
};

export default CotizacionProveedor;
