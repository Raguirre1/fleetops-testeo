import React from "react";
import {
  Box,
  Text,
  VStack,
  Button,
  Heading,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiShoppingCart, FiTool, FiFileText } from "react-icons/fi";

function Sidebar({ setModule }) {
  const bg = useColorModeValue("gray.800", "gray.700");
  const hoverBg = useColorModeValue("gray.700", "gray.600");

  return (
    <Box
      as="nav"
      role="navigation"
      w={{ base: "full", md: "250px" }}
      minH="100vh"
      bg={bg}
      color="white"
      p={6}
    >
      <Heading size="md" mb={6}>
        Selecciona un Módulo
      </Heading>
      <VStack spacing={3} align="stretch">
        <Button
          leftIcon={<FiShoppingCart />}
          onClick={() => setModule("Compras")}
          variant="ghost"
          justifyContent="flex-start"
          _hover={{ bg: hoverBg }}
          aria-label="Módulo de Compras"
        >
          Compras
        </Button>
        <Button
          leftIcon={<FiTool />}
          onClick={() => setModule("Asistencias Técnicas")}
          variant="ghost"
          justifyContent="flex-start"
          _hover={{ bg: hoverBg }}
          aria-label="Módulo de Asistencias Técnicas"
        >
          Asistencias Técnicas
        </Button>
        <Button
          leftIcon={<FiFileText />}
          onClick={() => setModule("SGC")}
          variant="ghost"
          justifyContent="flex-start"
          _hover={{ bg: hoverBg }}
          aria-label="Módulo SGC"
        >
          SGC
        </Button>
      </VStack>
    </Box>
  );
}

export default Sidebar;
