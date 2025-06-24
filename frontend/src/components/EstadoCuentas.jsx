import React, { useEffect, useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text, Select, IconButton, Input
} from '@chakra-ui/react';
import { EditIcon, CheckIcon } from '@chakra-ui/icons';
import { supabase } from '../supabaseClient';
import { useFlota } from './FlotaContext';

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

  // Para edición acumulado
  const [editIdx, setEditIdx] = useState(null);
  const [editValor, setEditValor] = useState('');
  const [acumuladosManual, setAcumuladosManual] = useState({}); // { cuenta: valor }

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

    // 2. Leer solicitudes de compra y asistencias
    const { data: compras } = await supabase
      .from('solicitudes_compra')
      .select('numero_pedido, buque_id, numero_cuenta, fecha_estado');

    const { data: asistencias } = await supabase
      .from('solicitudes_asistencia')
      .select('numero_ate, buque_id, numero_cuenta, fecha_estado');

    // 3. Leer cotizaciones aceptadas de compras
    const { data: cotizaciones } = await supabase
      .from('cotizaciones_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    // 4. Leer cotizaciones aceptadas de asistencias
    const { data: cotizacionesAsis } = await supabase
      .from('asistencias_proveedor')
      .select('*')
      .eq('estado', 'aceptada');

    // Todas las cuentas
    const cuentas = [...new Set(presupuestos.map(p => p.cuenta))];

    // Mes num (1-12)
    const mesNum = meses.findIndex(m => m === selectedMes) + 1;

    // Preparamos el resumen
    const resumenCuentas = cuentas.map(cuenta => {
      // Presupuesto hasta mes anterior
      const presAnt = presupuestos
        .filter(p => p.cuenta === cuenta && (
          (typeof p.mes === "string"
            ? meses.findIndex(m => m.toLowerCase() === p.mes.toLowerCase()) + 1
            : Number(p.mes)
          ) < mesNum
        ))
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      // Presupuesto mes actual (admite texto o número)
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

      // Presupuesto total hasta el mes seleccionado
      const presTotal = presupuestos
        .filter(p => p.cuenta === cuenta && (
          (typeof p.mes === "string"
            ? meses.findIndex(m => m.toLowerCase() === p.mes.toLowerCase()) + 1
            : Number(p.mes)
          ) <= mesNum
        ))
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      // Gasto real del mes (compras y asistencias)
      const gastoMes = [
        ...cotizaciones
          .map(cot => {
            // Si tienes fecha_cotizacion, úsala. Si no, fallback a created_at (por compatibilidad)
            const fecha = cot.fecha_cotizacion || cot.created_at;
            if (
              cot.estado === "aceptada" &&
              cot.buque_id === selectedBuque &&
              cot.numero_cuenta === cuenta &&
              cot.valor &&
              fecha
            ) {
              const f = new Date(fecha);
              if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
                return parseFloat(cot.valor) || 0;
              }
            }
            return 0;
          })
          .filter(val => !!val),
        ...cotizacionesAsis
          .map(cot => {
            const fecha = cot.fecha_cotizacion || cot.created_at;
            if (
              cot.estado === "aceptada" &&
              cot.buque_id === selectedBuque &&
              cot.numero_cuenta === cuenta &&
              cot.valor &&
              fecha
            ) {
              const f = new Date(fecha);
              if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
                return parseFloat(cot.valor) || 0;
              }
            }
            return 0;
          })
          .filter(val => !!val)
      ].reduce((a, b) => a + b, 0);

      // Gasto real acumulado hasta el mes anterior (usando fecha de aceptación)
      const gastoAnt = [
        ...cotizaciones
          .map(cot => {
            const fecha = cot.fecha_cotizacion || cot.created_at;
            if (
              cot.estado === "aceptada" &&
              cot.buque_id === selectedBuque &&
              cot.numero_cuenta === cuenta &&
              cot.valor &&
              fecha
            ) {
              const f = new Date(fecha);
              if (
                (f.getFullYear() < anio) ||
                (f.getFullYear() === anio && (f.getMonth() + 1) < mesNum)
              ) {
                return parseFloat(cot.valor) || 0;
              }
            }
            return 0;
          })
          .filter(val => !!val),
        ...cotizacionesAsis
          .map(cot => {
            const fecha = cot.fecha_cotizacion || cot.created_at;
            if (
              cot.estado === "aceptada" &&
              cot.buque_id === selectedBuque &&
              cot.numero_cuenta === cuenta &&
              cot.valor &&
              fecha
            ) {
              const f = new Date(fecha);
              if (
                (f.getFullYear() < anio) ||
                (f.getFullYear() === anio && (f.getMonth() + 1) < mesNum)
              ) {
                return parseFloat(cot.valor) || 0;
              }
            }
            return 0;
          })
          .filter(val => !!val)
      ].reduce((a, b) => a + b, 0);


      // Acumulado meses anteriores (editable)
      const acumuladoAnt =
        cuenta in acumuladosManual
          ? parseFloat(acumuladosManual[cuenta]) || 0
          : presAnt - gastoAnt;

      // Balance
      const balance = acumuladoAnt + presMes - gastoMes;

      return {
        cuenta,
        acumuladoAnt,
        presMes,
        presTotal,
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
                <Th>Presupuesto total {selectedMes}</Th>
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
                  <Td>{fila.presTotal.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</Td>
                  <Td>{fila.gastoMes.toLocaleString('es-ES', {style: 'currency', currency: 'EUR'})}</Td>
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
    </Box>
  );
};

export default EstadoCuentasResumen;
