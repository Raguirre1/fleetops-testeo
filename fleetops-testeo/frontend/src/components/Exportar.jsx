// src/components/Exportar.jsx
import { useState } from "react";
import {
  Box,
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useFlota } from "./FlotaContext";
import {
  exportarPedidosBuque,
  exportarFlotaCompleta,
} from "../utils/exportarinfoSupabase";

function formatEta(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function Exportar({ usuario }) {
  const toast = useToast();
  const { flotaSeleccionada, buques } = useFlota();

  const [descargando, setDescargando] = useState(false);
  const [stage, setStage] = useState("");
  const [pDescarga, setPDescarga] = useState(0);
  const [pZip, setPZip] = useState(0);
  const [eta, setEta] = useState(0); // ⬅️ nuevo

  // Modal seleccionar buque
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [buqueId, setBuqueId] = useState("");

  const empezar = () => {
    setDescargando(true);
    setStage("");
    setPDescarga(0);
    setPZip(0);
    setEta(0);
  };
  const terminar = () => setDescargando(false);

  const handleExportFlota = async () => {
    if (!flotaSeleccionada?.id) {
      toast({ title: "Selecciona una flota primero", status: "warning" });
      return;
    }
    empezar();
    try {
      // Nota: ahora mismo exportarFlotaCompleta no emite progreso de descarga.
        await exportarFlotaCompleta(flotaSeleccionada.id, {
        onStage: setStage,
        onProgress: ({ percent, etaSeconds }) => {
            setPDescarga(percent);
            setEta(etaSeconds);
        },
        onZipProgress: setPZip,
        });

    } catch (e) {
      toast({
        title: "Error exportando flota",
        description: e?.message || "Inténtalo de nuevo",
        status: "error",
      });
    } finally {
      terminar();
    }
  };

  const handleExportBuque = async () => {
    if (!buqueId) {
      toast({ title: "Selecciona un buque", status: "warning" });
      return;
    }
    setIsOpenModal(false);
    empezar();
    try {
      await exportarPedidosBuque(buqueId, {
        onStage: setStage,
        onProgress: ({ percent, etaSeconds }) => { // ⬅️ usar onProgress
          setPDescarga(percent);
          setEta(etaSeconds);
        },
        onZipProgress: setPZip,
      });
    } catch (e) {
      toast({
        title: "Error exportando buque",
        description: e?.message || "Inténtalo de nuevo",
        status: "error",
      });
    } finally {
      terminar();
    }
  };

  return (
    <>
      <Menu>
        <MenuButton as={Button} colorScheme="blue" rightIcon={<ChevronDownIcon />}>
          📦 Exportar
        </MenuButton>
        <MenuList>
          <MenuItem onClick={() => setIsOpenModal(true)}>
            Pedidos y Asistencia de un buque…
          </MenuItem>
          <MenuItem onClick={handleExportFlota}>Flota completa</MenuItem>
        </MenuList>
      </Menu>

      {/* Modal selección de buque */}
      <Modal isOpen={isOpenModal} onClose={() => setIsOpenModal(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Exportar del buque</ModalHeader>
          <ModalBody>
            <Text mb={2}>Selecciona un buque:</Text>
            <Select
              value={buqueId}
              onChange={(e) => setBuqueId(e.target.value)}
              placeholder="Selecciona buque"
            >
              {buques?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button onClick={() => setIsOpenModal(false)}>Cancelar</Button>
            <Button colorScheme="blue" onClick={handleExportBuque} isDisabled={!buqueId}>
              Exportar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Overlay de progreso */}
      {descargando && (
        <Box
          position="fixed"
          inset={0}
          bg="rgba(255,255,255,0.85)"
          zIndex={9999}
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          px={6}
        >
          <Text fontSize="xl" mb={2} fontWeight="bold" color="blue.700">
            {stage || "Preparando exportación..."}
          </Text>

          <Box w="min(560px, 90vw)" bg="white" p={5} borderRadius="md" boxShadow="md">
            <Text fontSize="sm" color="gray.600" mb={1}>
              Descarga de archivos: {pDescarga}% {eta > 0 && `• ETA: ${formatEta(eta)}`}
            </Text>
            <Box bg="gray.200" h="8px" borderRadius="full" overflow="hidden" mb={3}>
              <Box bg="green.400" h="8px" width={`${pDescarga}%`} transition="width 0.2s" />
            </Box>

            <Text fontSize="sm" color="gray.600" mb={1}>
              Empaquetando ZIP: {pZip}%
            </Text>
            <Box bg="gray.200" h="8px" borderRadius="full" overflow="hidden">
              <Box bg="purple.400" h="8px" width={`${pZip}%`} transition="width 0.2s" />
            </Box>
          </Box>

          <Text mt={4} fontSize="sm" color="gray.600">
            No cierres esta ventana hasta que termine.
          </Text>
        </Box>
      )}
    </>
  );
}
