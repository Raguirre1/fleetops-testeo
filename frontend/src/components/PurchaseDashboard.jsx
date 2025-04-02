import React, { useState } from "react";

function PurchaseDashboard() {
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");

  const buques = [
    { id: 1, nombre: "Dacil" },
    { id: 2, nombre: "Herbania" },
    { id: 3, nombre: "Tinerfe" },
    { id: 4, nombre: "Hesperides" }, // Nuevo buque añadido
  ];

  const estadoCompras = [
    { no: 1, buque: "Dacil", estado: "Pendiente", fecha: "2025-03-01" },
    { no: 2, buque: "Herbania", estado: "Aprobado", fecha: "2025-03-05" },
    { no: 3, buque: "Tinerfe", estado: "Finalizado", fecha: "2025-03-10" },
    { no: 4, buque: "Hesperides", estado: "Pendiente", fecha: "2025-03-15" }, // Estado de compra para Hesperides
  ];

  const handleSeleccionarBuque = (event) => {
    setBuqueSeleccionado(event.target.value);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">📊 Dashboard de Compras</h2>

      {/* Selección de buque */}
      <div className="my-4">
        <select
          className="border p-2 rounded"
          onChange={handleSeleccionarBuque}
          value={buqueSeleccionado}
        >
          <option value="">Selecciona un buque</option>
          {buques.map((buque) => (
            <option key={buque.id} value={buque.nombre}>
              {buque.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Mostrar estado de las compras */}
      {buqueSeleccionado && (
        <div className="my-6">
          <h3 className="text-lg font-semibold">Estado de compras para el buque {buqueSeleccionado}</h3>
          <table className="min-w-full mt-4 border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">No</th>
                <th className="border px-4 py-2">Buque</th>
                <th className="border px-4 py-2">Estado</th>
                <th className="border px-4 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {estadoCompras
                .filter((compra) => compra.buque === buqueSeleccionado)
                .map((compra) => (
                  <tr key={compra.no}>
                    <td className="border px-4 py-2">{compra.no}</td>
                    <td className="border px-4 py-2">{compra.buque}</td>
                    <td className="border px-4 py-2">{compra.estado}</td>
                    <td className="border px-4 py-2">{compra.fecha}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PurchaseDashboard;
