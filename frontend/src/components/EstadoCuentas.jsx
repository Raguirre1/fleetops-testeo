// EstadoCuentas.jsx
import React, { useEffect, useState } from 'react';
import { Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text } from '@chakra-ui/react';
import { supabase } from '../supabaseClient';
import { useFlota } from './FlotaContext';

const EstadoCuentas = ({ anio }) => {
  const { buques } = useFlota();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (buques && buques.length > 0) cargarEstadoCuentas();
  }, [buques, anio]);

  const cargarEstadoCuentas = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('estado_cuentas')
      .select('*')
      .in('buque', buques)
      .eq('anio', anio)
      .order('mes', { ascending: true });

    if (error) {
      console.error('Error cargando estado de cuentas:', error);
    } else {
      const cuentasCalculadas = data.map((cuenta, index, arr) => {
        const acumulado = arr
          .filter(c => c.buque === cuenta.buque && c.cuenta_contable === cuenta.cuenta_contable && c.mes <= cuenta.mes)
          .reduce((acc, curr) => acc + parseFloat(curr.desviacion), 0);
        return { ...cuenta, gasto_acumulado: acumulado };
      });
      setCuentas(cuentasCalculadas);
    }

    setLoading(false);
  };

  if (!buques || buques.length === 0) return <Spinner />;

  return (
    <Box p={4} bg="white" boxShadow="md" borderRadius="md">
      <Heading size="md" mb={4}>
        Estado de Cuenta - Flota ({anio})
      </Heading>

      {loading ? (
        <Spinner />
      ) : cuentas.length === 0 ? (
        <Text>No hay datos disponibles.</Text>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Buque</Th>
              <Th>Mes</Th>
              <Th>Cuenta</Th>
              <Th>Presupuesto (€)</Th>
              <Th>Gastos Reales (€)</Th>
              <Th>Desviación (€)</Th>
              <Th>Gasto Acumulado (€)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {cuentas.map((cuenta, idx) => (
              <Tr key={idx}>
                <Td>{cuenta.buque}</Td>
                <Td>{cuenta.mes}</Td>
                <Td>{cuenta.cuenta_contable}</Td>
                <Td>{cuenta.presupuesto.toFixed(2)}</Td>
                <Td>{cuenta.gastos_reales.toFixed(2)}</Td>
                <Td
                  color={cuenta.desviacion >= 0 ? 'green.500' : 'red.500'}
                  fontWeight="bold"
                >
                  {cuenta.desviacion.toFixed(2)} €
                </Td>
                <Td
                  color={cuenta.gasto_acumulado >= 0 ? 'green.500' : 'red.500'}
                  fontWeight="bold"
                >
                  {cuenta.gasto_acumulado.toFixed(2)} €
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
};

export default EstadoCuentas;
