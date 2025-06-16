// App.jsx
import {
  ChakraProvider,
  Box,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  extendTheme,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import Login from "./components/Login";
import PurchaseRequest from "./components/PurchaseRequest";
import AsistenciaRequest from "./components/AsistenciaRequest";
import Controlling from "./components/Controlling";
import SeleccionFlota from "./components/SeleccionFlota";
import { FlotaProvider, useFlota } from "./components/FlotaContext"; // 🔹 Importamos el contexto

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
    },
  },
});

function AppContent() {
  const [usuario, setUsuario] = useState(null);
  const { flotaSeleccionada, setFlotaSeleccionada } = useFlota(); // 🔹 Usamos contexto

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
    setFlotaSeleccionada(null); // 🔹 Limpiamos también la flota global
  };

  // NUEVO: Función para cambiar flota con confirmación
  const cambiarFlota = () => {
    const confirmar = window.confirm(
      "¿Seguro que quieres volver a Seleccionar la Flota?\nAsegúrate de guardar los cambios antes de continuar."
    );
    if (confirmar) {
      setFlotaSeleccionada(null);
    }
  };

  useEffect(() => {
    setUsuario(null);
  }, []);

  if (!usuario) return <Login onLoginSuccess={setUsuario} />;
  if (!flotaSeleccionada) return <SeleccionFlota onFlotaSeleccionada={setFlotaSeleccionada} />;

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex
        as="header"
        bg="#cce5ff"
        color="gray.800"
        px={6}
        py={4}
        justify="space-between"
        align="center"
        shadow="sm"
      >
        <Text fontSize="lg" fontWeight="bold">
          {usuario.nombre} | Flota: {flotaSeleccionada.nombre}
        </Text>

        <Flex gap={2}>
          <Button colorScheme="yellow" onClick={cambiarFlota}>
            Seleccionar Flota
          </Button>
          <Button colorScheme="red" onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </Flex>
      </Flex>

      <Tabs variant="enclosed" isFitted p={4}>
        <TabList>
          <Tab>🛒 Compras</Tab>
          <Tab>🔧 Asistencias Técnicas</Tab>
          <Tab>📊 Controlling</Tab>
          <Tab>📁 SGC</Tab>
        </TabList>

        <TabPanels mt={4}>
          <TabPanel>
            <PurchaseRequest usuario={usuario} />
          </TabPanel>
          <TabPanel>
            <AsistenciaRequest usuario={usuario} />
          </TabPanel>
          <TabPanel>
            <Controlling />
          </TabPanel>
          <TabPanel>
            <Text fontSize="lg">Módulo del Sistema de Gestión de Calidad</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <FlotaProvider> {/* 🔹 Envolvemos toda la app */}
        <AppContent />
      </FlotaProvider>
    </ChakraProvider>
  );
}

export default App;
