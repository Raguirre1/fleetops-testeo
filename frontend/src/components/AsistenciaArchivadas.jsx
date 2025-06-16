// AsistenciaArchivadas.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Button,
  useToast,
  Tooltip,
  Flex,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const AsistenciaArchivadas = ({ onVolver, onVerDetalle }) => {
  const [asistencias, setAsistencias] = useState([]);
  const [estadoFactura, setEstadoFactura] = useState({});
  const toast = useToast();

  const cargarArchivadas = async () => {
    const { data, error } = await supabase
      .from("solicitudes_asistencia")
      .select("*")
      .eq("archivado", true);

    if (!error) setAsistencias(data);
    else toast({ title: "Error al cargar asistencias archivadas", status: "error", duration: 3000 });
  };

  const cargarEstadoFacturas = async () => {
    const { data, error } = await supabase
      .from("asistencias_proveedor")
      .select("numero_asistencia, estado, valor_factura");

    if (!error && data) {
      const mapa = {};
      data.forEach((c) => {
        if (c.estado === "aceptada" && (!c.valor_factura || Number(c.valor_factura) === 0)) {
          mapa[c.numero_asistencia] = true; // pendiente de factura
        }
      });
      setEstadoFactura(mapa);
    }
  };

  const desarchivarAsistencia = async (numeroAte) => {
    const { error } = await supabase
      .from("solicitudes_asistencia")
      .update({ archivado: false })
      .eq("numero_ate", numeroAte);

    if (!error) {
      toast({ title: "Asistencia desarchivada", status: "success", duration: 3000 });
      cargarArchivadas();
    } else {
      toast({ title: "Error al desarchivar", status: "error", duration: 3000 });
    }
  };

  useEffect(() => {
    cargarArchivadas();
    cargarEstadoFacturas();
  }, []);

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">📦 Asistencias Archivadas</Heading>
        <Button onClick={onVolver} colorScheme="gray" size="sm">
          Volver a asistencias activas
        </Button>
      </Flex>

      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Nº Asistencia</Th>
            <Th>Título</Th>
            <Th>Buque</Th>
            <Th>Usuario</Th>
            <Th>Estado</Th>
            <Th>Factura</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {asistencias.map((a) => (
            <Tr key={a.numero_ate}>
              <Td fontWeight="bold">{a.numero_ate}</Td>
              <Td>{a.titulo_asistencia}</Td>
              <Td>{a.buque}</Td>
              <Td>{a.usuario}</Td>
              <Td>{a.estado || "-"}</Td>
              <Td>
                {estadoFactura[a.numero_ate] ? (
                  <Tooltip label="Falta cargar la factura final" hasArrow>
                    <span>🟡</span>
                  </Tooltip>
                ) : (
                  "✅"
                )}
              </Td>
              <Td>
                <Flex gap={1}>
                  <Tooltip label="Desarchivar asistencia" hasArrow>
                    <Button size="xs" onClick={() => desarchivarAsistencia(a.numero_ate)}>
                      🔁 Desarchivar
                    </Button>
                  </Tooltip>
                  <Tooltip label="Ver detalles de la asistencia" hasArrow>
                    <Button size="xs" onClick={() => onVerDetalle(a)}>
                      🔍 Ver
                    </Button>
                  </Tooltip>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default AsistenciaArchivadas;
