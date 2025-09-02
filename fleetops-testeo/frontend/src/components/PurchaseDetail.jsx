import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import ExcelUploadCotizacion from "./ExcelUploadCotizacion";
import CotizacionProveedor from "./CotizacionProveedor";
import Pago from "./Pago";
import { supabase } from "../supabaseClient";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Heading,
  Divider,
  Flex,
  Link,
  useToast,
  HStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";

const PurchaseDetail = ({ pedido, volver }) => {
  const [comentarios, setComentarios] = useState("");
  const [infoadicional, setInfoadicional] = useState("");
  const [archivosSubidos, setArchivosSubidos] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();
  const [nombreBuque, setNombreBuque] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const cancelRef = useRef();

  const loadArchivosSubidos = async () => {
    const folderPath = `${pedido.numeroPedido}/documentos/`;
    const { data: files, error: fileError } = await supabase.storage
      .from("cotizaciones")
      .list(folderPath);

    if (fileError) {
      console.error("Error al cargar archivos:", fileError.message);
      return;
    }

    const archivos = files
      .filter((file) => file.name !== ".emptyFolderPlaceholder")
      .map((file) => ({
        nombre: file.name,
        path: `${folderPath}${file.name}`,
      }));

    setArchivosSubidos(archivos);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Cargar comentarios y info adicional
        const { data, error } = await supabase
          .from("purchase_details")
          .select("comentarios, infoadicional")
          .eq("numeropedido", pedido.numeroPedido)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setComentarios(data.comentarios || "");
          setInfoadicional(data.infoadicional || "");
        }

        // Cargar nombre de buque usando buque_id
        if (pedido.buque_id) {
          const { data: buqueData, error: buqueError } = await supabase
            .from("buques")
            .select("nombre")
            .eq("id", pedido.buque_id)
            .maybeSingle();
          if (!buqueError && buqueData && buqueData.nombre) {
            setNombreBuque(buqueData.nombre);
          } else {
            setNombreBuque("—");
          }
        } else {
          setNombreBuque("—");
        }

        await loadArchivosSubidos();
      } catch (err) {
        setError("Error al cargar los datos. Revisa la consola para más detalles.");
        console.error("Error en loadData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pedido.numeroPedido, pedido.buque_id]);

  const handleSaveToSupabase = async () => {
    try {
      const { error } = await supabase
        .from("purchase_details")
        .upsert(
          {
            numeropedido: pedido.numeroPedido,
            comentarios,
            infoadicional,
          },
          { onConflict: "numeropedido" }
        );

      if (error) throw error;

      toast({ title: "Datos guardados", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      console.error("Error en saveToSupabase:", err);
      toast({ title: "Error al guardar en Supabase", status: "error", duration: 3000, isClosable: true });
    }
  };

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
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "eml", "msg"];

    const validFiles = files.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext) && file.size <= MAX_SIZE;
    });

    if (validFiles.length > 0) {
      setError("");
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
      const path = `${pedido.numeroPedido}/documentos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("cotizaciones")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (!uploadError) {
        setArchivosSubidos((prev) => [...prev, { nombre: fileName, path }]);
        toast({ title: `Archivo ${file.name} subido`, status: "success" });
      } else {
        toast({ title: `Error subiendo ${file.name}`, status: "error" });
      }
    }
  };

  const handleDeleteFile = async (path) => {
    const { error } = await supabase.storage.from("cotizaciones").remove([path]);

    if (error) {
      console.error("❌ Supabase error:", error);
      toast({ title: "Error al eliminar archivo", status: "error" });
    } else {
      setArchivosSubidos((prev) => prev.filter((file) => file.path !== path));
      toast({ title: "Archivo eliminado", status: "success" });
    }
  };

  const handleVerArchivo = async (filePath) => {
    const { data, error } = await supabase.storage
      .from("cotizaciones")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast({ title: "Error al generar enlace", status: "error" });
    }
  };

  // --- Nueva función para mostrar el AlertDialog ---
  const handleVolverConConfirmacion = () => setShowConfirmDialog(true);
  const confirmarVolver = () => {
    setShowConfirmDialog(false);
    volver(pedido);
  };

  return (
    <Box p={6} maxW="6xl" mx="auto">
      <Box mb={6} p={4} bg="gray.100" borderRadius="md">
        <Heading size="md" color="blue.600" mb={2}>📦 Detalle del Pedido</Heading>
        <Text><strong>Nº Pedido:</strong> {pedido.numeroPedido}</Text>
        <Text><strong>Título:</strong> {pedido.tituloPedido || "—"}</Text>
        <Text><strong>Buque:</strong> {nombreBuque || "—"}</Text>
        <Text><strong>Solicitante:</strong> {pedido.usuario || "—"}</Text>
        <Text><strong>Urgencia:</strong> {pedido.urgencia || "—"}</Text>
        <Text><strong>Fecha de pedido:</strong> {pedido.fechaPedido || "—"}</Text>
        <Text><strong>Fecha de entrega:</strong> {pedido.fechaEntrega || "—"}</Text>
        <Text><strong>Cuenta contable:</strong> {pedido.numeroCuenta || "—"}</Text>
        <Text><strong>Estado:</strong> {pedido.estado || "—"}</Text>
      </Box>

      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}
      {isLoading && <Spinner size="xl" />}

      <VStack spacing={6} align="stretch">
        <FormControl>
          <FormLabel>Comentarios</FormLabel>
          <Textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Información adicional</FormLabel>
          <Textarea
            value={infoadicional}
            onChange={(e) => setInfoadicional(e.target.value)}
            rows={4}
          />
        </FormControl>

        <Button onClick={handleSaveToSupabase} colorScheme="blue" isLoading={isLoading}>
          Guardar cambios
        </Button>

        <Divider />

        <Heading size="md">📁 Documentación Adicional</Heading>
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
          <Text fontWeight="medium">Arrastra archivos (PDF, JPG, EML, etc.)</Text>
          <Input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.eml,.msg"
            onChange={handleFileChange}
            display="none"
            id="upload-documentos"
          />
          <FormLabel
            htmlFor="upload-documentos"
            cursor="pointer"
            color="blue.600"
            fontWeight="semibold"
            display="block"
            textAlign="center"
          >
            Seleccionar archivos
          </FormLabel>
        </Box>

        {archivosSubidos.length > 0 && (
          <VStack align="start" spacing={4} mt={4}>
            {archivosSubidos.map((file, index) => (
              <Box
                key={index}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                w="100%"
                bg="gray.50"
                boxShadow="sm"
              >
                <Text fontSize="sm" noOfLines={1}>
                  {file.nombre}
                </Text>
                <HStack mt={2} spacing={3}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleVerArchivo(file.path)}
                  >
                    Ver archivo
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleDeleteFile(file.path)}
                  >
                    🗑️ Eliminar
                  </Button>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <ExcelUploadCotizacion numeroPedido={pedido.numeroPedido} buqueId={pedido.buque_id} />
        <CotizacionProveedor numeroPedido={pedido.numeroPedido} buqueId={pedido.buque_id} />
        <Pago numeroPedido={pedido.numeroPedido} buqueId={pedido.buque_id} />

        <Button onClick={handleVolverConConfirmacion} colorScheme="gray" mt={6}>
          Volver
        </Button>
      </VStack>

      {/* ALERT DIALOG Chakra para confirmar salida */}
      <AlertDialog
        isOpen={showConfirmDialog}
        leastDestructiveRef={cancelRef}
        onClose={() => setShowConfirmDialog(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ¿Seguro que quieres volver?
            </AlertDialogHeader>
            <AlertDialogBody>
              Asegúrate de <b>guardar los cambios</b> antes de continuar.<br />
              <span style={{ color: "red" }}>Esta acción puede descartar cambios no guardados.</span>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={confirmarVolver} ml={3}>
                Sí, volver
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
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
  }).isRequired,
  volver: PropTypes.func.isRequired,
};

export default PurchaseDetail;
