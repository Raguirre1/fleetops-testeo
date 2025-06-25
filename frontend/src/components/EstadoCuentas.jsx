import React, { useEffect, useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text, Select, IconButton, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { supabase } from '../supabaseClient';
import { useFlota } from './FlotaContext';
import { motion, AnimatePresence } from 'framer-motion';
import EstadoCuentasDetalles from './EstadoCuentasDetalles';

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

  // Chakra modal disclosure (opcional)
  // const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (selectedBuque && selectedMes) cargarResumen();
    // eslint-disable-next-line
  }, [selectedBuque, selectedMes]);

  const cargarResumen = async () => {
    setLoading(true);

    // 1. Leer presupuesto mensual
    const { data: presupuestos } = await supabase
      .from('presupuesto_mensual')
      .select('*')
      .eq('buque_id', selectedBuque)
      .eq('anio', anio);

    // 2. Leer solicitudes de compra y asistencias (para cruzar)
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

    const cuentas = [...new Set(presupuestos.map(p => p.cuenta))];
    const mesNum = meses.findIndex(m => m === selectedMes) + 1;

    const resumenCuentas = cuentas.map(cuenta => {
      // Presupuesto mes actual
      const presMes = presupuestos
        .filter(p =>
          p.cuenta === cuenta &&
          (
            typeof p.mes === "string"
              ? p.mes.slice(0, 3).toLowerCase() === selectedMes.slice(0, 3).toLowerCase()
              : Number(p.mes) === mesNum
          )
        )
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      // ---- Gasto real del mes (compras) ----
      const gastoCompras = cotizaciones
        .map(cot => {
          const solicitud = compras.find(s => s.numero_pedido === cot.numero_pedido);
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

      // ---- Gasto real del mes (asistencias) ----
      const gastoAsistencias = cotizacionesAsis
        .map(cot => {
          const asistencia = asistencias.find(s => s.numero_ate === cot.numero_asistencia);
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

      // ---- TOTAL GASTO MES ----
      const gastoMes = gastoCompras + gastoAsistencias;

      // Acumulado manual
      const acumuladoAnt =
        cuenta in acumuladosManual
          ? parseFloat(acumuladosManual[cuenta]) || 0
          : 0;

      // Balance
      const balance = acumuladoAnt + presMes - gastoMes;

      return {
        cuenta,
        acumuladoAnt,
        presMes,
        gastoMes,
        balance,
      };
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
