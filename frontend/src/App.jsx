import { useState, useEffect } from "react";
import Login from "./components/Login";
import PurchaseRequest from "./components/PurchaseRequest";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [modulo, setModulo] = useState("");

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
    setModulo("");
  };

  useEffect(() => {
    // Ya no se carga automáticamente, obligamos al login cada vez
    setUsuario(null);
  }, []);

  if (!usuario) return <Login onLoginSuccess={setUsuario} />;

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Cabecera con usuario y logout */}
      <div className="bg-blue-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl">Bienvenido, {usuario.nombre}</h1>
        <div>
          <button onClick={() => setModulo("compras")} className="mr-4">
            Compras
          </button>
          <button onClick={() => setModulo("asistencias")} className="mr-4">
            Asistencias Técnicas
          </button>
          <button onClick={() => setModulo("sgc")} className="mr-4">
            SGC
          </button>
          <button onClick={cerrarSesion} className="bg-red-600 px-3 py-1 rounded">
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Módulos */}
      {modulo === "compras" && (
        <PurchaseRequest usuario={usuario} onBack={() => setModulo("")} />
      )}
      {modulo === "asistencias" && (
        <div className="p-6 text-gray-700">Módulo de Asistencias Técnicas</div>
      )}
      {modulo === "sgc" && (
        <div className="p-6 text-gray-700">Módulo del Sistema de Gestión de Calidad</div>
      )}
    </div>
  );
}

export default App;
