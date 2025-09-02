import React from "react";
import {
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box
} from "@chakra-ui/react";

// Importa tus módulos
import PurchaseRequest from "./PurchaseRequest";
import AsistenciasTecnicas from "./AsistenciasTecnicas"; // crea este si no existe
import Provisiones from "./Provisiones";

const Dashboard = ({ usuario }) => {
  return (
    <Box p={4}>
      <Tabs isFitted variant="enclosed">
        <TabList mb="1em">
          <Tab>🛒 Compras</Tab>
          <Tab>🔧 Asistencias Técnicas</Tab>
          <Tab>📊 Provisiones</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <PurchaseRequest usuario={usuario} />
          </TabPanel>
          <TabPanel>
            <AsistenciasTecnicas usuario={usuario} />
          </TabPanel>
          <TabPanel>
            <Provisiones usuario={usuario} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Dashboard;
