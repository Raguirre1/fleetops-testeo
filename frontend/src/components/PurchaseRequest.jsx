import React, { useState, useEffect } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";
import PurchaseDetail from "./PurchaseDetail";

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

  const [solicitudesPorBuque, setSolicitudesPorBuque] = useState(() => {
    const saved = localStorage.getItem("solicitudes");
    return saved ? JSON.parse(saved) : {};
  });

  const [editarIndex, setEditarIndex] = useState(null);
  const [detallePedido, setDetallePedido] = useState(null);

  useEffect(() => {
    localStorage.setItem("solicitudes", JSON.stringify(solicitudesPorBuque));
  }, [solicitudesPorBuque]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormulario((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  };

  const handleGuardar = () => {
    localStorage.setItem("solicitudes", JSON.stringify(solicitudesPorBuque));
    alert("Solicitudes guardadas correctamente.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nueva = {
      ...formulario,
      numeroPedido: String(formulario.numeroPedido), // 🟢 FORZAMOS A STRING
      buque: buqueSeleccionado,
      usuario: usuario.nombre,
      fecha: formulario.fechaPedido || new Date().toLocaleDateString(),
      estado: "Solicitud de compra",
    };


    const actual = solicitudesPorBuque[buqueSeleccionado] || [];
    const actualizadas =
      editarIndex !== null
        ? actual.map((s, i) => (i === editarIndex ? nueva : s))
        : [nueva, ...actual];

    setSolicitudesPorBuque({
      ...solicitudesPorBuque,
      [buqueSeleccionado]: actualizadas,
    });

    setFormulario({
      numeroPedido: "",
      tituloPedido: "",
      urgencia: "",
      fechaPedido: "",
      fechaEntrega: "",
      numeroCuenta: "",
      archivoAdjunto: null,
    });
    setEditarIndex(null);
  };

  const cambiarEstado = (index, nuevoEstado) => {
    const actualizadas = [...solicitudesPorBuque[buqueSeleccionado]];
    actualizadas[index].estado = nuevoEstado;
    setSolicitudesPorBuque({
      ...solicitudesPorBuque,
      [buqueSeleccionado]: actualizadas,
    });
  };

  const handleEditar = (index) => {
    const solicitud = solicitudesPorBuque[buqueSeleccionado][index];

    const fechaPedidoISO = solicitud.fechaPedido
      ? new Date(solicitud.fechaPedido).toISOString().split("T")[0]
      : "";

    const fechaEntregaISO = solicitud.fechaEntrega
      ? new Date(solicitud.fechaEntrega).toISOString().split("T")[0]
      : "";

    setFormulario({
      ...solicitud,
      fechaPedido: fechaPedidoISO,
      fechaEntrega: fechaEntregaISO,
    });
    setEditarIndex(index);
  };

  const handleEliminar = (index) => {
    const confirm = window.confirm("¿Estás seguro de que deseas eliminar esta solicitud?");
    if (!confirm) return;

    const actual = solicitudesPorBuque[buqueSeleccionado] || [];
    const actualizadas = actual.filter((_, i) => i !== index);
    setSolicitudesPorBuque({
      ...solicitudesPorBuque,
      [buqueSeleccionado]: actualizadas,
    });
  };

  const handleVerDetalle = (solicitud) => {
    setDetallePedido(solicitud);
  };

  if (detallePedido) {
    return <PurchaseDetail pedido={detallePedido} volver={() => setDetallePedido(null)} />;
  }

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
        <button
          onClick={() => {
            const confirm = window.confirm("¿Deseas guardar antes de cambiar de buque?");
            if (confirm) handleGuardar();
            setBuqueSeleccionado("");
          }}
          className="text-sm text-blue-600 underline"
        >
          Cambiar buque
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <table className="w-full border border-gray-300 text-sm bg-white rounded-md">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Nº Pedido</th>
              <th className="p-2">Título</th>
              <th className="p-2">Urgencia</th>
              <th className="p-2">Fecha Pedido</th>
              <th className="p-2">Fecha Límite</th>
              <th className="p-2">Cuenta Contable</th>
              <th className="p-2">Archivo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">
                <input type="text" name="numeroPedido" value={formulario.numeroPedido} onChange={handleChange} required className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input type="text" name="tituloPedido" value={formulario.tituloPedido} onChange={handleChange} required className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <select name="urgencia" value={formulario.urgencia} onChange={handleChange} required className="border p-2 w-full rounded">
                  <option value="">Seleccionar</option>
                  <option value="Normal">Normal</option>
                  <option value="Medio">Urgente</option>
                  <option value="Alto">Muy Urgente</option>
                </select>
              </td>
              <td className="p-2">
                <input type="date" name="fechaPedido" value={formulario.fechaPedido} onChange={handleChange} required className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input type="date" name="fechaEntrega" value={formulario.fechaEntrega} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input type="text" name="numeroCuenta" value={formulario.numeroCuenta} onChange={handleChange} className="border p-2 w-full rounded" />
              </td>
              <td className="p-2">
                <input type="file" name="archivoAdjunto" onChange={handleChange} className="border p-1 w-full rounded bg-white" />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 text-right flex justify-end items-center gap-4">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            {editarIndex !== null ? "Actualizar" : "Enviar Solicitud"}
          </button>
          <button type="button" onClick={handleGuardar} title="Guardar solicitudes">
            <FiSave className="text-xl text-green-600 hover:text-green-800" />
          </button>
        </div>
      </form>

      <div className="mt-10">
        <h3 className="font-semibold text-lg mb-4">📋 Solicitudes registradas</h3>
        <table className="min-w-full border border-gray-400 text-sm bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2">Nº Pedido</th>
              <th className="border px-3 py-2">Título</th>
              <th className="border px-3 py-2">Urgencia</th>
              <th className="border px-3 py-2">Fecha</th>
              <th className="border px-3 py-2">Solicitante</th>
              <th className="border px-3 py-2">Estado</th>
              <th className="border px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(solicitudesPorBuque[buqueSeleccionado] || []).map((s, idx) => (
              <tr key={idx} className="text-center hover:bg-gray-50">
                <td className="border px-3 py-2 font-semibold">{s.numeroPedido}</td>
                <td className="border px-3 py-2">{s.tituloPedido}</td>
                <td className="border px-3 py-2">{s.urgencia}</td>
                <td className="border px-3 py-2">{s.fecha}</td>
                <td className="border px-3 py-2">{s.usuario}</td>
                <td className="border px-3 py-2">{s.estado}</td>
                <td className="border px-3 py-2 space-x-2 flex justify-center items-center gap-2">
                  <button onClick={() => handleEditar(idx)} className="text-blue-600 underline text-sm">Editar</button>
                  <button onClick={() => handleVerDetalle(s)} className="text-green-600 underline text-sm">Ver</button>
                  <button onClick={() => handleEliminar(idx)} title="Eliminar">
                    <FiTrash2 className="text-red-600 hover:text-red-800 text-lg" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseRequest;
