import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Stack,
  useToast,
  Heading,
  FormLabel,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const CotizacionProveedor = ({ numeroPedido, buqueId }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchCotizaciones = async () => {
      if (!numeroPedido || !buqueId) return;
      const { data, error } = await supabase
        .from("cotizaciones_proveedor")
        .select("numero_pedido, proveedor, valor, valor_factura, estado, path_cotizacion, path_invoice, created_at, fecha_aceptacion, buque_id")
        .eq("numero_pedido", numeroPedido)
        .eq("buque_id", buqueId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando cotizaciones:", error);
      } else {
        setCotizaciones(data);
      }
    };

    fetchCotizaciones();
  }, [numeroPedido, buqueId]);

  // 🔹 Nuevo useEffect para guardado automático diferido
  useEffect(() => {
    if (cotizaciones.length === 0) return;

    const timeout = setTimeout(() => {
      cotizaciones.forEach((cot) => autoSave(cot));  // 👈 usa la función autoSave
    }, 2000); // guarda 2s después del último cambio

    return () => clearTimeout(timeout); // limpia si hay cambios antes de los 2s
  }, [cotizaciones]);

  const handleAddCotizacion = () => {
    if (cotizaciones.length >= 3) return;
    setCotizaciones([
      ...cotizaciones,
      {
        proveedor: "",
        valor: "",
        estado: "pendiente",
        path_cotizacion: "",
        path_invoice: "",
        valor_factura: "",
        fecha_aceptacion: "",
      },
    ]);
  };


  const handleRemoveCotizacion = async (index) => {
    const cot = cotizaciones[index];
    const proveedor = cot.proveedor;

    if (!proveedor || proveedor.trim() === "") {
      // Solo elimina del estado local
      setCotizaciones(cotizaciones.filter((_, i) => i !== index));
      return;
    }

    // 1. Elimina archivos en Supabase Storage si existen
    try {
      if (cot.path_cotizacion) {
        await deleteFileFromSupabase(cot.path_cotizacion);
      }
      if (cot.path_invoice) {
        await deleteFileFromSupabase(cot.path_invoice);
      }
    } catch (err) {
      // No detiene la eliminación de BD pero muestra aviso
      toast({ title: "Error al borrar archivos PDF", status: "warning" });
    }

    // 2. Elimina el registro en la tabla de Supabase
    try {
      const { error } = await supabase
        .from("cotizaciones_proveedor")
        .delete()
        .match({
          numero_pedido: numeroPedido,
          buque_id: buqueId,
          proveedor
        });

      if (error) {
        console.error("Error al borrar proveedor en Supabase:", error);
        toast({ title: "Error al borrar en Supabase", status: "error" });
        return;
      }

      toast({ title: `Proveedor "${proveedor}" eliminado`, status: "info" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al eliminar", status: "error" });
    }

    // 3. Elimina del estado local
    setCotizaciones((prev) => prev.filter((_, i) => i !== index));
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

    return path;
  };

  const deleteFileFromSupabase = async (path) => {
    const { error } = await supabase.storage.from("cotizaciones").remove([path]);
    if (error) {
      console.error("Error al borrar archivo:", error.message);
      throw new Error("No se pudo borrar el archivo");
    }
  };

  const handleDrop = async (e, index, tipo) => {
    e.preventDefault();
    setDragOverIndex(null);
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleFileUpload(file, index, tipo);
  };

  const handleFileUpload = async (file, index, tipo) => {
    try {
      const proveedor = cotizaciones[index].proveedor || `proveedor${index + 1}`;
      const path = await uploadFile(file, tipo, proveedor);

      const updated = [...cotizaciones];
      updated[index][`path_${tipo}`] = path;
      setCotizaciones(updated);
      toast({
        title: `${tipo === "cotizacion" ? "Cotización" : "Factura"} subida correctamente`,
        status: "success",
      });
    } catch (err) {
      console.error(err);
      toast({ title: `Error al subir archivo de ${tipo}`, status: "error" });
    }
  };

  const handleDeleteArchivo = async (index, tipo) => {
    const path = cotizaciones[index][`path_${tipo}`];
    if (!path) return;
    try {
      await deleteFileFromSupabase(path);
      const updated = [...cotizaciones];
      updated[index][`path_${tipo}`] = "";
      setCotizaciones(updated);
      toast({ title: `Archivo de ${tipo} eliminado`, status: "success" });
    } catch (err) {
      console.error(err);
      toast({ title: `No se pudo eliminar archivo de ${tipo}`, status: "error" });
    }
  };

  const handleVerArchivo = async (path) => {
    const { data, error } = await supabase.storage
      .from("cotizaciones")
      .createSignedUrl(path, 3600);

    if (error) {
      toast({ title: "Error generando URL", status: "error" });
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const handleSave = async () => {
    try {
      for (const cot of cotizaciones) {
        if (!cot.proveedor?.trim()) continue;
        const proveedor = cot.proveedor.trim();
        const valor = parseFloat(cot.valor) || 0;
        const valor_factura =
          cot.valor_factura === "" || cot.valor_factura == null
            ? null
            : parseFloat(cot.valor_factura);

        await supabase.from("cotizaciones_proveedor").upsert(
          {
            numero_pedido: numeroPedido,
            buque_id: buqueId,
            proveedor,
            valor, // ✅ mantenemos el valor aunque esté cancelada
            estado: cot.estado || "pendiente",
            path_cotizacion: cot.path_cotizacion || null, // ✅ mantenemos cotización
            path_invoice: cot.path_invoice || null,       // ✅ mantenemos factura
            valor_factura,
            fecha_aceptacion: cot.fecha_aceptacion || null,
          },
          { onConflict: ["numero_pedido", "proveedor", "buque_id"] }
        );
      }

      toast({ title: "Cotizaciones guardadas", status: "success" });
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      toast({ title: "Error al guardar en Supabase", status: "error" });
    }
  };

  const autoSave = async (cot) => {
    if (!cot.proveedor?.trim()) return; // no guardar si no hay proveedor

    const proveedor = cot.proveedor.trim();
    const valor = parseFloat(cot.valor) || 0;
    const valor_factura =
      cot.valor_factura === "" || cot.valor_factura == null
        ? null
        : parseFloat(cot.valor_factura);

    const { error } = await supabase.from("cotizaciones_proveedor").upsert(
      {
        numero_pedido: numeroPedido,
        buque_id: buqueId,
        proveedor,
        valor, // ✅ no se borra si está cancelada
        estado: cot.estado || "pendiente",
        path_cotizacion: cot.path_cotizacion || null,
        path_invoice: cot.path_invoice || null,
        valor_factura,
        fecha_aceptacion: cot.fecha_aceptacion || null,
      },
      { onConflict: ["numero_pedido", "proveedor", "buque_id"] }
    );

    if (error) {
      console.error("Error en autosave:", error.message);
    }
  };

  return (
    <Box mt={8}>
      <Heading size="md" mb={4}>Proveedores</Heading>
      <VStack spacing={6} align="stretch">
        {cotizaciones.map((cot, index) => (
          <Box key={index} p={4} borderWidth={1} borderRadius="md">
            <Stack spacing={4}>
              <Box>
                <Text fontWeight="medium">
                  Proveedor {cot.estado === "aceptada" && "⭐"}
                </Text>
                <Input
                  value={cot.proveedor}
                  onChange={(e) => handleChange(index, "proveedor", e.target.value)}
                />
              </Box>

              <Box>
                <Text fontWeight="medium">Cotización (€)</Text>
                <Input
                  type="number"
                  value={cot.valor}
                  onChange={(e) => handleChange(index, "valor", e.target.value)}
                />
                <Text fontWeight="medium" mt={2}>Fecha aceptación cotización</Text>
                <Input
                  type="date"
                  value={cot.fecha_aceptacion ? cot.fecha_aceptacion.slice(0, 10) : ""}
                  onChange={e => handleChange(index, "fecha_aceptacion", e.target.value)}
                  width="fit-content"
                />
              </Box>

              <HStack mt={2} spacing={4}>
                <Button
                  colorScheme="green"
                  variant={cot.estado === "aceptada" ? "solid" : "outline"}
                  onClick={() => handleChange(index, "estado", "aceptada")}
                >
                  ✅ Aceptar
                </Button>
                <Button
                  colorScheme="red"
                  variant={cot.estado === "cancelada" ? "solid" : "outline"}
                  onClick={() => handleChange(index, "estado", "cancelada")}
                >
                  ❌ Rechazar
                </Button>
              </HStack>

              {/* Cotización PDF */}
              <Box
                border="2px dashed"
                borderColor={isDragging ? "blue.300" : "gray.300"}
                p={6}
                borderRadius="md"
                textAlign="center"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(index);
                  setIsDragging(true);
                }}
                onDragLeave={() => {
                  setDragOverIndex(null);
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  handleDrop(e, index, "cotizacion");
                  setIsDragging(false);
                }}
              >
                <Text fontWeight="medium">Arrastra PDF de Cotización</Text>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e.target.files[0], index, "cotizacion")}
                  display="none"
                  id={`upload-cotizacion-${index}`}
                />
                <FormLabel
                  htmlFor={`upload-cotizacion-${index}`}
                  cursor="pointer"
                  color="blue.600"
                  fontWeight="semibold"
                  textAlign="center"
                  display="block"
                >
                  Seleccionar archivo
                </FormLabel>

                {cot.path_cotizacion && (
                  <>
                    <Text fontSize="sm" mt={2} noOfLines={1}>
                      {cot.path_cotizacion.split("/").pop()}
                    </Text>
                    <HStack mt={2} spacing={4} justify="center">
                      <Button size="sm" colorScheme="blue" onClick={() => handleVerArchivo(cot.path_cotizacion)}>
                        Ver cotización
                      </Button>
                      <Button size="sm" colorScheme="red" variant="outline" onClick={() => handleDeleteArchivo(index, "cotizacion")}>
                        🗑️ Eliminar
                      </Button>
                    </HStack>
                  </>
                )}
              </Box>

              <Box>
                <Text fontWeight="medium">Valor de la Factura (€)</Text>
                <Input
                  type="number"
                  value={cot.valor_factura || ""}
                  onChange={(e) => handleChange(index, "valor_factura", e.target.value)}
                />
              </Box>

              {/* Factura PDF */}
              <Box
                border="2px dashed"
                borderColor={isDragging ? "blue.300" : "gray.300"}
                p={6}
                borderRadius="md"
                textAlign="center"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(index);
                  setIsDragging(true);
                }}
                onDragLeave={() => {
                  setDragOverIndex(null);
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  handleDrop(e, index, "invoice");
                  setIsDragging(false);
                }}
              >
                <Text fontWeight="medium">Arrastra PDF de Factura</Text>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e.target.files[0], index, "invoice")}
                  display="none"
                  id={`upload-invoice-${index}`}
                />
                <FormLabel
                  htmlFor={`upload-invoice-${index}`}
                  cursor="pointer"
                  color="blue.600"
                  fontWeight="semibold"
                  textAlign="center"
                  display="block"
                >
                  Seleccionar archivo
                </FormLabel>

                {cot.path_invoice && (
                  <>
                    <Text fontSize="sm" mt={2} noOfLines={1}>
                      {cot.path_invoice.split("/").pop()}
                    </Text>
                    <HStack mt={2} spacing={4} justify="center">
                      <Button size="sm" colorScheme="blue" onClick={() => handleVerArchivo(cot.path_invoice)}>
                        Ver factura
                      </Button>
                      <Button size="sm" colorScheme="red" variant="outline" onClick={() => handleDeleteArchivo(index, "invoice")}>
                        🗑️ Eliminar
                      </Button>
                    </HStack>
                  </>
                )}
              </Box>

              <Button colorScheme="red" variant="link" onClick={() => handleRemoveCotizacion(index)}>
                Eliminar proveedor
              </Button>
            </Stack>
          </Box>
        ))}
      </VStack>

      <HStack mt={6} spacing={4}>
        {cotizaciones.length < 3 && (
          <Button onClick={handleAddCotizacion}>Añadir proveedor</Button>
        )}
        {cotizaciones.length > 0 && (
          <Button colorScheme="blue" onClick={handleSave}>Guardar cotizaciones</Button>
        )}
      </HStack>
    </Box>
  );
};

CotizacionProveedor.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
  buqueId: PropTypes.string.isRequired,
};

export default CotizacionProveedor;
