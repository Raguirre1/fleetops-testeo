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
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";

import Login from "./components/Login";
import PurchaseRequest from "./components/PurchaseRequest";
import AsistenciaRequest from "./components/AsistenciaRequest";
import Controlling from "./components/Controlling";
import SeleccionFlota from "./components/SeleccionFlota";
import ResetPassword from "./components/ResetPassword";
import DashboardGeneral from "./components/DashboardGeneral";
import { FlotaProvider, useFlota } from "./components/FlotaContext";

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

function MainApp({ usuario, setUsuario }) {
  const { flotaSeleccionada, setFlotaSeleccionada } = useFlota();
  const navigate = useNavigate();
  const [mostrarDashboard, setMostrarDashboard] = useState(true);

  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
    setFlotaSeleccionada(null);
    navigate("/");
  };

  const cambiarFlota = () => {
    const confirmar = window.confirm(
      "¿Seguro que quieres volver a Seleccionar la Flota?\nAsegúrate de guardar los cambios antes de continuar."
    );
    if (confirmar) {
      setFlotaSeleccionada(null);
    }
  };

  if (!flotaSeleccionada)
    return <SeleccionFlota onFlotaSeleccionada={setFlotaSeleccionada} />;

  if (mostrarDashboard)
    return <DashboardGeneral onIrAModulos={() => setMostrarDashboard(false)} />;

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
          {usuario?.nombre || usuario?.email} | Flota: {flotaSeleccionada.nombre}
        </Text>
        <Flex gap={2}>
          <Button colorScheme="teal" onClick={() => setMostrarDashboard(true)}>
            🏠 Ir al Dashboard
          </Button>
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
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    setUsuario(null);
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <FlotaProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                usuario ? (
                  <MainApp usuario={usuario} setUsuario={setUsuario} />
                ) : (
                  <Login onLoginSuccess={setUsuario} />
                )
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Router>
      </FlotaProvider>
    </ChakraProvider>
  );
}

export default App;
