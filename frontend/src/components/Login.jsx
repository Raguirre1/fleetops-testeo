import { useState } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Login({ setUsuarioActivo }) {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!nombre || !password) {
      setError("Por favor introduce tu nombre y contraseña.");
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/login`, {
        nombre,
        password,
      });

      const { token, usuario } = response.data;

      // Guardar token y datos de usuario por separado
      localStorage.setItem("token", token);
      localStorage.setItem("usuario", JSON.stringify(usuario));
      setUsuarioActivo(usuario);

    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Iniciar sesión</h2>

        <input
          type="text"
          placeholder="Nombre de usuario"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded"
        />

        {error && <div className="text-red-600">{error}</div>}

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
