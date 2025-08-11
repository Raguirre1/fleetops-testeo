import React, { useEffect, useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text, Select, IconButton, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, ExternalLinkIcon, InfoOutlineIcon } from '@chakra-ui/icons';
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
  "Casco",
  "Máquinas",
  "Electricidad",
  "Electrónicas",
  "SEP",
  "Fonda",
  "MLC",
  "Aceite",
  "Inversiones",
];


// Para evitar errores de meses faltantes:
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

  // Edición acumulado manual
  const [editIdx, setEditIdx] = useState(null);
  const [editValor, setEditValor] = useState('');
  const [acumuladosManual, setAcumuladosManual] = useState({}); // { cuenta: valor }

  // Detalle modal
  const [detalleCuenta, setDetalleCuenta] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (selectedBuque && selectedMes) cargarResumen();
    // eslint-disable-next-line
  }, [selectedBuque, selectedMes]);

  const cargarResumen = async () => {
    setLoading(true);

    const ORDEN_CUENTAS = [
      "Casco",
      "Máquinas",
      "Electricidad",
      "Electrónicas",
      "SEP",
      "Fonda",
      "MLC",
      "Aceite",
      "Inversiones",
    ];

    // 1. Leer presupuesto mensual (NO SE USA PARA FIJOS/PLANIFICADOS)
    const { data: presupuestos } = await supabase
      .from('presupuesto_mensual')
      .select('*')
      .eq('buque_id', selectedBuque)
      .eq('anio', anio);

    // 2. Leer solicitudes de compra y asistencias
    const { data: compras } = await supabase
      .from('solicitudes_compra')
      .select('numero_pedido, buque_id, numero_cuenta');

    const { data: asistencias } = await supabase
      .from('solicitudes_asistencia')
      .select('numero_ate, buque_id, numero_cuenta');

    // 3. Leer cotizaciones aceptadas
    const { data: cotizaciones } = await supabase
      .from('cotizaciones_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    const { data: cotizacionesAsis } = await supabase
      .from('asistencias_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    // --- Leer presupuestos fijos pedidos y asistencias ---
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

    const cuentas = [...new Set((presupuestos || []).map(p => p.cuenta))];
    const mesNum = meses.findIndex(m => m === selectedMes) + 1;
    const mesDB = mesesDB[mesNum - 1];

    const resumenCuentas = cuentas.map(cuenta => {
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

      const gastoFijo =
        (
          (fijosPedidos?.filter(f =>
            f.cuenta === cuenta &&
            f.tipo === "Fijo" &&
            Number(f[mesDB]) > 0
          ).reduce((a, b) => a + (parseFloat(b[mesDB]) || 0), 0) || 0)
          +
          (fijosAsistencias?.filter(f =>
            f.cuenta === cuenta &&
            f.tipo === "Fijo" &&
            Number(f[mesDB]) > 0
          ).reduce((a, b) => a + (parseFloat(b[mesDB]) || 0), 0) || 0)
        );

      const planificadosPedidos = fijosPedidos?.filter(f =>
        f.cuenta === cuenta &&
        f.tipo === "Planificado" &&
        Number(f[mesDB]) > 0
      ) || [];

      const planificadosAsistencias = fijosAsistencias?.filter(f =>
        f.cuenta === cuenta &&
        f.tipo === "Planificado" &&
        Number(f[mesDB]) > 0
      ) || [];

      const gastoMes = gastoCompras + gastoAsistencias + gastoFijo;

      const acumuladoAnt =
        cuenta in acumuladosManual
          ? parseFloat(acumuladosManual[cuenta]) || 0
          : 0;

      const balance = acumuladoAnt + presMes - gastoMes;

      return {
        cuenta,
        acumuladoAnt,
        presMes,
        gastoMes,
        gastoFijo,
        planificadosPedidos,
        planificadosAsistencias,
        balance,
      };
    });

    // Ordenar según ORDEN_CUENTAS
    resumenCuentas.sort((a, b) => {
      const ia = ORDEN_CUENTAS.indexOf(a.cuenta);
      const ib = ORDEN_CUENTAS.indexOf(b.cuenta);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    setResumen(resumenCuentas);
    setLoading(false);
  };


  // Control edición acumulado
  const handleEdit = (idx, valorActual) => {
    setEditIdx(idx);
    setEditValor(valorActual.toFixed(2));
  };
  const handleSave = cuenta => {
    setAcumuladosManual(prev => ({
      ...prev,
      [cuenta]: editValor
    }));
    setEditIdx(null);
  };

  // Abrir detalle modal
  const abrirDetalle = (cuenta) => {
    setDetalleCuenta(cuenta);
    setModalOpen(true);
  };

  const cerrarDetalle = () => {
    setModalOpen(false);
    setTimeout(() => {
      cargarResumen(); // Refresca el resumen tras cerrar el modal
    }, 250);
  };

  return (
    <Box p={4} bg="white" boxShadow="md" borderRadius="md">
      <Heading size="md" mb={4}>
        Estado de Cuenta Resumido
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
          {meses.map((mes, idx) => (
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
                <Th>Acumulado meses anteriores</Th>
                <Th>Presupuesto {selectedMes}</Th>
                <Th>Gasto {selectedMes}</Th>
                <Th>Balance</Th>
              </Tr>
            </Thead>
            <Tbody>
              {resumen.map((fila, idx) => (
                <Tr key={idx}>
                  <Td>{fila.cuenta}</Td>
                  <Td>
                    {editIdx === idx ? (
                      <>
                        <Input
                          size="sm"
                          type="number"
                          value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          width="100px"
                          mr={2}
                        />
                        <IconButton
                          size="sm"
                          aria-label="Guardar"
                          icon={<CheckIcon />}
                          onClick={() => handleSave(fila.cuenta)}
                        />
                      </>
                    ) : (
                      <>
                        {fila.acumuladoAnt.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}
                        <IconButton
                          size="xs"
                          ml={2}
                          aria-label="Editar"
                          icon={<EditIcon />}
                          onClick={() => handleEdit(idx, fila.acumuladoAnt)}
                          variant="ghost"
                        />
                      </>
                    )}
                  </Td>
                  <Td>{fila.presMes.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</Td>
                  <Td>
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
                    {/* Desglose: Fijo y Planificado */}
                    {fila.gastoFijo > 0 && (
                      <Box fontSize="xs" color="blue.700" pl={1}>
                        +{fila.gastoFijo.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} fijo
                      </Box>
                    )}
                    {(fila.planificadosPedidos.length > 0 || fila.planificadosAsistencias.length > 0) && (() => {
                      // Variables de mes dentro del render para asegurar scope correcto:
                      const mesNum = meses.findIndex(m => m === selectedMes) + 1;
                      const keyMes = mesesDB[mesNum - 1];
                      // Suma robusta:
                      const gastoPlanificado = [...fila.planificadosPedidos, ...fila.planificadosAsistencias]
                        .reduce((a, b) => {
                          const valor = (b && b[keyMes] !== undefined && b[keyMes] !== null) ? parseFloat(b[keyMes]) : 0;
                          return a + (isNaN(valor) ? 0 : valor);
                        }, 0);
                      return (
                        <Box fontSize="xs" color="orange.700" pl={1} display="flex" alignItems="center">
                          <InfoOutlineIcon mr={1} />
                          Gasto planificado:{" "}
                          {gastoPlanificado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
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
