import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Text,
  Input,
  VStack,
  Flex,
  Button,
  FormLabel,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const bucket = "asistencias";

const Documentaciontecnica = ({ numeroAsistencia }) => {
  const [archivos, setArchivos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();

  const path = `${numeroAsistencia}/documentacion_tecnica`;

  const loadArchivos = async () => {
    const { data: files, error } = await supabase.storage.from(bucket).list(path);

    if (error) {
      console.error("Error al listar archivos:", error.message);
      return;
    }

    if (!files || files.length === 0) {
      setArchivos([]);
      return;
    }

    const archivosCargados = files
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map((file) => ({
        nombre: file.name,
        ruta: `${path}/${file.name}`,
      }));

    setArchivos(archivosCargados);
  };

  useEffect(() => {
    if (numeroAsistencia) {
      loadArchivos();
    }
  }, [numeroAsistencia]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateAndUpload(files);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    validateAndUpload(files);
  };

  const validateAndUpload = (files) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "eml", "msg"];

    const validFiles = files.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext) && file.size <= MAX_SIZE;
    });

    if (validFiles.length > 0) {
      uploadFiles(validFiles);
    } else {
      toast({ title: "Archivo no válido o excede 10MB", status: "warning" });
    }
  };

  const uploadFiles = async (files) => {
    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
      const fileName = `${timestamp}_${safeName}`;
      const ruta = `${path}/${fileName}`;

      const { error } = await supabase.storage.from(bucket).upload(ruta, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (!error) {
        toast({ title: `Archivo ${file.name} subido`, status: "success" });
      } else {
        toast({ title: `Error subiendo ${file.name}`, status: "error" });
      }
    }
    loadArchivos();
  };

  const generarSignedUrl = async (ruta) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(ruta, 3600);

    if (error) {
      toast({ title: "No se pudo generar URL firmada", status: "error" });
      return null;
    }

    return data.signedUrl;
  };

  const eliminarArchivo = async (ruta) => {
    const { error } = await supabase.storage.from(bucket).remove([ruta]);

    if (!error) {
      toast({ title: "Archivo eliminado", status: "success" });
      setArchivos((prev) => prev.filter((f) => f.ruta !== ruta));
    } else {
      toast({ title: "Error al eliminar archivo", status: "error" });
    }
  };

  return (
    <Box mt={6}>
      <Text fontSize="xl" fontWeight="bold" mb={2}>
        📁 Documentación Técnica
      </Text>

      <Box
        border="2px dashed"
        borderColor={isDragging ? "blue.300" : "gray.300"}
        p={6}
        borderRadius="md"
        textAlign="center"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <Text>Arrastra archivos aquí o</Text>
        <Input
          type="file"
          multiple
          onChange={handleFileChange}
          display="none"
          id="doc-upload"
        />
        <FormLabel htmlFor="doc-upload" cursor="pointer" color="blue.600">
          Selecciona archivos
        </FormLabel>
        <Text fontSize="sm" color="gray.500">
          Formatos permitidos: PDF, JPG, PNG, EML, MSG (máx. 10MB)
        </Text>
      </Box>

      {archivos.length > 0 && (
        <VStack align="start" spacing={3} mt={4}>
          {archivos.map((file, index) => (
            <Flex
              key={index}
              w="full"
              justify="space-between"
              align="center"
              borderWidth="1px"
              borderRadius="md"
              p={2}
              bg="gray.50"
            >
              <Text>{file.nombre}</Text>
              <HStack>
                <Button
                  size="sm"
                  onClick={async () => {
                    const url = await generarSignedUrl(file.ruta);
                    if (url) window.open(url, "_blank");
                  }}
                >
                  Ver archivo
                </Button>
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => eliminarArchivo(file.ruta)}
                >
                  🗑️
                </Button>
              </HStack>
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  );
};

Documentaciontecnica.propTypes = {
  numeroAsistencia: PropTypes.string.isRequired,
};

export default Documentaciontecnica;
