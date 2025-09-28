// src/components/InformeCuentas.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Select,
  Spinner, Text, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button, HStack, useDisclosure, useToast
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useFlota } from "./FlotaContext";
import InformeCuentasDetalles from "./InformeCuentasDetalles";
import AjusteCuentas from "./AjusteCuentas";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const mesesCorto = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ORDEN_CUENTAS = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite"
];

export default function InformeCuentas() {
  const { buques } = useFlota();
  const toast = useToast();
  const [selectedBuque, setSelectedBuque] = useState("");
  const [selectedMes, setSelectedMes] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const { isOpen: isAjusteOpen, onOpen: onAjusteOpen, onClose: onAjusteClose } = useDisclosure();

  useEffect(() => {
    if (selectedBuque && selectedMes && anioSeleccionado) cargarResumen();
  }, [selectedBuque, selectedMes, anioSeleccionado]);

  const cargarResumen = async () => {
    setLoading(true);
    const mesNum = meses.indexOf(selectedMes) + 1;

    const { data: buqueData } = await supabase.from("solicitudes_compra").select();
    const { data: asistenciaData } = await supabase.from("solicitudes_asistencia").select();
    const { data: cotizaciones } = await supabase.from("cotizaciones_proveedor").select().eq("estado", "aceptada");
    const { data: cotizacionesAsis } = await supabase.from("asistencias_proveedor").select().eq("estado", "aceptada");
    const { data: presupuestos } = await supabase
      .from("presupuesto_mensual")
      .select()
      .eq("anio", anioSeleccionado)
      .eq("buque_id", selectedBuque);
    const { data: ajustes } = await supabase
      .from("ajustes_cuentas")
      .select()
      .eq("anio", anioSeleccionado)
      .eq("buque_nombre", buques.find(b => b.id === selectedBuque)?.nombre);

    const cuentas = ORDEN_CUENTAS;
    const resultado = cuentas.map(cuenta => {
      // Presupuesto acumulado hasta el mes seleccionado
      const presAcumulado = (presupuestos || [])
        .filter(p => p.cuenta === cuenta && mesesCorto.indexOf(p.mes.slice(0, 3)) + 1 <= mesNum)
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      // Gastos solo del mes en curso (no acumulados)
      const gastoMesPedidos = cotizaciones.filter(c => {
        const pedido = buqueData.find(s => s.numero_pedido === c.numero_pedido);
        const fecha = new Date(c.fecha_aceptacion);
        return (
          pedido &&
          pedido.buque_id === selectedBuque &&
          pedido.numero_cuenta === cuenta &&
          fecha.getMonth() + 1 === mesNum &&
          fecha.getFullYear() === anioSeleccionado
        );
      }).reduce((acc, c) => acc + (parseFloat(c.valor_factura || c.valor) || 0), 0);

      const gastoMesAsistencias = cotizacionesAsis.filter(c => {
        const asistencia = asistenciaData.find(a => a.numero_ate === c.numero_asistencia);
        const fecha = new Date(c.fecha_aceptacion);
        return (
          asistencia &&
          asistencia.buque_id === selectedBuque &&
          asistencia.numero_cuenta === cuenta &&
          fecha.getMonth() + 1 === mesNum &&
          fecha.getFullYear() === anioSeleccionado
        );
      }).reduce((acc, c) => acc + (parseFloat(c.valor_factura || c.valor) || 0), 0);

      // Ajuste acumulado del mes anterior
      const ajusteAnterior = ajustes?.find(
        a => a.cuenta === cuenta && a.mes === mesNum - 1
      )?.real_acumulado || 0;

      // Gasto acumulado = ajuste (hasta mes anterior) + gastos del mes en curso
      const gastoAcumulado = parseFloat(ajusteAnterior) + gastoMesPedidos + gastoMesAsistencias;

      const balance = presAcumulado - gastoAcumulado;

      return { cuenta, presAcumulado, gastoAcumulado, balance };
    });

    setResumen(resultado);
    setLoading(false);
  };

  // 🔹 Guardar manualmente los acumulados en ajustes_cuentas
  const guardarAjustesMes = async () => {
    if (!selectedBuque || !selectedMes) return;
    if (!window.confirm(`¿Seguro que deseas guardar el acumulado de ${selectedMes}?`)) return;

    const mesNum = meses.indexOf(selectedMes) + 1;
    let guardados = 0;

    for (const r of resumen) {
      const { error } = await supabase.from("ajustes_cuentas").upsert(
        {
          buque_id: selectedBuque,
          buque_nombre: buques.find(b => b.id === selectedBuque)?.nombre,
          cuenta: r.cuenta,
          mes: mesNum,
          anio: anioSeleccionado,
          real_acumulado: r.gastoAcumulado
        },
        { onConflict: "buque_id,cuenta,mes,anio" }
      );

      if (!error) guardados++;
    }

    toast({ status: "success", title: `✅ ${guardados} cuentas guardadas en ${selectedMes}` });
  };

  const cerrarYActualizar = () => {
    onAjusteClose();
    cargarResumen();
  };

  return (
    <Box p={6} bg="white" borderRadius="md" boxShadow="md">
      <HStack justify="space-between" mb={4}>
        <Heading size="md">📊 Informe de Cuentas</Heading>
        <HStack>
          <Button onClick={guardarAjustesMes} colorScheme="blue" size="sm">
            💾 Guardar acumulado en ajustes
          </Button>
          <Button onClick={onAjusteOpen} colorScheme="yellow" size="sm">
            ✏️ Editar ajustes mes anterior
          </Button>
        </HStack>
      </HStack>

      <HStack spacing={4} mb={4}>
        <Select placeholder="Selecciona buque" value={selectedBuque} onChange={e => setSelectedBuque(e.target.value)}>
          {buques.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </Select>
        <Select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))}>
          {[2023, 2024, 2025].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select placeholder="Selecciona mes" value={selectedMes} onChange={e => setSelectedMes(e.target.value)}>
          {meses.map(m => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </HStack>

      {loading ? (
        <Spinner />
      ) : resumen.length === 0 ? (
        <Text>No hay datos disponibles.</Text>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Cuenta</Th>
              <Th>Presupuesto acumulado</Th>
              <Th>Gasto acumulado</Th>
              <Th>Balance</Th>
            </Tr>
          </Thead>
          <Tbody>
            {resumen.map((r, idx) => (
              <Tr key={idx}>
                <Td>{r.cuenta}</Td>
                <Td>{r.presAcumulado.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</Td>
                <Td>
                  <Box
                    as={motion.div}
                    whileHover={{ scale: 1.02, backgroundColor: "#edf2f7" }}
                    p={1}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => setDetalle(r.cuenta)}
                  >
                    {r.gastoAcumulado.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    <ExternalLinkIcon ml={2} color="gray.500" />
                  </Box>
                </Td>
                <Td color={r.balance >= 0 ? "green.600" : "red.600"} fontWeight="bold">
                  {r.balance.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <AnimatePresence>
        {detalle && (
          <Modal isOpen={!!detalle} onClose={() => setDetalle(null)} size="6xl" motionPreset="slideInBottom">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Detalle: {detalle}</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <InformeCuentasDetalles
                  buque={selectedBuque}
                  buqueNombre={buques.find(b => b.id === selectedBuque)?.nombre}
                  cuenta={detalle}
                  mesNum={meses.indexOf(selectedMes) + 1}
                  anio={anioSeleccionado}
                  onBack={() => setDetalle(null)}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>

      <Modal isOpen={isAjusteOpen} onClose={cerrarYActualizar} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>✏️ Ajustes del mes anterior</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <AjusteCuentas />
          </ModalBody>
          <ModalFooter>
            <Button onClick={cerrarYActualizar}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
