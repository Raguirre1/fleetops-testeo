import React, { useState } from "react";
import PurchaseDetail from "./PurchaseDetail";

function PurchaseDashboard() {
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const buques = [
    { id: 1, nombre: "Dacil" },
    { id: 2, nombre: "Herbania" },
    { id: 3, nombre: "Tinerfe" },
    { id: 4, nombre: "Hesperides" },
  ];

  const estadoCompras = [
    { no: 1, buque: "Dacil", estado: "Pendiente", fecha: "2025-03-01" },
    { no: 2, buque: "Herbania", estado: "Aprobado", fecha: "2025-03-05" },
    { no: 3, buque: "Tinerfe", estado: "Finalizado", fecha: "2025-03-10" },
    { no: 4, buque: "Hesperides", estado: "Pendiente", fecha: "2025-03-15" },
  ];

  const handleSeleccionarBuque = (event) => {
    setBuqueSeleccionado(event.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold tracking-wide">FleetOps</h1>
        <nav className="space-x-6">
          <button className="hover:underline">Compras</button>
          <button className="hover:underline">Asistencias</button>
          <button className="hover:underline">SGC</button>
          <button className="hover:underline">Flota</button>
          <button className="hover:underline">Económico</button>
          <button className="hover:underline">Documentación</button>
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-sm">Hi, RAFAEL</span>
          <div className="bg-teal-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">R</div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="p-6">
        {pedidoSeleccionado ? (
          <PurchaseDetail
            key={pedidoSeleccionado.no}
            pedido={pedidoSeleccionado}
            volver={() => setPedidoSeleccionado(null)}
          />
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6">📊 Dashboard de Compras</h2>

            {/* Selector de buque */}
            <div className="mb-4">
              <select
                className="border border-gray-300 p-2 rounded shadow-sm"
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
            

            {/* Tabla de estado de compras */}
            {buqueSeleccionado && (
              <div className="bg-white p-4 rounded shadow-md">
                <h3 className="text-lg font-semibold mb-4">
                  Estado de compras para el buque <span className="text-blue-600">{buqueSeleccionado}</span>
                </h3>
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border px-4 py-2">No</th>
                      <th className="border px-4 py-2">Buque</th>
                      <th className="border px-4 py-2">Estado</th>
                      <th className="border px-4 py-2">Fecha</th>
                      <th className="border px-4 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoCompras
                      .filter((compra) => compra.buque === buqueSeleccionado)
                      .map((compra) => (
                        <tr key={compra.no} className="hover:bg-slate-50">
                          <td className="border px-4 py-2 text-center">{compra.no}</td>
                          <td className="border px-4 py-2">{compra.buque}</td>
                          <td className="border px-4 py-2">{compra.estado}</td>
                          <td className="border px-4 py-2">{compra.fecha}</td>
                          <td className="border px-4 py-2 text-center">
                            <button
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              onClick={() => setPedidoSeleccionado(compra)}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default PurchaseDashboard;