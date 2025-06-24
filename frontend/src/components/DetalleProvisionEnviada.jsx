import React, { useState } from "react";
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
} from "@chakra-ui/react";

// Recibe también buquesDict como prop
const DetalleProvisionEnviada = ({ envio, buquesDict = {}, onBack }) => {
  const { resumen, detalles, mes, anio } = envio;
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [ordenCampoResumen, setOrdenCampoResumen] = useState("buque");
  const [ordenResumenAsc, setOrdenResumenAsc] = useState(true);

  const [ordenCampoDetalle, setOrdenCampoDetalle] = useState("proveedor");
  const [ordenDetalleAsc, setOrdenDetalleAsc] = useState(true);

  if (!resumen || !detalles) {
    return (
      <Box p={6}>
        <Heading size="lg">Detalles no disponibles</Heading>
        <Button onClick={onBack} colorScheme="blue" mt={4}>⬅ Volver</Button>
      </Box>
    );
  }

  const resumenParseado = typeof resumen === "string" ? JSON.parse(resumen) : resumen;
  const detallesParseados = typeof detalles === "string" ? JSON.parse(detalles) : detalles;

  const cuentas = [
    "Casco",
    "Máquinas",
    "Electricidad",
    "Electrónicas",
    "SEP",
    "Fonda",
    "MLC",
    "Aceite",
    "Inversiones"
  ];

  const cambiarOrdenResumen = (campo) => {
    if (ordenCampoResumen === campo) {
      setOrdenResumenAsc(!ordenResumenAsc);
    } else {
      setOrdenCampoResumen(campo);
      setOrdenResumenAsc(true);
    }
  };

  const cambiarOrdenDetalle = (campo) => {
    if (ordenCampoDetalle === campo) {
      setOrdenDetalleAsc(!ordenDetalleAsc);
    } else {
      setOrdenCampoDetalle(campo);
      setOrdenDetalleAsc(true);
    }
  };

  // Ordenar usando nombre si existe en el diccionario
  const buquesOrdenados = Object.entries(resumenParseado).sort(([buqueA], [buqueB]) => {
    const nombreA = buquesDict[buqueA] || buqueA;
    const nombreB = buquesDict[buqueB] || buqueB;
    if (nombreA < nombreB) return ordenResumenAsc ? -1 : 1;
    if (nombreA > nombreB) return ordenResumenAsc ? 1 : -1;
    return 0;
  });

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>📄 Detalle de Provisiones Enviadas - {mes} {anio}</Heading>

      <Button onClick={onBack} colorScheme="blue" mb={4}>⬅ Volver</Button>

      {!cuentaSeleccionada ? (
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th cursor="pointer" onClick={() => cambiarOrdenResumen("buque")}>
                  Buque {ordenCampoResumen === "buque" ? (ordenResumenAsc ? "⬆️" : "⬇️") : ""}
                </Th>
                {cuentas.map((cuenta) => (
                  <Th key={cuenta} isNumeric>{cuenta}</Th>
                ))}
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {buquesOrdenados.map(([buque, fila]) => {
                let total = 0;
                // Usar nombre de buque si existe en el diccionario
                const nombreBuque = buquesDict[buque] || buque;
                return (
                  <Tr key={buque}>
                    <Td fontWeight="bold">{nombreBuque}</Td>
                    {cuentas.map((cuenta) => {
                      const valor = fila[cuenta] || 0;
                      total += valor;
                      return (
                        <Td
                          key={cuenta}
                          isNumeric
                          _hover={{ bg: "gray.100", cursor: "pointer" }}
                          onClick={() => setCuentaSeleccionada({ buque, cuenta })}
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
                      {total.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      ) : (
        <Box>
          <Heading size="md" mt={6} mb={2}>
            Proveedores para {(buquesDict[cuentaSeleccionada.buque] || cuentaSeleccionada.buque)} - {cuentaSeleccionada.cuenta}
          </Heading>
          <Button onClick={() => setCuentaSeleccionada(null)} colorScheme="gray" mb={4}>
            ⬅ Volver al Resumen
          </Button>

          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th cursor="pointer" onClick={() => cambiarOrdenDetalle("proveedor")}>
                  Proveedor {ordenCampoDetalle === "proveedor" ? (ordenDetalleAsc ? "⬆️" : "⬇️") : ""}
                </Th>
                <Th cursor="pointer" onClick={() => cambiarOrdenDetalle("valor")} isNumeric>
                  Valor (€) {ordenCampoDetalle === "valor" ? (ordenDetalleAsc ? "⬆️" : "⬇️") : ""}
                </Th>
                <Th cursor="pointer" onClick={() => cambiarOrdenDetalle("numero_pedido")}>
                  Nº Pedido {ordenCampoDetalle === "numero_pedido" ? (ordenDetalleAsc ? "⬆️" : "⬇️") : ""}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {detallesParseados
                .filter(
                  (d) =>
                    (d.buque_id === cuentaSeleccionada.buque || d.buque === cuentaSeleccionada.buque) &&
                    d.cuenta === cuentaSeleccionada.cuenta
                )
                .sort((a, b) => {
                  const aVal = a[ordenCampoDetalle];
                  const bVal = b[ordenCampoDetalle];
                  if (aVal < bVal) return ordenDetalleAsc ? -1 : 1;
                  if (aVal > bVal) return ordenDetalleAsc ? 1 : -1;
                  return 0;
                })
                .map((d, idx) => (
                  <Tr key={idx}>
                    <Td>{d.proveedor}</Td>
                    <Td isNumeric>
                      {Number(d.valor).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </Td>
                    <Td>{d.numero_pedido}</Td>
                  </Tr>
                ))}
            </Tbody>

          </Table>
        </Box>
      )}
    </Box>
  );
};

export default DetalleProvisionEnviada;
