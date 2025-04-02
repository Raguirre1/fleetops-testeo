import { useState } from "react";

const usuarios = [
  { id: 1, nombre: "Rafael Aguirre Delgado", rol: "Jefe de Mantenimiento" },
  { id: 2, nombre: "Reyes García Vargas", rol: "Responsable de compras" },
  { id: 3, nombre: "Aarón Trujillo Alonso", rol: "Superintendente" },
  { id: 4, nombre: "Jose Carlos Roger Sánchez", rol: "Superintendente" },
  { id: 5, nombre: "Noelia Galafat Díaz", rol: "Asist. Superintendente" },
];

function Login({ setUsuarioActivo }) {
  const [seleccionado, setSeleccionado] = useState("");

  const handleLogin = () => {
    const usuario = usuarios.find((u) => u.nombre === seleccionado);
    if (usuario) {
      localStorage.setItem("usuario", JSON.stringify(usuario));
      setUsuarioActivo(usuario); // Set the active user
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Iniciar sesión</h2>
        <select
          className="w-full border border-gray-300 px-3 py-2 rounded"
          value={seleccionado}
          onChange={(e) => setSeleccionado(e.target.value)}
        >
          <option value="">Selecciona tu usuario</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.nombre}>
              {u.nombre} ({u.rol})
            </option>
          ))}
        </select>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

export default Login;
