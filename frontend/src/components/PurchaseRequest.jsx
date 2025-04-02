import React, { useEffect, useState } from "react";

const PurchaseRequest = ({ usuario, onBack }) => {
  const barcos = ["Dacil", "Herbania", "Hesperides", "Tinerfe"];
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [formulario, setFormulario] = useState({
    numeroPedido: "",
    tituloPedido: "",
    urgencia: "",
    fechaPedido: "",
    fechaEntrega: "",
    numeroCuenta: "",
    archivoAdjunto: null,
  });
  const [solicitudes, setSolicitudes] = useState([]);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    const guardadas = localStorage.getItem("solicitudes");
    if (guardadas) {
      setSolicitudes(JSON.parse(guardadas));
    }
  }, []);

  const guardarEnLocalStorage = () => {
    localStorage.setItem("solicitudes", JSON.stringify(solicitudes));
    alert("Solicitudes guardadas correctamente");
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormulario((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nueva = {
      ...formulario,
      buque: buqueSeleccionado,
      usuario: usuario.nombre,
      fecha: new Date().toLocaleDateString(),
      estado: "Solicitud de compra",
    };

    if (editando !== null) {
      const actualizadas = [...solicitudes];
      actualizadas[editando] = nueva;
      setSolicitudes(actualizadas);
      setEditando(null);
    } else {
      setSolicitudes([nueva, ...solicitudes]);
    }

    setFormulario({
      numeroPedido: "",
      tituloPedido: "",
      urgencia: "",
      fechaPedido: "",
      fechaEntrega: "",
      numeroCuenta: "",
      archivoAdjunto: null,
    });
  };

  const cambiarEstado = (index, nuevoEstado) => {
    const actualizadas = [...solicitudes];
    actualizadas[index].estado = nuevoEstado;
    setSolicitudes(actualizadas);
  };

  const editarSolicitud = (index) => {
    const s = solicitudes[index];
    setFormulario({ ...s });
    setEditando(index);
  };

  const descargarArchivo = (archivo) => {
    const url = URL.createObjectURL(archivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = archivo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const solicitudesBuque = solicitudes.filter((s) => s.buque === buqueSeleccionado);

  if (!buqueSeleccionado) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2">Selecciona un buque</h2>
        <select
          className="border p-2 rounded w-full mb-4"
          value={buqueSeleccionado}
          onChange={(e) => setBuqueSeleccionado(e.target.value)}
        >
          <option value="">-- Seleccionar --</option>
          {barcos.map((buque) => (
            <option key={buque} value={buque}>
              {buque}
            </option>
          ))}
        </select>
        <button
          onClick={onBack}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Solicitud de Compra - {buqueSeleccionado}</h2>
        <button onClick={() => setBuqueSeleccionado("")} className="text-sm text-blue-600 underline">
          Cambiar buque
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <table className="w-full border border-gray-300 text-sm bg-white rounded-md">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Nº de Pedido</th>
              <th className="p-2">Título</th>
              <th className="p-2">Urgencia</th>
              <th className="p-2">Fecha Pedido</th>
              <th className="p-2">Límite Entrega</th>
              <th className="p-2">Cuenta Contable</th>
              <th className="p-2">Archivo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">
                <input name="numeroPedido" type="text" required value={formulario.numeroPedido} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input name="tituloPedido" type="text" required value={formulario.tituloPedido} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <select name="urgencia" required value={formulario.urgencia} onChange={handleChange} className="border p-2 w-full rounded">
                  <option value="">Seleccionar</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Muy Urgente">Muy urgente</option>
                </select>
              </td>
              <td className="p-2">
                <input name="fechaPedido" type="date" required value={formulario.fechaPedido} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input name="fechaEntrega" type="date" value={formulario.fechaEntrega} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input name="numeroCuenta" type="text" value={formulario.numeroCuenta} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input name="archivoAdjunto" type="file" onChange={handleChange} className="border p-1 w-full rounded bg-white" />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-between">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            {editando !== null ? "Actualizar Solicitud" : "Enviar Solicitud"}
          </button>
          <button type="button" onClick={guardarEnLocalStorage} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
            Guardar registros
          </button>
        </div>
      </form>

      <h3 className="text-lg font-semibold mb-2">📋 Solicitudes registradas</h3>
      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 border">Nº Pedido</th>
            <th className="px-2 py-1 border">Título</th>
            <th className="px-2 py-1 border">Urgencia</th>
            <th className="px-2 py-1 border">Fecha</th>
            <th className="px-2 py-1 border">Solicitante</th>
            <th className="px-2 py-1 border">Estado</th>
            <th className="px-2 py-1 border">Cambiar Estado</th>
            <th className="px-2 py-1 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudesBuque.map((s, idx) => (
            <tr key={idx} className="text-center">
              <td className="px-2 py-1 border">{s.numeroPedido}</td>
              <td className="px-2 py-1 border">{s.tituloPedido}</td>
              <td className="px-2 py-1 border">{s.urgencia}</td>
              <td className="px-2 py-1 border">{s.fecha}</td>
              <td className="px-2 py-1 border">{s.usuario}</td>
              <td className="px-2 py-1 border">{s.estado}</td>
              <td className="px-2 py-1 border">
                <select value={s.estado} onChange={(e) => cambiarEstado(idx, e.target.value)} className="border px-1 py-1 rounded">
                  <option>Solicitud de compra</option>
                  <option>En consulta</option>
                  <option>Cancelado</option>
                  <option>Aprobado</option>
                  <option>Recibido</option>
                </select>
              </td>
              <td className="px-2 py-1 border">
                <button onClick={() => editarSolicitud(idx)} className="text-blue-600 underline text-xs mr-2">
                  Editar
                </button>
                {s.archivoAdjunto && (
                  <button onClick={() => descargarArchivo(s.archivoAdjunto)} className="text-green-600 underline text-xs">
                    Descargar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseRequest;
