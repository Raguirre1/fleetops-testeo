import React, { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  Text,
  VStack,
  Input,
  Button,
  Stack,
  Divider,
  Link,
  useToast,
  HStack,
  FormLabel,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const bucket = "asistencias";

const PagosProveedor = ({ numeroAte }) => {
  const [datosPago, setDatosPago] = useState({
    requiere_pago_anticipado: false,
    factura_no_euro: false,
    gestionado: false,
    factura_proforma_path: "",
    factura_divisa_path: "",
    justificante_pago_path: "",
    factura_final_path: "",
  });

  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchPago = async () => {
      const { data, error } = await supabase
        .from("pagos_asistencia")
        .select("*")
        .eq("numero_ate", numeroAte)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error cargando datos de pago:", error);
      } else if (data) {
        setDatosPago(data);
      }
    };

    fetchPago();
  }, [numeroAte]);

  const uploadPagoFile = async (file, campo) => {
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
    const path = `${numeroAte}/pago/${campo}-${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw new Error(`Error al subir ${campo}: ${uploadError.message}`);

    return path;
  };

  const generarSignedUrl = async (path) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) {
      toast({ title: "No se pudo generar URL firmada", status: "error" });
      return null;
    }
    return data.signedUrl;
  };

  const handleFileUpload = async (e, campo) => {
    let file = null;

    if (e?.target?.files?.length > 0) {
      file = e.target.files[0];
    } else if (e?.dataTransfer?.files?.length > 0) {
      file = e.dataTransfer.files[0];
    }

    if (!file) {
      toast({ title: "Archivo no válido", status: "warning" });
      return;
    }

    try {
      const path = await uploadPagoFile(file, campo);
      const updated = { ...datosPago, [`${campo}_path`]: path };
      setDatosPago(updated);
      toast({ title: "Archivo subido correctamente", status: "success" });
    } catch (error) {
      console.error("Error en subida:", error.message);
      toast({ title: "Error al subir archivo", status: "error" });
    }
  };

  const handleDeleteFile = async (campo) => {
    const path = datosPago[`${campo}_path`];
    if (!path) return;

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      toast({ title: "Error al eliminar archivo", status: "error" });
      return;
    }

    const updated = { ...datosPago, [`${campo}_path`]: "" };
    setDatosPago(updated);

    const { error: updateError } = await supabase.from("pagos_asistencia").upsert(
      {
        ...updated,
        numero_ate: numeroAte,
      },
      { onConflict: "numero_ate" }
    );

    if (updateError) {
      toast({ title: "Error al actualizar base de datos", status: "error" });
    } else {
      toast({ title: "Archivo eliminado", status: "success" });
    }
  };

  const handleGuardar = async () => {
    const { error } = await supabase.from("pagos_asistencia").upsert(
      {
        ...datosPago,
        numero_ate: numeroAte,
      },
      { onConflict: "numero_ate" }
    );

    if (error) {
      toast({ title: "Error al guardar datos", status: "error" });
    } else {
      toast({ title: "Información de pago guardada", status: "success" });
    }
  };

  const renderZonaArchivo = (campo, etiqueta) => {
    const archivoCargado = datosPago[`${campo}_path`];
    const nombreArchivo = archivoCargado?.split("/").pop();

    return (
      <Box
        border="2px dashed"
        borderColor={isDragging ? "blue.300" : "gray.300"}
        p={6}
        borderRadius="md"
        textAlign="center"
        w="full"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileUpload(e, campo);
        }}
      >
        <Text fontWeight="medium" mb={2}>
          Arrastra aquí el archivo PDF de {etiqueta}
        </Text>

        <Input
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileUpload(e, campo)}
          display="none"
          id={`upload-${campo}`}
        />

        <FormLabel
          htmlFor={`upload-${campo}`}
          cursor="pointer"
          color="blue.600"
          fontWeight="semibold"
           display="block" // 👈 Asegura que ocupa toda la línea
        textAlign="center" // 👈 Centra horizontalmente
          _hover={{ textDecoration: "underline" }}
        >
          📎 Seleccionar archivo
        </FormLabel>

        {archivoCargado && (
          <VStack mt={3} spacing={2}>
            <Text fontSize="sm" noOfLines={1}>
              {nombreArchivo}
            </Text>
            <HStack spacing={4}>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={async () => {
                  const url = await generarSignedUrl(archivoCargado);
                  if (url) window.open(url, "_blank");
                }}
              >
                Ver archivo
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                onClick={() => handleDeleteFile(campo)}
              >
                🗑️ Eliminar
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>
    );
  };


    return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Text fontSize="xl" fontWeight="bold" mb={2}>
        Gestión de Pago
      </Text>

      <VStack align="start" spacing={4} w="full">
        <Checkbox
          isChecked={datosPago.requiere_pago_anticipado}
          onChange={(e) =>
            setDatosPago((prev) => ({
              ...prev,
              requiere_pago_anticipado: e.target.checked,
            }))
          }
        >
          Requiere pago anticipado
        </Checkbox>

        {datosPago.requiere_pago_anticipado && (
          <VStack w="full">{renderZonaArchivo("factura_proforma", "Factura Proforma")}</VStack>
        )}

        <Checkbox
          isChecked={datosPago.factura_no_euro}
          onChange={(e) =>
            setDatosPago((prev) => ({
              ...prev,
              factura_no_euro: e.target.checked,
            }))
          }
        >
          Factura en moneda distinta a €
        </Checkbox>

        {datosPago.factura_no_euro && (
          <VStack w="full">{renderZonaArchivo("factura_divisa", "Factura en otra moneda")}</VStack>
        )}

        <Divider />

        <Checkbox
          isChecked={datosPago.gestionado}
          onChange={(e) =>
            setDatosPago((prev) => ({
              ...prev,
              gestionado: e.target.checked,
            }))
          }
        >
          Pago gestionado
        </Checkbox>

        {datosPago.gestionado && (
          <VStack spacing={4} w="full">
            {renderZonaArchivo("justificante_pago", "Justificante de Pago")}
            {renderZonaArchivo("factura_final", "Factura Final")}
          </VStack>
        )}

        <Button colorScheme="blue" onClick={handleGuardar}>
          Guardar datos de pago
        </Button>
      </VStack>
    </Box>
  );

};

export default PagosProveedor;
