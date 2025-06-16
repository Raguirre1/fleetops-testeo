import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Text,
  useToast,
  Flex,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";
import DetalleProvisionEnviada from "./DetalleProvisionEnviada";

const ProvisionesEnviadas = ({ onBack }) => {
  const [enviadas, setEnviadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const toast = useToast();

  const cargarProvisiones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("provisiones_enviadas")
      .select("*")
      .order("inserted_at", { ascending: false });

    if (error) {
      toast({
        title: "Error cargando provisiones enviadas",
        status: "error",
      });
    } else {
      setEnviadas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarProvisiones();
  }, []);

  const eliminarProvision = async (id) => {
    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar esta provisión enviada?"
    );
    if (!confirmar) return;

    const { error } = await supabase
      .from("provisiones_enviadas")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la provisión.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Provisión eliminada",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      // Actualizar estado sin recargar
      setEnviadas(enviadas.filter((p) => p.id !== id));
    }
  };

  if (detalleSeleccionado) {
    return (
      <DetalleProvisionEnviada
        envio={detalleSeleccionado}
        onBack={() => setDetalleSeleccionado(null)}
      />
    );
  }

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        📁 Histórico de Provisiones Enviadas
      </Heading>

      <Button onClick={onBack} colorScheme="blue" mb={4}>
        ⬅ Volver
      </Button>

      {loading ? (
        <Spinner size="xl" />
      ) : enviadas.length === 0 ? (
        <Text>No se han registrado provisiones enviadas.</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th>Mes</Th>
                <Th>Año</Th>
                <Th>Fecha de Envío</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {enviadas.map((prov) => (
                <Tr key={prov.id}>
                  <Td>{prov.mes}</Td>
                  <Td>{prov.anio}</Td>
                  <Td>
                    {new Date(prov.inserted_at).toLocaleDateString("es-ES")}
                  </Td>
                  <Td>
                    <Flex gap={2} wrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="teal"
                        onClick={() => setDetalleSeleccionado(prov)}
                      >
                        Ver Detalles
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={() => eliminarProvision(prov.id)}
                      >
                        Eliminar
                      </Button>
                    </Flex>
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

export default ProvisionesEnviadas;
