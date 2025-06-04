import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../supabaseClient";

const CotizacionProveedor = ({ numeroPedido }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchCotizaciones = async () => {
      const { data, error } = await supabase
        .from("cotizaciones_proveedor")
        .select("*")
        .eq("numero_pedido", numeroPedido);

      if (error) {
        console.error("Error cargando cotizaciones:", error);
      } else {
        setCotizaciones(data);
      }
    };

    fetchCotizaciones();
  }, [numeroPedido]);

  const handleAddCotizacion = () => {
    if (cotizaciones.length >= 3) return;
    setCotizaciones([
      ...cotizaciones,
      {
        proveedor: "",
        valor: "",
        estado: "pendiente",
        url_cotizacion: "",
        url_invoice: "",
        valor_factura: "",
      },
    ]);
  };

  const handleRemoveCotizacion = (index) => {
    const updated = cotizaciones.filter((_, i) => i !== index);
    setCotizaciones(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...cotizaciones];
    updated[index][field] = value;
    setCotizaciones(updated);
  };

  const uploadFile = async (file, tipo, proveedor) => {
    const sanitizedProveedor = proveedor.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${numeroPedido}/${sanitizedProveedor}/${tipo}-${Date.now()}.pdf`;

    const { error } = await supabase.storage
      .from("cotizaciones")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(`Error al subir ${tipo}: ` + error.message);

    const { data } = supabase.storage
      .from("cotizaciones")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  const deleteFileFromSupabase = async (url) => {
    const path = url.split("/storage/v1/object/public/cotizaciones/")[1];
    if (!path) return;
    const { error } = await supabase.storage
      .from("cotizaciones")
      .remove([path]);
    if (error) {
      console.error("Error al borrar archivo:", error.message);
      throw new Error("No se pudo borrar el archivo");
    }
  };

  const handleDeleteArchivo = async (index, tipo) => {
    const fileUrl = cotizaciones[index][`url_${tipo}`];
    if (!fileUrl) return;

    try {
      await deleteFileFromSupabase(fileUrl);
      const updated = [...cotizaciones];
      updated[index][`url_${tipo}`] = "";
      setCotizaciones(updated);
      setSuccessMessage(`✅ Archivo de ${tipo} eliminado`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setSuccessMessage(`❌ No se pudo eliminar archivo de ${tipo}`);
    }
  };

  const handleFileChange = async (e, index, tipo) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const proveedor =
        cotizaciones[index].proveedor || `proveedor${index + 1}`;
      const url = await uploadFile(file, tipo, proveedor);

      const updated = [...cotizaciones];
      updated[index][`url_${tipo}`] = url;
      setCotizaciones(updated);
      setSuccessMessage(
        `✅ ${tipo === "cotizacion" ? "Cotización" : "Factura"} subida correctamente`
      );
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setSuccessMessage(`❌ Error al subir archivo de ${tipo}`);
    }
  };

  const handleSave = async () => {
    const incompletas = cotizaciones.some(
      (c) => !c.proveedor.trim() || !c.url_cotizacion
    );

    if (incompletas) {
      setSuccessMessage("❌ Faltan campos obligatorios o archivo de cotización");
      return;
    }

    try {
      for (const cot of cotizaciones) {
        await supabase.from("cotizaciones_proveedor").upsert(
          {
            numero_pedido: numeroPedido,
            proveedor: cot.proveedor,
            valor: parseFloat(cot.valor) || 0,
            estado: cot.estado,
            url_cotizacion: cot.url_cotizacion,
            url_invoice: cot.url_invoice || null,
            valor_factura: parseFloat(cot.valor_factura) || 0,
          },
          { onConflict: ["numero_pedido", "proveedor"] }
        );
      }

      setSuccessMessage("✅ Cotizaciones guardadas en Supabase");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setSuccessMessage("❌ Error al guardar en Supabase");
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Proveedores</h3>

      {cotizaciones.map((cot, index) => (
        <div key={index} className="mb-6 p-4 border rounded">
          <div className="mb-4">
            <label className="block font-medium mb-1">
              Proveedor{" "}
              {cot.estado === "aceptada" && (
                <span title="Cotización aceptada" className="ml-1">⭐</span>
              )}
            </label>
            <input
              type="text"
              value={cot.proveedor}
              onChange={(e) => handleChange(index, "proveedor", e.target.value)}
              className="w-full border rounded p-2"
              onDrop={(e) => e.preventDefault()}
              onDragOver={(e) => e.preventDefault()}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1"> Cotización (€)</label>
            <input
              type="number"
              value={cot.valor}
              onChange={(e) => handleChange(index, "valor", e.target.value)}
              className="w-full border rounded p-2 mb-2"
            />

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => handleChange(index, "estado", "aceptada")}
                className={`px-3 py-1 rounded text-sm ${
                  cot.estado === "aceptada"
                    ? "bg-green-600 text-white"
                    : "bg-green-100 text-green-700"
                }`}
              >
                ✅ Aceptar
              </button>
              <button
                type="button"
                onClick={() => handleChange(index, "estado", "cancelada")}
                className={`px-3 py-1 rounded text-sm ${
                  cot.estado === "cancelada"
                    ? "bg-red-600 text-white"
                    : "bg-red-100 text-red-700"
                }`}
              >
                ❌ Rechazar
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Subir PDF de Cotización</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, index, "cotizacion")}
            />
            {cot.url_cotizacion && (
              <div className="flex items-center gap-4 mt-2">
                <a
                  href={cot.url_cotizacion}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Ver Cotización
                </a>
                <button
                  onClick={() => handleDeleteArchivo(index, "cotizacion")}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Subir PDF de Factura (opcional)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, index, "invoice")}
            />
            {cot.url_invoice && (
              <div className="flex items-center gap-4 mt-2">
                <a
                  href={cot.url_invoice}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Ver Factura
                </a>
                <button
                  onClick={() => handleDeleteArchivo(index, "invoice")}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-1">Valor de la Factura (€)</label>
            <input
              type="number"
              value={cot.valor_factura || ""}
              onChange={(e) => handleChange(index, "valor_factura", e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <button
            onClick={() => handleRemoveCotizacion(index)}
            className="text-red-600 hover:text-red-800"
          >
            Eliminar proveedor
          </button>
        </div>
      ))}

      {cotizaciones.length < 3 && (
        <button
          onClick={handleAddCotizacion}
          className="bg-gray-100 border px-4 py-2 rounded hover:bg-gray-200"
        >
          Añadir proveedor
        </button>
      )}

      {cotizaciones.length > 0 && (
        <button
          onClick={handleSave}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Guardar cotizaciones
        </button>
      )}

      {successMessage && <div className="text-green-600 mt-3">{successMessage}</div>}
    </div>
  );
};

CotizacionProveedor.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
};

export default CotizacionProveedor;
