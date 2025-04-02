import { useEffect, useState } from "react";

const estadoColor = {
  "Pendiente": "bg-yellow-200 text-yellow-800",
  "En proceso": "bg-blue-200 text-blue-800",
  "Entregado": "bg-green-200 text-green-800",
  "Rechazada": "bg-red-200 text-red-800",
};

function PurchaseList() {
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    const guardadas = JSON.parse(localStorage.getItem("solicitudes")) || [];
    setSolicitudes(guardadas);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📋 Solicitudes de Compra</h2>
      <table className="min-w-full bg-white rounded shadow overflow-hidden">
        <thead>
          <tr className="bg-gray-100 text-left text-sm text-gray-600">
            <th className="p-3">Fecha</th>
            <th className="p-3">Solicitante</th>
            <th className="p-3">Buque</th>
            <th className="p-3">Descripción</th>
            <th className="p-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((req) => (
            <tr key={req.id} className="border-b text-sm">
              <td className="p-3">{req.fecha}</td>
              <td className="p-3">{req.creadoPor}</td>
              <td className="p-3">{req.buque}</td>
              <td className="p-3">{req.descripcion}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${estadoColor[req.estado]}`}>
                  {req.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PurchaseList;
