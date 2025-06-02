import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://fleetops-production.up.railway.app";

const Login = ({ onLoginSuccess }) => {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(`${BACKEND_URL}/login`, { nombre, password });
      const { token, usuario } = response.data;

      // Guardar en localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("nombre", usuario.nombre);
      localStorage.setItem("rol", usuario.rol);

      // Redirigir o activar sesión
      onLoginSuccess(usuario);

    } catch (err) {
      setError("Credenciales incorrectas");
      console.error("Error al iniciar sesión:", err);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Iniciar sesión</h2>

        <input
          type="text"
          placeholder="Usuario"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        {error && <p className="text-red-500 mb-2">{error}</p>}

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Entrar
        </button>
      </form>
    </div>
  );
};

export default Login;
