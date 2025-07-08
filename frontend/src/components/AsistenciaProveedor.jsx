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

const AsistenciaProveedor = ({ numeroAsistencia, buqueId }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchCotizaciones = async () => {
      if (!numeroAsistencia || !buqueId) return;
      const { data, error } = await supabase
        .from("asistencias_proveedor")
        .select(
          "numero_asistencia, proveedor, valor, valor_factura, estado, path_cotizacion, path_invoice, created_at, fecha_aceptacion, buque_id"
        )
        .eq("numero_asistencia", numeroAsistencia)
        .eq("buque_id", buqueId);

      if (error) {
        console.error("Error cargando cotizaciones:", error);
      } else {
        setCotizaciones(data);
      }
    };

    fetchCotizaciones();
  }, [numeroAsistencia, buqueId]);

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
    const proveedor = cotizaciones[index].proveedor;

    if (proveedor && proveedor.trim() !== "") {
      try {
        const { error } = await supabase
          .from("asistencias_proveedor")
          .delete()
          .match({ numero_asistencia: numeroAsistencia, proveedor, buque_id: buqueId });

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
    }

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
    const path = `${numeroAsistencia}/${sanitizedProveedor}/${tipo}-${Date.now()}.pdf`;

    const { error } = await supabase.storage
      .from("asistencias")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error(`Error al subir ${tipo}: ` + error.message);

    return path;
  };

  const generarSignedUrl = async (path) => {
    const { data, error } = await supabase.storage
      .from("asistencias")
      .createSignedUrl(path, 3600);

    if (error) {
      toast({ title: "No se pudo generar URL firmada", status: "error" });
      return null;
    }

    return data.signedUrl;
  };

  const deleteFileFromSupabase = async (path) => {
    const { error } = await supabase.storage.from("asistencias").remove([path]);
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

  const handleSave = async () => {
    const incompletas = cotizaciones.some((c) => !c.proveedor?.trim());

    if (incompletas) {
      toast({
        title: "Debes rellenar el nombre del proveedor",
        status: "error",
      });
      return;
    }

    const sinPdf = cotizaciones.some((c) => !c.path_cotizacion);

    if (sinPdf) {
      toast({
        title: "Advertencia",
        description: "Se guardarán cotizaciones sin PDF adjunto. Añade un archivo si está disponible.",
        status: "warning",
        duration: 5000,
      });
    }

    try {
      for (const cot of cotizaciones) {
        const dataToSend = {
          numero_asistencia: numeroAsistencia,
          proveedor: cot.proveedor.trim(),
          buque_id: buqueId,
          valor: isNaN(parseFloat(cot.valor)) ? 0 : parseFloat(cot.valor),
          estado: cot.estado || "pendiente",
          path_cotizacion: cot.path_cotizacion || null,
          path_invoice: cot.path_invoice || null,
          valor_factura: isNaN(parseFloat(cot.valor_factura)) ? 0 : parseFloat(cot.valor_factura),
          fecha_aceptacion: cot.fecha_aceptacion || null,
        };

        const { error } = await supabase
          .from("asistencias_proveedor")
          .upsert(dataToSend, {
            onConflict: ["numero_asistencia", "proveedor", "buque_id"],
          });

        if (error) {
          console.error("Error detallado:", error);
          toast({
            title: "Error al guardar en Supabase",
            description: error.message,
            status: "error",
          });
          return;
        }
      }

      toast({ title: "Cotizaciones guardadas", status: "success" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error inesperado", status: "error" });
    }
  };

  return (
    <Box mt={8}>
      <Heading size="md" mb={4}>
        Proveedores
      </Heading>
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
                  onChange={(e) =>
                    handleChange(index, "proveedor", e.target.value)
                  }
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Para modificar el nombre del proveedor, elimínalo y vuelve a
                  añadirlo.
                </Text>
              </Box>

              <Box>
                <Text fontWeight="medium">Cotización (€)</Text>
                <Input
                  type="number"
                  value={cot.valor}
                  onChange={(e) =>
                    handleChange(index, "valor", e.target.value)
                  }
                />
                <Text fontWeight="medium" mt={2}>
                  Fecha aceptación cotización
                </Text>
                <Input
                  type="date"
                  value={
                    cot.fecha_aceptacion ? cot.fecha_aceptacion.slice(0, 10) : ""
                  }
                  onChange={(e) =>
                    handleChange(index, "fecha_aceptacion", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFileUpload(e.target.files[0], index, "cotizacion")
                  }
                  display="none"
                  id={`upload-cotizacion-${index}`}
                />
                <FormLabel
                  htmlFor={`upload-cotizacion-${index}`}
                  cursor="pointer"
                  color="blue.600"
                  fontWeight="semibold"
                  display="block"
                  textAlign="center"
                >
                  Seleccionar archivo
                </FormLabel>

                {cot.path_cotizacion ? (
                  <VStack mt={3} spacing={2}>
                    <Text fontSize="sm" noOfLines={1}>
                      {cot.path_cotizacion.split("/").pop()}
                    </Text>
                    <HStack spacing={4} justify="center">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={async () => {
                          const url = await generarSignedUrl(
                            cot.path_cotizacion
                          );
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        Ver archivo
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleDeleteArchivo(index, "cotizacion")}
                      >
                        🗑️ Eliminar
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="orange.500" mt={3}>
                    Estimación sin PDF adjunto
                  </Text>
                )}
              </Box>

              <Box>
                <Text fontWeight="medium">Valor de la Factura (€)</Text>
                <Input
                  type="number"
                  value={cot.valor_factura || ""}
                  onChange={(e) =>
                    handleChange(index, "valor_factura", e.target.value)
                  }
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
                  onChange={(e) =>
                    handleFileUpload(e.target.files[0], index, "invoice")
                  }
                  display="none"
                  id={`upload-invoice-${index}`}
                />
                <FormLabel
                  htmlFor={`upload-invoice-${index}`}
                  cursor="pointer"
                  color="blue.600"
                  fontWeight="semibold"
                  display="block"
                  textAlign="center"
                >
                  Seleccionar archivo
                </FormLabel>

                {/* Mostrar nombre del archivo */}
                {cot.path_invoice && (
                  <>
                    <Text fontSize="sm" mt={2} noOfLines={1}>
                      {cot.path_invoice.split("/").pop()}
                    </Text>
                    <HStack mt={2} spacing={4} justify="center">
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={async () => {
                          const url = await generarSignedUrl(cot.path_invoice);
                          if (url) window.open(url, "_blank");
                        }}
                      >
                        Ver factura
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleDeleteArchivo(index, "invoice")}
                      >
                        🗑️ Eliminar
                      </Button>
                    </HStack>
                  </>
                )}
              </Box>

              <Button
                colorScheme="red"
                variant="link"
                onClick={() => handleRemoveCotizacion(index)}
              >
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
          <Button colorScheme="blue" onClick={handleSave}>
            Guardar cotizaciones
          </Button>
        )}
      </HStack>
    </Box>
  );
};

AsistenciaProveedor.propTypes = {
  numeroAsistencia: PropTypes.string.isRequired,
  buqueId: PropTypes.string.isRequired,
};

export default AsistenciaProveedor;
