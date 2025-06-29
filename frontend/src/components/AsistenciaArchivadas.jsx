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
  Input,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const AsistenciaArchivadas = ({ onVolver, onVerDetalle }) => {
  const [asistencias, setAsistencias] = useState([]);
  const [estadoFactura, setEstadoFactura] = useState({});
  const [filtro, setFiltro] = useState("");
  const [ordenCampo, setOrdenCampo] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
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

  // Filtro de búsqueda
  const asistenciasFiltradas = asistencias.filter((a) => {
    const texto = filtro.toLowerCase();
    return (
      a.numero_ate?.toLowerCase().includes(texto) ||
      a.titulo_ate?.toLowerCase().includes(texto) ||
      a.usuario?.toLowerCase().includes(texto) ||
      (a.estado || "").toLowerCase().includes(texto)
    );
  });

  // Ordenar al hacer click en la cabecera
  const ordenarPorCampo = (campo) => {
    const asc = ordenCampo === campo ? !ordenAscendente : true;
    const asistenciasOrdenadas = [...asistenciasFiltradas].sort((a, b) => {
      let valorA = a[campo] || "";
      let valorB = b[campo] || "";
      return asc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
    });
    setOrdenCampo(campo);
    setOrdenAscendente(asc);
    setAsistencias(asistenciasOrdenadas);
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">📦 Asistencias Archivadas</Heading>
        <Button onClick={onVolver} colorScheme="gray" size="sm">
          Volver a asistencias activas
        </Button>
      </Flex>
      <Flex mb={3} gap={2} align="center">
        <Input
          placeholder="Buscar asistencia, título, usuario o estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          size="sm"
          maxW="300px"
        />
      </Flex>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("numero_ate")}>
              Nº Asistencia {ordenCampo === "numero_ate" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("titulo_ate")}>
              Título {ordenCampo === "titulo_ate" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("usuario")}>
              Usuario {ordenCampo === "usuario" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("estado")}>
              Estado {ordenCampo === "estado" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th>Factura</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {asistenciasFiltradas.map((a) => (
            <Tr key={a.numero_ate}>
              <Td fontWeight="bold">{a.numero_ate}</Td>
              <Td>{a.titulo_ate}</Td>
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
