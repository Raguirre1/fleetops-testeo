import React, { useState, useEffect } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import ExcelUploadCotizacion from "./ExcelUploadCotizacion";
import CotizacionProveedor from "./CotizacionProveedor";

const BACKEND_URL = "";

const PurchaseDetail = ({ pedido, volver }) => {
  const [comentarios, setComentarios] = useState("");
  const [infoAdicional, setInfoAdicional] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const pedidoKey = `detalle-${pedido.numeroPedido}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const savedData = localStorage.getItem(pedidoKey);
        if (savedData) {
          const { comentarios: savedComentarios, infoAdicional: savedInfo } = JSON.parse(savedData);
          setComentarios(savedComentarios || "");
          setInfoAdicional(savedInfo || "");
        }

        const { data } = await axios.get(`${BACKEND_URL}/uploads/${pedido.numeroPedido}`);
        setArchivosSubidos(Array.isArray(data.archivos) ? data.archivos : []);
      } catch (err) {
        setError("Error al cargar los datos. Revisa la consola para más detalles.");
        console.error("Error en loadData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pedido.numeroPedido]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    validateFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateFiles(files);
  };

  const validateFiles = (files) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "eml", "msg"];

    const validFiles = files.filter(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`Tipo de archivo no permitido: ${file.name}`);
        return false;
      }
      if (file.size > MAX_SIZE) {
        setError(`El archivo ${file.name} excede el límite de 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setArchivos(validFiles);
      setError("");
    }
  };

  const uploadFiles = async () => {
    if (archivos.length === 0) return;

    const formData = new FormData();
    archivos.forEach(file => formData.append("archivos", file));

    try {
      setIsLoading(true);
      const res = await axios.post(`${BACKEND_URL}/upload/${pedido.numeroPedido}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.status === 200 && Array.isArray(res.data.archivos)) {
        setArchivosSubidos(res.data.archivos);
      } else {
        const refresh = await axios.get(`${BACKEND_URL}/uploads/${pedido.numeroPedido}`);
        setArchivosSubidos(refresh.data.archivos || []);
      }

      setArchivos([]);
      setSuccessMessage("¡Archivos subidos correctamente!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Error al subir archivos.");
      console.error("uploadFiles error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (fileName) => {
    try {
      await axios.delete(`${BACKEND_URL}/uploads/${pedido.numeroPedido}/${fileName}`);
      setArchivosSubidos(prev => prev.filter(file => file !== fileName));
      setSuccessMessage(`Archivo ${fileName} eliminado.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(`Error al eliminar archivo: ${fileName}`);
      console.error("handleDeleteFile error:", err);
    }
  };

  const saveLocalData = () => {
    try {
      localStorage.setItem(pedidoKey, JSON.stringify({ comentarios, infoAdicional }));
      setSuccessMessage("¡Datos guardados localmente!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Error al guardar en localStorage. ¿Modo incógnito?");
      console.error("Error en saveLocalData:", err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Detalle del Pedido</h2>
      <p className="text-lg font-medium mb-6 text-gray-700">Nº de Pedido: {pedido.numeroPedido}</p>

      <div className="mb-6 space-y-1 text-gray-700">
        {pedido.tituloPedido && <p><strong>Título:</strong> {pedido.tituloPedido}</p>}
        {pedido.buque && <p><strong>Buque:</strong> {pedido.buque}</p>}
        {pedido.usuario && <p><strong>Solicitante:</strong> {pedido.usuario}</p>}
        {pedido.urgencia && <p><strong>Urgencia:</strong> {pedido.urgencia}</p>}
        {pedido.fechaPedido && <p><strong>Fecha de pedido:</strong> {pedido.fechaPedido}</p>}
        {pedido.fechaEntrega && <p><strong>Fecha de entrega:</strong> {pedido.fechaEntrega}</p>}
        {pedido.numeroCuenta && <p><strong>Cuenta contable:</strong> {pedido.numeroCuenta}</p>}
        {pedido.estado && <p><strong>Estado:</strong> {pedido.estado}</p>}
        {pedido.archivoAdjunto && (
          <p>
            <strong>Archivo adjunto:</strong>{" "}
            <a
              href={URL.createObjectURL(pedido.archivoAdjunto)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {pedido.archivoAdjunto.name}
            </a>
          </p>
        )}
      </div>

      {error && <div className="bg-red-100 text-red-800 p-3 mb-4 rounded">{error}</div>}
      {successMessage && <div className="bg-green-100 text-green-800 p-3 mb-4 rounded">{successMessage}</div>}

      <div className="grid gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Comentarios</label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            className="w-full p-3 border rounded"
            rows={4}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Información adicional</label>
          <textarea
            value={infoAdicional}
            onChange={(e) => setInfoAdicional(e.target.value)}
            className="w-full p-3 border rounded"
            rows={4}
          />
        </div>
      </div>

      <button
        onClick={saveLocalData}
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Guardar cambios
      </button>

      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4">Documentación Adicional</h3>

        <div
          className={`border-2 border-dashed p-8 text-center rounded-lg mb-4 ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <p>Arrastra archivos aquí o</p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.eml,.msg"
            onChange={handleFileChange}
          />
          <label
            htmlFor="file-upload"
            className="inline-block mt-2 px-4 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
          >
            Seleccionar archivos
          </label>
          <p className="text-sm text-gray-500 mt-2">Formatos: JPG, PNG, PDF, EML, MSG (Máx. 10MB)</p>
        </div>

        {archivos.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-2">Archivos a subir:</h4>
            <ul className="space-y-2">
              {archivos.map((file, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{file.name}</span>
                  <button
                    onClick={() => setArchivos(archivos.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={uploadFiles}
              disabled={isLoading}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              Subir {archivos.length} archivo(s)
            </button>
          </div>
        )}

        {archivosSubidos.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Archivos existentes:</h4>
            <ul className="space-y-2">
              {archivosSubidos.map((file, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <a
                      href={`${BACKEND_URL}/uploads/${pedido.numeroPedido}/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {file}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      className="text-red-600 hover:text-red-800 text-xl"
                      title="Eliminar archivo"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Carga Excel Cotización */}
        <ExcelUploadCotizacion />

        {/* Carga PDF Cotización por Proveedor */}
        <CotizacionProveedor pedido={pedido} />
      </div>

      <button
        onClick={volver}
        className="mt-8 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        Volver
      </button>
    </div>
  );
};

PurchaseDetail.propTypes = {
  pedido: PropTypes.shape({
    numeroPedido: PropTypes.string.isRequired,
    tituloPedido: PropTypes.string,
    buque: PropTypes.string,
    usuario: PropTypes.string,
    urgencia: PropTypes.string,
    fechaPedido: PropTypes.string,
    fechaEntrega: PropTypes.string,
    numeroCuenta: PropTypes.string,
    estado: PropTypes.string,
    archivoAdjunto: PropTypes.any,
  }).isRequired,
  volver: PropTypes.func.isRequired,
};

export default PurchaseDetail;
