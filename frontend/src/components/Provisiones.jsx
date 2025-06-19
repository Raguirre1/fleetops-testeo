import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Heading,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  useToast,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import ProvisionesDetalle from "./ProvisionesDetalle";
import ProvisionesEnviadas from "./ProvisionesEnviadas";
import { useFlota } from "./FlotaContext"; // Importamos contexto

const cuentas = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite",
];

const Provisiones = () => {
  const { buques } = useFlota(); // buques = [{id, nombre}]
  const [resumen, setResumen] = useState({});
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaDetalle, setVistaDetalle] = useState(null);
  const [mostrarEnviadas, setMostrarEnviadas] = useState(false);
  const [refrescar, setRefrescar] = useState(false);
  const toast = useToast();

  const cargarResumen = async () => {
    setLoading(true);

    // Cambiado: seleccionamos buque_id y no buque por nombre
    const { data: pedidos, error: errorPedidos } = await supabase
      .from("solicitudes_compra")
      .select("numero_pedido, buque_id, numero_cuenta, estado")
      .in("estado", ["Pedido Activo", "Recibido"]);

    const { data: cotizaciones, error: errorCot } = await supabase
      .from("cotizaciones_proveedor")
      .select("numero_pedido, proveedor, valor, valor_factura, estado");

    const { data: asistencias, error: errorAsist } = await supabase
      .from("solicitudes_asistencia")
      .select("numero_ate, buque_id, numero_cuenta");

    const { data: cotizacionesAsistencia, error: errorCotAsist } = await supabase
      .from("asistencias_proveedor")
      .select("numero_asistencia, proveedor, valor, valor_factura, estado");

    if (errorPedidos || errorCot || errorAsist || errorCotAsist) {
      console.error("Errores en cargas:", { errorPedidos, errorCot, errorAsist, errorCotAsist });
      setLoading(false);
      return;
    }

    const resumenTemp = {};
    const detallesTemp = [];

    pedidos.forEach((pedido) => {
      const cotAprobadas = cotizaciones.filter(
        (c) =>
          c.numero_pedido === pedido.numero_pedido &&
          c.estado === "aceptada" &&
          (!c.valor_factura || Number(c.valor_factura) === 0)
      );

      cotAprobadas.forEach((c) => {
        detallesTemp.push({
          buque_id: pedido.buque_id, // Cambiado a buque_id
          numero_pedido: pedido.numero_pedido,
          proveedor: c.proveedor,
          cuenta: pedido.numero_cuenta || "Sin cuenta",
          valor: Number(c.valor) || 0,
        });
      });

      const suma = cotAprobadas.reduce(
        (acc, c) => acc + (Number(c.valor) || 0),
        0
      );

      if (!resumenTemp[pedido.buque_id]) resumenTemp[pedido.buque_id] = {};
      const cuenta = pedido.numero_cuenta || "Sin cuenta";
      resumenTemp[pedido.buque_id][cuenta] = (resumenTemp[pedido.buque_id][cuenta] || 0) + suma;
    });

    asistencias.forEach((asistencia) => {
      const cotAprobadas = cotizacionesAsistencia.filter(
        (c) =>
          c.numero_asistencia === asistencia.numero_ate &&
          c.estado === "aceptada" &&
          (!c.valor_factura || Number(c.valor_factura) === 0)
      );

      cotAprobadas.forEach((c) => {
        detallesTemp.push({
          buque_id: asistencia.buque_id, // Cambiado a buque_id
          numero_pedido: asistencia.numero_ate,
          proveedor: c.proveedor,
          cuenta: asistencia.numero_cuenta || "Sin cuenta",
          valor: Number(c.valor) || 0,
        });
      });

      const suma = cotAprobadas.reduce(
        (acc, c) => acc + (Number(c.valor) || 0),
        0
      );

      if (!resumenTemp[asistencia.buque_id]) resumenTemp[asistencia.buque_id] = {};
      const cuenta = asistencia.numero_cuenta || "Sin cuenta";
      resumenTemp[asistencia.buque_id][cuenta] = (resumenTemp[asistencia.buque_id][cuenta] || 0) + suma;
    });

    setResumen(resumenTemp);
    setDetalles(detallesTemp);
    setLoading(false);
  };

  useEffect(() => {
    cargarResumen();
    // eslint-disable-next-line
  }, [refrescar]);

  if (!buques || buques.length === 0) return null; // Espera a cargar los buques

  // Genera diccionario {id: nombre} para lookup rápido
  const buquesDict = Object.fromEntries(buques.map(b => [b.id, b.nombre]));

  const totalPorCuenta = {};
  const totalPorBuque = {};
  let totalGeneral = 0;

  // Recorrer por buque_id, pero mostrar nombre
  buques.forEach((buque) => {
    totalPorBuque[buque.id] = 0;
    cuentas.forEach((cuenta) => {
      const valor = resumen[buque.id]?.[cuenta] || 0;
      totalPorBuque[buque.id] += valor;
      totalPorCuenta[cuenta] = (totalPorCuenta[cuenta] || 0) + valor;
      totalGeneral += valor;
    });
  });

  const exportarResumenExcel = () => {
    const filas = [];
    buques.forEach((buque) => {
      const fila = { Buque: buque.nombre };
      cuentas.forEach((cuenta) => {
        fila[cuenta] = resumen[buque.id]?.[cuenta] || 0;
      });
      fila["Total"] = totalPorBuque[buque.id];
      filas.push(fila);
    });

    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Provisiones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Resumen_Provisiones.xlsx`);
  };

  const enviarProvisiones = async () => {
    const fecha = new Date();
    const mes = fecha.toLocaleString("es-ES", { month: "long" });
    const año = fecha.getFullYear();

    if (!resumen || Object.keys(resumen).length === 0) {
      toast({
        title: "No hay provisiones para enviar.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const { error } = await supabase.from("provisiones_enviadas").insert([{
      resumen: JSON.stringify(resumen),
      detalles: JSON.stringify(detalles),
      mes,
      anio: año,
      inserted_at: fecha.toISOString(),
    }]);

    if (error) {
      toast({
        title: "Error al enviar provisiones",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Provisiones guardadas como enviadas",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (vistaDetalle) {
    const buqueObj = buques.find(b => b.id === vistaDetalle.buque);
    const buqueNombre = buqueObj ? buqueObj.nombre : vistaDetalle.buque;
    return (
      <ProvisionesDetalle
        buque={vistaDetalle.buque}
        buqueNombre={buqueNombre}       
        cuenta={vistaDetalle.cuenta}
        onBack={() => {
          setVistaDetalle(null);
          setRefrescar(prev => !prev);
        }}
      />
    );
  }

  if (mostrarEnviadas) {
    return <ProvisionesEnviadas onBack={() => setMostrarEnviadas(false)} />;
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4} gap={2} wrap="wrap">
        <Heading size="lg">📊 Resumen Provisiones por Buque y Cuenta</Heading>
        <Flex gap={2}>
          <Button colorScheme="blue" onClick={exportarResumenExcel} leftIcon={<DownloadIcon />}>
            Exportar Excel
          </Button>
          <Button colorScheme="green" onClick={enviarProvisiones}>
            Enviar Provisiones
          </Button>
          <Button colorScheme="gray" onClick={() => setMostrarEnviadas(true)}>
            Ver Provisiones Enviadas
          </Button>
        </Flex>
      </Flex>

      {loading ? (
        <Spinner size="xl" />
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Buque</Th>
                {cuentas.map((cuenta) => (
                  <Th key={cuenta} isNumeric>{cuenta}</Th>
                ))}
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {buques.map((buque) => (
                <Tr key={buque.id}>
                  <Td fontWeight="bold">{buque.nombre}</Td>
                  {cuentas.map((cuenta) => {
                    const valor = resumen[buque.id]?.[cuenta] || 0;
                    return (
                      <Td
                        key={cuenta}
                        isNumeric
                        _hover={{ bg: "gray.100", cursor: "pointer" }}
                        onClick={() =>
                          valor > 0 &&
                          setVistaDetalle({ buque: buque.id, cuenta: cuenta })
                        }
                      >
                        {valor > 0
                          ? valor.toLocaleString("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            })
                          : "-"}
                      </Td>
                    );
                  })}
                  <Td isNumeric fontWeight="bold">
                    {totalPorBuque[buque.id].toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </Td>
                </Tr>
              ))}
              <Tr bg="gray.100">
                <Td fontWeight="bold">TOTAL</Td>
                {cuentas.map((cuenta) => (
                  <Td key={cuenta} isNumeric fontWeight="bold">
                    {totalPorCuenta[cuenta]?.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }) || "-"}
                  </Td>
                ))}
                <Td isNumeric fontWeight="bold">
                  {totalGeneral.toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default Provisiones;
