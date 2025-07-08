import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Heading,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Spinner,
  useToast,
  Badge,
  Flex,
  Divider,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";
import { useFlota } from "./FlotaContext";

const DashboardGeneral = ({ onIrAModulos }) => {
  const [resumen, setResumen] = useState({});
  const [cargando, setCargando] = useState(true);
  const toast = useToast();
  const { flotaSeleccionada } = useFlota();

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: buques } = await supabase
        .from("buques")
        .select("id, nombre")
        .eq("flota_id", flotaSeleccionada.id);

      const { data: pedidos } = await supabase
        .from("solicitudes_compra")
        .select("numero_pedido, estado, buque_id");

      const { data: asistencias } = await supabase
        .from("solicitudes_asistencia")
        .select("numero_ate, estado, buque_id");

      const { data: cotizaciones } = await supabase
        .from("cotizaciones_proveedor")
        .select("numero_pedido, valor, valor_factura");

      const { data: cotizacionesAsistencias } = await supabase
        .from("asistencias_proveedor")
        .select("numero_asistencia, valor, valor_factura");

      const { data: pagos } = await supabase
        .from("pagos")
        .select("numero_pedido, requiere_pago_anticipado, gestionado");

      const { data: pagosAsistencias } = await supabase
        .from("pagos_asistencia")
        .select("numero_ate, requiere_pago_anticipado, gestionado");

      const resumenPorBuque = {};

      for (const bq of buques) {
        const pedidosBuque = pedidos.filter(p => p.buque_id === bq.id);
        const asistenciasBuque = asistencias.filter(a => a.buque_id === bq.id);

        // --- PEDIDOS ---
        const pedidosEnConsulta = pedidosBuque.filter(p => p.estado === "En Consulta").length;
        const pedidosSinCotizacion = pedidosBuque.filter(p =>
          !cotizaciones.some(c => c.numero_pedido === p.numero_pedido && c.valor != null)
        );
        const pedidosSinFactura = pedidosBuque.filter(p =>
          cotizaciones.some(c =>
            c.numero_pedido === p.numero_pedido &&
            c.valor != null &&
            (!c.valor_factura || String(c.valor_factura).trim() === "")
          )
        );
        // SOLO CONTAR PENDIENTES (no gestionados)
        const pedidosAnticipo = pedidosBuque.filter(p =>
          pagos.some(pg =>
            pg.numero_pedido === p.numero_pedido &&
            pg.requiere_pago_anticipado &&
            !pg.gestionado // SOLO pendientes
          )
        );

        // --- ASISTENCIAS ---
        const asistenciasEnConsulta = asistenciasBuque.filter(a => a.estado === "En Consulta").length;
        const asistenciasSinCotizacion = asistenciasBuque.filter(a =>
          !cotizacionesAsistencias.some(c =>
            String(c.numero_asistencia).trim() === String(a.numero_ate).trim() && c.valor != null
          )
        );
        const asistenciasSinFactura = asistenciasBuque.filter(a =>
          cotizacionesAsistencias.some(c =>
            String(c.numero_asistencia).trim() === String(a.numero_ate).trim() &&
            c.valor != null &&
            (!c.valor_factura || String(c.valor_factura).trim() === "")
          )
        );
        // SOLO CONTAR PENDIENTES (no gestionados)
        const asistenciasAnticipo = asistenciasBuque.filter(a =>
          pagosAsistencias.some(pg =>
            String(pg.numero_ate).trim() === String(a.numero_ate).trim() &&
            pg.requiere_pago_anticipado &&
            !pg.gestionado // SOLO pendientes
          )
        );

        resumenPorBuque[bq.nombre] = {
          pedidos: {
            consulta: pedidosEnConsulta,
            sinCotizacion: pedidosSinCotizacion.length,
            sinFactura: pedidosSinFactura.length,
            anticipo: pedidosAnticipo.length,
          },
          asistencias: {
            consulta: asistenciasEnConsulta,
            sinCotizacion: asistenciasSinCotizacion.length,
            sinFactura: asistenciasSinFactura.length,
            anticipo: asistenciasAnticipo.length,
          },
        };
      }

      setResumen(resumenPorBuque);
    } catch (error) {
      toast({ title: "Error al cargar datos", description: error.message, status: "error" });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line
  }, []);

  if (cargando) {
    return (
      <Box p={10} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Cargando resumen general...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={6} textAlign="center">
        📊 Resumen General de la Flota
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {Object.entries(resumen).map(([buque, datos]) => (
          <Box
            key={buque}
            borderWidth={1}
            rounded="lg"
            p={5}
            bg="white"
            shadow="base"
            _hover={{ shadow: "lg" }}
          >
            <Heading size="md" mb={3}>🚢 {buque}</Heading>

            <Divider mb={2} />

            <VStack align="start" spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={1}>🛒 Pedidos</Text>
                <HStack spacing={2} wrap="wrap" pl={2}>
                  <Badge colorScheme="yellow" rounded="md">EN CONSULTA: {datos.pedidos.consulta}</Badge>
                  <Badge colorScheme="orange" rounded="md">SIN COTIZACIÓN: {datos.pedidos.sinCotizacion}</Badge>
                  <Badge colorScheme="purple" rounded="md">SIN FACTURA: {datos.pedidos.sinFactura}</Badge>
                  <Badge colorScheme="red" rounded="md">REQUIERE ANTICIPO: {datos.pedidos.anticipo}</Badge>
                </HStack>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={1}>🔧 Asistencias</Text>
                <HStack spacing={2} wrap="wrap" pl={2}>
                  <Badge colorScheme="yellow" rounded="md">EN CONSULTA: {datos.asistencias.consulta}</Badge>
                  <Badge colorScheme="orange" rounded="md">SIN COTIZACIÓN: {datos.asistencias.sinCotizacion}</Badge>
                  <Badge colorScheme="purple" rounded="md">SIN FACTURA: {datos.asistencias.sinFactura}</Badge>
                  <Badge colorScheme="red" rounded="md">REQUIERE ANTICIPO: {datos.asistencias.anticipo}</Badge>
                </HStack>
              </Box>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      <Flex mt={10} justify="center">
        <Button colorScheme="blue" size="lg" onClick={onIrAModulos}>
          Ir a Módulos Principales
        </Button>
      </Flex>
    </Box>
  );
};

export default DashboardGeneral;
