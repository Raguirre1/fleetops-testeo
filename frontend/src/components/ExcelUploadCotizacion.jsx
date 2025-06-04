import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import PropTypes from "prop-types";

const ExcelUploadCotizacion = ({ numeroPedido }) => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const storageKey = `cotizacion-${numeroPedido}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      } catch (e) {
        console.error("Error parsing localStorage data:", e);
      }
    }
  }, [numeroPedido]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const formattedItems = jsonData.map((row, index) => ({
        item: row["Item"] || index + 1,
        descripcion: row["Nombre/Título"] || row["Descripción"] || row["Nombre"] || "",
        referencia: row["Ref. Fabricante"] || row["Referencia"] || "",
        cantidad: row["Cantidad"] || 1,
        unidad: row["Unidad"] || "Unit"
      }));

      if (formattedItems.length === 0) {
        setError("El archivo no contiene datos reconocibles.");
        setItems([]);
      } else {
        setError("");
        setItems(formattedItems);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemove = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleSave = () => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
      setSuccessMessage("¡Cambios guardados correctamente!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Error al guardar los cambios.");
      console.error("Error saving to localStorage:", err);
    }
  };

  const handleAddItem = () => {
    const nextItemNumber = items.length > 0 ? Math.max(...items.map(i => i.item || 0)) + 1 : 1;
    const newItem = {
      item: nextItemNumber,
      descripcion: "",
      referencia: "",
      cantidad: 1,
      unidad: "Unit"
    };
    setItems([...items, newItem]);
  };

  return (
    <div className="p-4 border rounded mt-8">
      <h3 className="text-lg font-semibold mb-4">Linea de Pedidos </h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="mb-4"
      />

      {error && <div className="text-red-600 mb-4">{error}</div>}
      {successMessage && <div className="text-green-600 mb-4">{successMessage}</div>}

      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">#</th>
            <th className="border p-2">Descripción</th>
            <th className="border p-2">Referencia</th>
            <th className="border p-2">Cantidad</th>
            <th className="border p-2">Unidad</th>
            <th className="border p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="border p-2 text-center">{item.item}</td>
              <td className="border p-2">
                <input
                  value={item.descripcion}
                  onChange={(e) => handleChange(index, "descripcion", e.target.value)}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="border p-2">
                <input
                  value={item.referencia}
                  onChange={(e) => handleChange(index, "referencia", e.target.value)}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="border p-2">
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => handleChange(index, "cantidad", parseInt(e.target.value))}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="border p-2">
                <input
                  value={item.unidad}
                  onChange={(e) => handleChange(index, "unidad", e.target.value)}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleRemove(index)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex gap-4">
        <button
          onClick={handleAddItem}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        >
          Añadir ítem manual
        </button>
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
};

ExcelUploadCotizacion.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
};

export default ExcelUploadCotizacion;
