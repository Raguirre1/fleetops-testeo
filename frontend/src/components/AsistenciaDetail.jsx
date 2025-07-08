import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Documentaciontecnica from "./Documentaciontecnica";
import AsistenciaProveedor from "./AsistenciaProveedor";
import PagosProveedor from "./PagosProveedor";
import { supabase } from "../supabaseClient";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Heading,
  Divider,
  useToast,
} from "@chakra-ui/react";

const AsistenciaDetail = ({ asistencia, volver }) => {
  const [comentarios, setComentarios] = useState("");
  const [infoadicional, setInfoadicional] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nombreBuque, setNombreBuque] = useState("—");
  const toast = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Cargar comentarios e info adicional
        const { data, error } = await supabase
          .from("asistencias_info")
          .select("comentarios, info_adicional")
          .eq("numero_ate", asistencia.numeroAsistencia)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setComentarios(data.comentarios || "");
          setInfoadicional(data.info_adicional || "");
        }

        // Cargar nombre del buque usando buque_id
        if (asistencia.buque_id) {
          const { data: buqueData, error: buqueError } = await supabase
            .from("buques")
            .select("nombre")
            .eq("id", asistencia.buque_id)
            .maybeSingle();
          if (!buqueError && buqueData && buqueData.nombre) {
            setNombreBuque(buqueData.nombre);
          } else {
            setNombreBuque("—");
          }
        } else {
          setNombreBuque("—");
        }
      } catch (err) {
        setError("Error al cargar los datos.");
        console.error("Error en loadData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (asistencia?.numeroAsistencia) {
      loadData();
    }
  }, [asistencia]);

  const handleSaveToSupabase = async () => {
    try {
      const { error } = await supabase
        .from("asistencias_info")
        .upsert(
          {
            numero_ate: asistencia.numeroAsistencia,
            comentarios,
            info_adicional: infoadicional,
          },
          { onConflict: "numero_ate" }
        );

      if (error) throw error;

      toast({ title: "Datos guardados", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      console.error("Error en saveToSupabase:", err);
      toast({ title: "Error al guardar", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleVolverConConfirmacion = () => {
    const confirmar = window.confirm(
      "¿Seguro que quieres volver?\nAsegúrate de guardar los cambios antes de continuar."
    );
    if (confirmar) {
      volver(asistencia);
    }
  };

  return (
    <Box p={6} maxW="4xl" mx="auto">
      <Box mb={6} p={4} bg="gray.100" borderRadius="md">
        <Heading size="md" color="blue.600" mb={2}>🛠️ Detalle de Asistencia Técnica</Heading>
        <Text><strong>Nº ATE:</strong> {asistencia.numeroAsistencia}</Text>
        <Text><strong>Título:</strong> {asistencia.tituloAsistencia || "—"}</Text>
        <Text><strong>Buque:</strong> {nombreBuque}</Text>
        <Text><strong>Solicitante:</strong> {asistencia.usuario || "—"}</Text>
        <Text><strong>Urgencia:</strong> {asistencia.urgencia || "—"}</Text>
        <Text><strong>Fecha de solicitud:</strong> {asistencia.fechaSolicitud || "—"}</Text>
        <Text><strong>Cuenta contable:</strong> {asistencia.numeroCuenta || "—"}</Text>
        <Text><strong>Estado:</strong> {asistencia.estado || "—"}</Text>
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

        {/* Sección de documentación técnica */}
        <Documentaciontecnica numeroAsistencia={asistencia.numeroAsistencia} />

        <Divider />

        <AsistenciaProveedor numeroAsistencia={asistencia.numeroAsistencia} buqueId={asistencia.buque_id} />
        <PagosProveedor numeroAte={asistencia.numeroAsistencia} buqueId={asistencia.buque_id} />

        <Button onClick={handleVolverConConfirmacion} colorScheme="gray" mt={6}>
          Volver
        </Button>
      </VStack>
    </Box>
  );
};

AsistenciaDetail.propTypes = {
  asistencia: PropTypes.object.isRequired,
  volver: PropTypes.func.isRequired,
};

export default AsistenciaDetail;
