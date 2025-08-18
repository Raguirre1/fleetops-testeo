import React, { useEffect, useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody
} from '@chakra-ui/react';
import { ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { supabase } from '../supabaseClient';
import { useFlota } from './FlotaContext';
import { motion, AnimatePresence } from 'framer-motion';
import EstadoCuentasDetalles from './EstadoCuentasDetalles';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const mesesDB = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const ORDEN_CUENTAS = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite", "Inversiones",
];

// Normaliza posibles null/undefined en columnas de meses
const normalizaMeses = (obj) => {
  mesesDB.forEach(mes => {
    if (obj[mes] === undefined || obj[mes] === null) obj[mes] = 0;
  });
  return obj;
};

const EstadoCuentasResumen = ({ anio }) => {
  const { buques } = useFlota();
  const [selectedBuque, setSelectedBuque] = useState('');
  const [selectedMes, setSelectedMes] = useState('');
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(false);

  // Detalle modal
  const [detalleCuenta, setDetalleCuenta] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (selectedBuque && selectedMes) cargarResumen();
    // eslint-disable-next-line
  }, [selectedBuque, selectedMes]);

  const cargarResumen = async () => {
    setLoading(true);

    // 1) Presupuesto mensual (para columna presupuesto del mes)
    const { data: presupuestos } = await supabase
      .from('presupuesto_mensual')
      .select('*')
      .eq('buque_id', selectedBuque)
      .eq('anio', anio);

    // 2) Solicitudes (para relacionar cuentas)
    const { data: compras } = await supabase
      .from('solicitudes_compra')
      .select('numero_pedido, buque_id, numero_cuenta');

    const { data: asistencias } = await supabase
      .from('solicitudes_asistencia')
      .select('numero_ate, buque_id, numero_cuenta');

    // 3) Cotizaciones aceptadas (gasto real)
    const { data: cotizaciones } = await supabase
      .from('cotizaciones_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    const { data: cotizacionesAsis } = await supabase
      .from('asistencias_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    // 4) Presupuestos fijos/planificados
    const { data: fijosPedidosRaw } = await supabase
      .from('presupuestos_fijos_pedidos')
      .select('*')
      .eq('buque_id', selectedBuque)
      .eq('anio', anio);

    const { data: fijosAsistenciasRaw } = await supabase
      .from('presupuestos_fijos_asistencias')
      .select('*')
      .eq('buque_id', selectedBuque)
      .eq('anio', anio);

    const fijosPedidos = (fijosPedidosRaw || []).map(normalizaMeses);
    const fijosAsistencias = (fijosAsistenciasRaw || []).map(normalizaMeses);

    // Cuentas presentes en presupuesto
    const cuentas = [...new Set((presupuestos || []).map(p => p.cuenta))];
    const mesNum = meses.findIndex(m => m === selectedMes) + 1;
    const mesDB = mesesDB[mesNum - 1];

    const resumenCuentas = cuentas.map(cuenta => {
      // Presupuesto del mes (suma de filas que coincidan en cuenta y mes)
      const presMes = (presupuestos || [])
        .filter(p =>
          p.cuenta === cuenta &&
          (
            typeof p.mes === "string"
              ? p.mes.slice(0, 3).toLowerCase() === selectedMes.slice(0, 3).toLowerCase()
              : Number(p.mes) === mesNum
          )
        )
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      // Gasto real (compras + asistencias) del mes
      const gastoCompras = (cotizaciones || [])
        .map(cot => {
          const solicitud = (compras || []).find(s => s.numero_pedido === cot.numero_pedido);
          if (
            solicitud &&
            solicitud.buque_id === selectedBuque &&
            solicitud.numero_cuenta === cuenta &&
            cot.valor &&
            cot.fecha_aceptacion
          ) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
              return parseFloat(cot.valor) || 0;
            }
          }
          return 0;
        })
        .reduce((a, b) => a + b, 0);

      const gastoAsistencias = (cotizacionesAsis || [])
        .map(cot => {
          const asistencia = (asistencias || []).find(s => s.numero_ate === cot.numero_asistencia);
          if (
            asistencia &&
            asistencia.buque_id === selectedBuque &&
            asistencia.numero_cuenta === cuenta &&
            cot.valor &&
            cot.fecha_aceptacion
          ) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
              return parseFloat(cot.valor) || 0;
            }
          }
          return 0;
        })
        .reduce((a, b) => a + b, 0);

      // Fijos informativos del mes (no suman a gastoMes)
      const gastoFijo =
        (
          (fijosPedidos?.filter(f =>
            f.cuenta === cuenta && f.tipo === "Fijo" && Number(f[mesDB]) > 0
          ).reduce((a, b) => a + (parseFloat(b[mesDB]) || 0), 0) || 0)
          +
          (fijosAsistencias?.filter(f =>
            f.cuenta === cuenta && f.tipo === "Fijo" && Number(f[mesDB]) > 0
          ).reduce((a, b) => a + (parseFloat(b[mesDB]) || 0), 0) || 0)
        );

      // Planificados informativos del mes (no suman a gastoMes)
      const planificadosPedidos = fijosPedidos?.filter(f =>
        f.cuenta === cuenta && f.tipo === "Planificado" && Number(f[mesDB]) > 0
      ) || [];

      const planificadosAsistencias = fijosAsistencias?.filter(f =>
        f.cuenta === cuenta && f.tipo === "Planificado" && Number(f[mesDB]) > 0
      ) || [];

      // 🎯 Gasto del mes (solo real): compras + asistencias
      const gastoMes = gastoCompras + gastoAsistencias;

      // Balance sin acumulado: presupuesto del mes - gasto del mes
      const balance = presMes - gastoMes;

      return {
        cuenta,
        presMes,
        gastoMes,
        gastoFijo, // informativo
        planificadosPedidos, // informativo
        planificadosAsistencias, // informativo
        balance,
      };
    });

    // Ordenar por ORDEN_CUENTAS
    resumenCuentas.sort((a, b) => {
      const ia = ORDEN_CUENTAS.indexOf(a.cuenta);
      const ib = ORDEN_CUENTAS.indexOf(b.cuenta);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    setResumen(resumenCuentas);
    setLoading(false);
  };

  // Modal detalle
  const abrirDetalle = (cuenta) => {
    setDetalleCuenta(cuenta);
    setModalOpen(true);
  };
  const cerrarDetalle = () => {
    setModalOpen(false);
    setTimeout(() => {
      cargarResumen(); // refresco tras cerrar
    }, 250);
  };

  return (
    <Box p={4} bg="white" boxShadow="md" borderRadius="md">
      <Heading size="md" mb={4}>
        Estado de Cuenta del mes
      </Heading>
      <Box mb={4} display="flex" gap={4}>
        <Select
          placeholder="Selecciona buque"
          value={selectedBuque}
          onChange={e => setSelectedBuque(e.target.value)}
          width="auto"
        >
          {buques.map(buque => (
            <option key={buque.id} value={buque.id}>
              {buque.nombre}
            </option>
          ))}
        </Select>
        <Select
          placeholder="Selecciona mes"
          value={selectedMes}
          onChange={e => setSelectedMes(e.target.value)}
          width="auto"
        >
          {meses.map((mes) => (
            <option key={mes} value={mes}>{mes}</option>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Spinner />
      ) : resumen.length === 0 ? (
        <Text>No hay datos disponibles para este buque y mes.</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th>Cuenta</Th>
                <Th>Presupuesto {selectedMes}</Th>
                <Th>Gasto {selectedMes}</Th>
                <Th>Balance</Th>
              </Tr>
            </Thead>
            <Tbody>
              {resumen.map((fila, idx) => (
                <Tr key={idx}>
                  <Td>{fila.cuenta}</Td>

                  <Td>{fila.presMes.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</Td>

                  <Td>
                    {/* Valor clicable para abrir detalle */}
                    <Box
                      as={motion.div}
                      whileHover={{ scale: 1.05, backgroundColor: "#e3f2fd" }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 6,
                        padding: "0 0.5rem",
                        minWidth: 110
                      }}
                      onClick={() => abrirDetalle(fila.cuenta)}
                      title="Ver detalle de gastos"
                    >
                      <span style={{ color: "#1565c0", textDecoration: "underline" }}>
                        {fila.gastoMes.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                      </span>
                      <ExternalLinkIcon ml={2} color="gray.500" />
                    </Box>

                    {/* Nota informativa: Fijos (amarillo pastel) */}
                    {fila.gastoFijo > 0 && (
                      <Box
                        mt={1}
                        fontSize="xs"
                        pl={2}
                        py={0.5}
                        borderRadius="6px"
                        bg="yellow.50"
                        color="yellow.800"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        <InfoOutlineIcon />
                        Fijos :&nbsp;
                        <b>{fila.gastoFijo.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</b>
                      </Box>
                    )}

                    {/* Nota informativa: Planificados (azul/info) */}
                    {(fila.planificadosPedidos.length > 0 || fila.planificadosAsistencias.length > 0) && (() => {
                      const mesNum = meses.findIndex(m => m === selectedMes) + 1;
                      const keyMes = mesesDB[mesNum - 1];
                      const gastoPlanificado = [...fila.planificadosPedidos, ...fila.planificadosAsistencias]
                        .reduce((a, b) => {
                          const valor = (b && b[keyMes] !== undefined && b[keyMes] !== null) ? parseFloat(b[keyMes]) : 0;
                          return a + (isNaN(valor) ? 0 : valor);
                        }, 0);
                      if (gastoPlanificado <= 0) return null;
                      return (
                        <Box
                          mt={1}
                          fontSize="xs"
                          pl={2}
                          py={0.5}
                          borderRadius="6px"
                          bg="blue.50"
                          color="blue.800"
                          display="inline-flex"
                          alignItems="center"
                          gap={1}
                        >
                          <InfoOutlineIcon />
                          Planificados :&nbsp;
                          <b>{gastoPlanificado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</b>
                        </Box>
                      );
                    })()}
                  </Td>

                  <Td
                    style={{
                      color: fila.balance >= 0 ? 'green' : 'red',
                      fontWeight: 'bold',
                      background: fila.balance >= 0 ? '#e8f5e9' : '#ffebee'
                    }}
                  >
                    {fila.balance.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Modal de Detalle */}
      <AnimatePresence>
        {modalOpen && (
          <Modal isOpen={modalOpen} onClose={cerrarDetalle} size="6xl" motionPreset="slideInBottom">
            <ModalOverlay />
            <ModalContent
              as={motion.div}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25 }}
            >
              <ModalHeader>Detalle de gastos - {detalleCuenta} - {selectedMes}</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <EstadoCuentasDetalles
                  buque={selectedBuque}
                  buqueNombre={buques.find(b => b.id === selectedBuque)?.nombre}
                  cuenta={detalleCuenta}
                  mesNum={meses.findIndex(m => m === selectedMes) + 1}
                  anio={anio}
                  onBack={cerrarDetalle}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default EstadoCuentasResumen;
