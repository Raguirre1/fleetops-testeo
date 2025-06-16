import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  TableContainer,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import PurchaseDetail from "./PurchaseDetail";

function PurchaseDashboard() {
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const buques = [
    { id: 1, nombre: "Dacil" },
    { id: 2, nombre: "Herbania" },
    { id: 3, nombre: "Tinerfe" },
    { id: 4, nombre: "Hesperides" },
  ];

  const estadoCompras = [
    { no: 1, buque: "Dacil", estado: "Pendiente", fecha: "2025-03-01" },
    { no: 2, buque: "Herbania", estado: "Aprobado", fecha: "2025-03-05" },
    { no: 3, buque: "Tinerfe", estado: "Finalizado", fecha: "2025-03-10" },
    { no: 4, buque: "Hesperides", estado: "Pendiente", fecha: "2025-03-15" },
  ];

  const bg = useColorModeValue("white", "gray.800");

  const handleSeleccionarBuque = (event) => {
    setBuqueSeleccionado(event.target.value);
  };

  return (
    <Box minH="100vh" bg="gray.100">
      {/* Encabezado tipo ERP */}
      <Flex
        as="header"
        bg="teal.700"
        color="white"
        px={6}
        py={4}
        justify="space-between"
        align="center"
        shadow="md"
      >
        <Heading size="md">FleetOps</Heading>
        <Flex gap={4} fontSize="sm">
          {["Compras", "Asistencias", "SGC", "Flota", "Económico", "Documentación"].map((modulo) => (
            <Button key={modulo} variant="ghost" colorScheme="whiteAlpha" size="sm">
              {modulo}
            </Button>
          ))}
        </Flex>
        <Flex align="center" gap={3}>
          <Text fontSize="sm">Hola, Rafael</Text>
          <Box
            bg="white"
            color="teal.700"
            fontWeight="bold"
            rounded="full"
            w="32px"
            h="32px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            R
          </Box>
        </Flex>
      </Flex>

      {/* Contenido principal */}
      <Box p={6}>
        {pedidoSeleccionado ? (
          <PurchaseDetail
            key={pedidoSeleccionado.no}
            pedido={pedidoSeleccionado}
            volver={() => setPedidoSeleccionado(null)}
          />
        ) : (
          <Box bg={bg} p={6} rounded="md" shadow="sm">
            <Heading size="lg" mb={4}>
              📊 Dashboard de Compras
            </Heading>

            <Stack maxW="300px" mb={6}>
              <Select
                placeholder="Selecciona un buque"
                value={buqueSeleccionado}
                onChange={handleSeleccionarBuque}
              >
                {buques.map((buque) => (
                  <option key={buque.id} value={buque.nombre}>
                    {buque.nombre}
                  </option>
                ))}
              </Select>
            </Stack>

            {!buqueSeleccionado ? (
              <Text fontStyle="italic" color="gray.600">
                Selecciona un buque para ver sus pedidos.
              </Text>
            ) : (
              <>
                <Text mb={2}>
                  Estado de compras para el buque{" "}
                  <Text as="span" fontWeight="bold" color="teal.600">
                    {buqueSeleccionado}
                  </Text>
                </Text>

                <TableContainer>
                  <Table variant="striped" colorScheme="gray" size="sm">
                    <Thead>
                      <Tr>
                        <Th>No</Th>
                        <Th>Buque</Th>
                        <Th>Estado</Th>
                        <Th>Fecha</Th>
                        <Th textAlign="center">Acciones</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {estadoCompras
                        .filter((compra) => compra.buque === buqueSeleccionado)
                        .map((compra) => (
                          <Tr key={compra.no}>
                            <Td>{compra.no}</Td>
                            <Td>{compra.buque}</Td>
                            <Td>{compra.estado}</Td>
                            <Td>{compra.fecha}</Td>
                            <Td textAlign="center">
                              <Button
                                size="sm"
                                colorScheme="blue"
                                aria-label={`Ver detalle de pedido ${compra.no}`}
                                onClick={() => setPedidoSeleccionado(compra)}
                              >
                                Ver detalle
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default PurchaseDashboard;
