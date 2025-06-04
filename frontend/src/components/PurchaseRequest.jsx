import React, { useState, useEffect } from "react";
import { FiSave } from "react-icons/fi";
import { FaCog } from "react-icons/fa";
import PurchaseDetail from "./PurchaseDetail";
import { supabase } from "../supabaseClient";

const PurchaseRequest = ({ usuario, onBack }) => {
  const barcos = ["Dacil", "Herbania", "Hesperides", "Tinerfe"];
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [formulario, setFormulario] = useState({
    numeroPedido: "",
    tituloPedido: "",
    urgencia: "",
    fechaPedido: "",
    fechaEntrega: "",
    numeroCuenta: "",
  });

  const [editarId, setEditarId] = useState(null);
  const [detallePedido, setDetallePedido] = useState(null);
  const [estadoMenuVisible, setEstadoMenuVisible] = useState(null);

  const cargarSolicitudes = async () => {
    if (!buqueSeleccionado) return;
    const { data, error } = await supabase
      .from("solicitudes_compra")
      .select("*")
      .eq("buque", buqueSeleccionado)
      .order("created_at", { ascending: false });

    if (!error) setSolicitudes(data);
  };

  useEffect(() => {
    cargarSolicitudes();
  }, [buqueSeleccionado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nueva = {
      numero_pedido: formulario.numeroPedido,
      titulo_pedido: formulario.tituloPedido,
      urgencia: formulario.urgencia,
      fecha_pedido: formulario.fechaPedido || null,
      fecha_entrega: formulario.fechaEntrega || null,
      numero_cuenta: formulario.numeroCuenta,
      buque: buqueSeleccionado,
      usuario: usuario.nombre,
    };

    const { error } = await supabase
      .from("solicitudes_compra")
      .upsert(nueva, { onConflict: "numero_pedido" });

    if (!error) {
      setFormulario({
        numeroPedido: "",
        tituloPedido: "",
        urgencia: "",
        fechaPedido: "",
        fechaEntrega: "",
        numeroCuenta: "",
      });
      setEditarId(null);
      await cargarSolicitudes();
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  const handleEditar = (solicitud) => {
    setFormulario({
      numeroPedido: solicitud.numero_pedido,
      tituloPedido: solicitud.titulo_pedido,
      urgencia: solicitud.urgencia,
      fechaPedido: solicitud.fecha_pedido?.split("T")[0] || "",
      fechaEntrega: solicitud.fecha_entrega?.split("T")[0] || "",
      numeroCuenta: solicitud.numero_cuenta,
    });
    setEditarId(solicitud.numero_pedido);
  };

  const handleEliminar = async (numeroPedido) => {
    if (!window.confirm("¿Eliminar esta solicitud?")) return;
    const { error } = await supabase
      .from("solicitudes_compra")
      .delete()
      .eq("numero_pedido", numeroPedido);
    if (!error) await cargarSolicitudes();
  };

  const handleVerDetalle = (solicitud) => {
    setDetallePedido({
      numeroPedido: solicitud.numero_pedido,
      tituloPedido: solicitud.titulo_pedido,
      urgencia: solicitud.urgencia,
      fechaPedido: solicitud.fecha_pedido?.split("T")[0] || "—",
      fechaEntrega: solicitud.fecha_entrega?.split("T")[0] || "—",
      numeroCuenta: solicitud.numero_cuenta || "—",
      buque: solicitud.buque || "—",
      usuario: solicitud.usuario || "—",
      estado: solicitud.estado || "—",
    });
  };


  const actualizarEstado = async (numeroPedido, nuevoEstado) => {
    const fechaHoy = new Date().toISOString();
    const { error } = await supabase
      .from("solicitudes_compra")
      .update({ estado: nuevoEstado, fecha_estado: fechaHoy })
      .eq("numero_pedido", numeroPedido);
    if (!error) {
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.numero_pedido === numeroPedido
            ? { ...s, estado: nuevoEstado, fecha_estado: fechaHoy }
            : s
        )
      );
    }
  };

  if (detallePedido) {
    return (
      <PurchaseDetail
        pedido={detallePedido}
        volver={async () => {
          setDetallePedido(null);
          await cargarSolicitudes();
        }}
      />
    );
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
            <option key={buque} value={buque}>{buque}</option>
          ))}
        </select>
        <button onClick={onBack} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Solicitud de Compra - {buqueSeleccionado}</h2>
      <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input name="numeroPedido" value={formulario.numeroPedido} onChange={handleChange} required placeholder="Nº Pedido" className="border p-2 rounded" />
        <input name="tituloPedido" value={formulario.tituloPedido} onChange={handleChange} required placeholder="Título" className="border p-2 rounded" />
        <input name="urgencia" value={formulario.urgencia} onChange={handleChange} placeholder="Urgencia" className="border p-2 rounded" />
        <input type="date" name="fechaPedido" value={formulario.fechaPedido} onChange={handleChange} className="border p-2 rounded" />
        <input type="date" name="fechaEntrega" value={formulario.fechaEntrega} onChange={handleChange} className="border p-2 rounded" />
        <input name="numeroCuenta" value={formulario.numeroCuenta} onChange={handleChange} placeholder="Cuenta contable" className="border p-2 rounded" />
        <button type="submit" className="col-span-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center justify-center gap-2">
          <FiSave /> Guardar
        </button>
      </form>

      <h3 className="font-semibold text-lg mb-4">📋 Solicitudes registradas</h3>
      <table className="min-w-full border border-gray-400 text-sm bg-white">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2">Nº Pedido</th>
            <th className="border px-3 py-2">Título</th>
            <th className="border px-3 py-2">Urgencia</th>
            <th className="border px-3 py-2">Fecha</th>
            <th className="border px-3 py-2">Fecha Límite</th>
            <th className="border px-3 py-2">Solicitante</th>
            <th className="border px-3 py-2">Estado</th>
            <th className="border px-3 py-2">Fecha estado</th>
            <th className="border px-3 py-2">Cuenta Contable</th>
            <th className="border px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s, idx) => (
            <tr key={idx} className="text-center hover:bg-gray-50">
              <td className="border px-3 py-2 font-semibold">{s.numero_pedido}</td>
              <td className="border px-3 py-2">{s.titulo_pedido}</td>
              <td className="border px-3 py-2">{s.urgencia}</td>
              <td className="border px-3 py-2">{s.fecha_pedido?.split("T")[0]}</td>
              <td className="border px-3 py-2">{s.fecha_entrega?.split("T")[0] || "-"}</td>
              <td className="border px-3 py-2">{s.usuario}</td>
              <td className="border px-3 py-2">{s.estado === "Pedido Activo" ? "Pedido Activo ✅" : s.estado || "Solicitud de Compra"}</td>
              <td className="border px-3 py-2">{s.fecha_estado?.split("T")[0] || "-"}</td>
              <td className="border px-3 py-2">{s.numero_cuenta || "-"}</td>
              <td className="border px-3 py-2 relative">
                <div className="flex gap-2 justify-center items-center">
                  <button onClick={() => handleEditar(s)} title="Editar">📝</button>
                  <button onClick={() => handleVerDetalle(s)} title="Ver">👁️</button>
                  <button onClick={() => handleEliminar(s.numero_pedido)} title="Eliminar">🗑️</button>
                  <button onClick={() => setEstadoMenuVisible(estadoMenuVisible === s.numero_pedido ? null : s.numero_pedido)} title="Cambiar estado">
                    <FaCog />
                  </button>
                </div>
                {estadoMenuVisible === s.numero_pedido && (
                  <div className="absolute bg-white border shadow-md p-2 mt-2 z-10 text-left">
                    {["Solicitud de Compra", "En Consulta", "Pedido Activo", "Recibido"].map((estado) => (
                      <div
                        key={estado}
                        onClick={() => {
                          actualizarEstado(s.numero_pedido, estado);
                          setEstadoMenuVisible(null);
                        }}
                        className="cursor-pointer hover:bg-gray-200 px-2 py-1"
                      >
                        {estado}
                      </div>
                    ))}
                  </div>
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
