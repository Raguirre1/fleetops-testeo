// components/SeleccionFlota.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Select,
  Button,
  Heading,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const SeleccionFlota = ({ onFlotaSeleccionada }) => {
  const [flotas, setFlotas] = useState([]);
  const [flotaSeleccionadaId, setFlotaSeleccionadaId] = useState("");
  const toast = useToast();

  const cargarFlotas = async () => {
    const { data, error } = await supabase.from("flotas").select("*");
    if (error) {
      toast({ title: "Error al cargar flotas", status: "error" });
    } else {
      setFlotas(data);
    }
  };

  useEffect(() => {
    cargarFlotas();
  }, []);

  const manejarSeleccion = () => {
    if (!flotaSeleccionadaId) {
      toast({ title: "Selecciona una flota", status: "warning" });
      return;
    }
    const flotaCompleta = flotas.find(f => f.id === flotaSeleccionadaId);
    onFlotaSeleccionada(flotaCompleta); // ← enviamos todo el objeto flota
  };

  return (
    <Box p={8}>
      <VStack spacing={6}>
        <Heading size="md">Selecciona una Flota</Heading>
        <Select
          placeholder="Selecciona una flota"
          value={flotaSeleccionadaId}
          onChange={(e) => setFlotaSeleccionadaId(e.target.value)}
        >
          {flotas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </Select>
        <Button colorScheme="blue" onClick={manejarSeleccion}>
          Entrar
        </Button>
      </VStack>
    </Box>
  );
};

export default SeleccionFlota;
