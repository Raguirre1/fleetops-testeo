import React, { useState } from "react";
import { Box, Button, Heading, HStack, Text } from "@chakra-ui/react";
import Provisiones from "./Provisiones";
import Presupuesto from "./Presupuesto";
import EstadoCuentas from "./EstadoCuentas";
import InformeCuentas from "./InformeCuentas";  // 👈 nuevo import

const Controlling = () => {
  const [seccion, setSeccion] = useState("");

  const renderSeccion = () => {
    switch (seccion) {
      case "provisiones":
        return <Provisiones />;
      case "presupuesto":
        return <Presupuesto />;
      case "estadoCuentas":
        return <EstadoCuentas anio={new Date().getFullYear()} />;
      case "informes":
        return <InformeCuentas />;   // 👈 renderizar el informe real
      case "kpis":
        return <Text fontSize="lg">📈 Sección de KPIs (en desarrollo)</Text>;
      default:
        return (
          <Text fontSize="lg" color="gray.600">
            Selecciona una sección para comenzar
          </Text>
        );
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={4}>📋 Módulo de Controlling</Heading>
      <HStack spacing={3} mb={6} wrap="wrap">
        <Button colorScheme="blue" variant="outline" onClick={() => setSeccion("provisiones")}>Provisiones</Button>
        <Button colorScheme="teal" variant="outline" onClick={() => setSeccion("presupuesto")}>Presupuesto</Button>
        <Button colorScheme="purple" variant="outline" onClick={() => setSeccion("estadoCuentas")}>Estado de Cuentas</Button>
        <Button colorScheme="orange" variant="outline" onClick={() => setSeccion("informes")}>Informes de Cuentas</Button>
        <Button colorScheme="pink" variant="outline" onClick={() => setSeccion("kpis")}>KPIs</Button>
      </HStack>

      <Box p={4} bg="gray.100" borderRadius="md">
        {renderSeccion()}
      </Box>
    </Box>
  );
};

export default Controlling;
