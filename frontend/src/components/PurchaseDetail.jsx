import React, { useState, useEffect } from "react";
import axios from "axios";

const PurchaseDetail = ({ pedido, volver }) => {
  const [comentarios, setComentarios] = useState("");
  const [infoAdicional, setInfoAdicional] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [archivosSubidos, setArchivosSubidos] = useState([]);

  const pedidoKey = `detalle-${pedido.numeroPedido}`;

  useEffect(() => {
    // Cargar info adicional desde localStorage
    const guardado = localStorage.getItem(pedidoKey);
    if (guardado) {
      const datos = JSON.parse(guardado);
      setComentarios(datos.comentarios || "");
      setInfoAdicional(datos.infoAdicional || "");
    }

    // Obtener archivos subidos
    axios
      .get(`http://localhost:5000/uploads/${pedido.numeroPedido}`)
      .then((res) => setArchivosSubidos(res.data.archivos))
      .catch((err) => console.error("Error al obtener archivos:", err));
  }, [pedido.numeroPedido]);

  const guardarInfo = () => {
    localStorage.setItem(
      pedidoKey,
      JSON.stringify({ comentarios, infoAdicional })
    );
    alert("Información adicional guardada ✅");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setArchivos(files);
  };

  const handleFileChange = (e) => {
    setArchivos(Array.from(e.target.files));
  };

  const subirArchivos = async () => {
    if (archivos.length === 0) {
      alert("No hay archivos para subir.");
      return;
    }

    const formData = new FormData();
    archivos.forEach((file) => {
      formData.append("archivos", file);
    });

    try {
      await axios.post(
        `http://localhost:5000/upload/${pedido.numeroPedido}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setArchivos([]);
      // Actualizar lista de archivos subidos
      const res = await axios.get(`http://localhost:5000/uploads/${pedido.numeroPedido}`);
      setArchivosSubidos(res.data.archivos);
      alert("Archivos subidos correctamente ✅");
    } catch (err) {
      console.error("Error al subir archivos:", err);
      alert("❌ Error al subir archivos");
    }
  };

  const eliminarArchivo = async (nombreArchivo) => {
    const confirm = window.confirm(`¿Eliminar archivo ${nombreArchivo}?`);
    if (!confirm) return;

    try {
      await axios.delete(`http://localhost:5000/uploads/${pedido.numeroPedido}/${nombreArchivo}`);
      setArchivosSubidos((prev) =>
        prev.filter((archivo) => archivo.nombre !== nombreArchivo)
      );
    } catch (err) {
      console.error("Error al eliminar archivo:", err);
      alert("❌ No se pudo eliminar el archivo");
    }
  };

  return (
    <div className="p-6 bg-white rounded-md shadow-md">
      <button
        onClick={volver}
        className="mb-4 text-blue-600 hover:underline text-sm"
      >
        ← Volver a la lista
      </button>

      <h2 className="text-xl font-bold mb-4">
        Detalle del Pedido: {pedido.numeroPedido}
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p><strong>Buque:</strong> {pedido.buque}</p>
          <p><strong>Título:</strong> {pedido.tituloPedido}</p>
          <p><strong>Urgencia:</strong> {pedido.urgencia}</p>
          <p><strong>Fecha del pedido:</strong> {pedido.fecha}</p>
        </div>
        <div>
          <p><strong>Solicitante:</strong> {pedido.usuario}</p>
          <p><strong>Cuenta contable:</strong> {pedido.numeroCuenta || "N/A"}</p>
          <p><strong>Fecha límite:</strong> {pedido.fechaEntrega || "No definida"}</p>
        </div>
      </div>

      {/* Archivo adjunto original */}
      {pedido.archivoAdjunto && (
        <div className="mb-6">
          <h3 className="font-semibold mb-1">📎 Pedido adjunto:</h3>
          <a
            href={URL.createObjectURL(pedido.archivoAdjunto)}
            download={pedido.archivoAdjunto.name}
            className="text-blue-600 underline"
          >
            Descargar {pedido.archivoAdjunto.name}
          </a>
        </div>
      )}

      {/* Área de subida de archivos */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-400 p-6 rounded mb-4 bg-white text-center cursor-pointer"
      >
        <p className="text-gray-700 font-medium">
          📁 Arrastra aquí los archivos o{" "}
          <label className="text-blue-600 underline cursor-pointer">
            haz clic
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </p>
      </div>

      {archivos.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Archivos seleccionados:</h4>
          <ul className="text-sm list-disc pl-5">
            {archivos.map((file, idx) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
          <button
            onClick={subirArchivos}
            className="mt-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          >
            Cargar archivos
          </button>
        </div>
      )}

      {archivosSubidos.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">📄 Archivos subidos:</h4>
          <ul className="text-sm">
            {archivosSubidos.map((archivo, index) => (
              <li
                key={index}
                className="text-sm flex justify-between items-center border p-2 mb-2 rounded"
              >
                <a
                  href={`http://localhost:5000/uploads/${pedido.numeroPedido}/${archivo.nombre}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {archivo.nombre}
                </a>
                <button
                  onClick={() => eliminarArchivo(archivo.nombre)}
                  className="ml-4 text-red-600 hover:underline text-sm"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comentarios */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">
          Información recibida del buque:
        </label>
        <textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          rows="4"
          className="w-full border rounded p-2"
          placeholder="Ej: Observaciones, instrucciones, etc."
        ></textarea>
      </div>

      {/* Notas internas */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Notas internas:</label>
        <input
          type="text"
          value={infoAdicional}
          onChange={(e) => setInfoAdicional(e.target.value)}
          className="w-full border rounded p-2"
          placeholder="Ej: Pendiente de cotización, revisar..."
        />
      </div>

      <button
        onClick={guardarInfo}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Guardar información
      </button>
    </div>
  );
};

export default PurchaseDetail;
