import React from "react";

function Sidebar({ setModule }) {
  return (
    <div className="bg-gray-800 text-white w-1/4 p-6 space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Selecciona un Módulo</h2>
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => setModule("Compras")}
            className="w-full text-left py-2 px-4 rounded hover:bg-gray-600 transition duration-300"
          >
            Compras
          </button>
        </li>
        <li>
          <button
            onClick={() => setModule("Asistencias Técnicas")}
            className="w-full text-left py-2 px-4 rounded hover:bg-gray-600 transition duration-300"
          >
            Asistencias Técnicas
          </button>
        </li>
        <li>
          <button
            onClick={() => setModule("SGC")}
            className="w-full text-left py-2 px-4 rounded hover:bg-gray-600 transition duration-300"
          >
            SGC
          </button>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
