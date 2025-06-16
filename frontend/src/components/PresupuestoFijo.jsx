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
  Input,
  Button,
  IconButton,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";

const meses = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const PresupuestoFijo = ({ buque, anio }) => {
  const [datosPedidos, setDatosPedidos] = useState([]);
  const [datosAsistencias, setDatosAsistencias] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: pedidos, error: errorPedidos } = await supabase
        .from("presupuestos_fijos_pedidos")
        .select("tipo, " + meses.join(", "))
        .eq("buque", buque)
        .eq("anio", anio);

      const { data: asistencias, error: errorAsistencias } = await supabase
        .from("presupuestos_fijos_asistencias")
        .select("tipo, " + meses.join(", "))
        .eq("buque", buque)
        .eq("anio", anio);

      if (errorPedidos || errorAsistencias) {
        toast({
          title: "Error al cargar presupuestos fijos",
          description: errorPedidos?.message || errorAsistencias?.message,
          status: "error",
          duration: 3000,
        });
      } else {
        setDatosPedidos(pedidos);
        setDatosAsistencias(asistencias);
      }
    };

    cargarDatos();
  }, [buque, anio]);

  const handleChange = (setDatos, datos, index, campo, valor) => {
    const nuevos = [...datos];
    nuevos[index][campo] = valor;
    setDatos(nuevos);
  };

  const handleAgregarFila = (setDatos) => {
    const nuevaFila = { tipo: "" };
    meses.forEach((mes) => (nuevaFila[mes] = ""));
    setDatos((prev) => [...prev, nuevaFila]);
  };

  const handleEliminarFila = (setDatos, datos, index) => {
    const nuevos = [...datos];
    nuevos.splice(index, 1);
    setDatos(nuevos);
  };

  const guardar = async () => {
    const registrosPedidos = datosPedidos.map((fila) => {
      const registro = { buque, anio, tipo: fila.tipo };
      meses.forEach((mes) => {
        registro[mes] = parseFloat(fila[mes]) || 0;
      });
      return registro;
    });

    const registrosAsistencias = datosAsistencias.map((fila) => {
      const registro = { buque, anio, tipo: fila.tipo };
      meses.forEach((mes) => {
        registro[mes] = parseFloat(fila[mes]) || 0;
      });
      return registro;
    });

    const [{ error: errorPedidos }, { error: errorAsistencias }] = await Promise.all([
      supabase.from("presupuestos_fijos_pedidos").upsert(registrosPedidos, {
        onConflict: ["buque", "anio", "tipo"],
      }),
      supabase.from("presupuestos_fijos_asistencias").upsert(registrosAsistencias, {
        onConflict: ["buque", "anio", "tipo"],
      }),
    ]);

    if (errorPedidos || errorAsistencias) {
      toast({
        title: "Error al guardar",
        description: errorPedidos?.message || errorAsistencias?.message,
        status: "error",
      });
    } else {
      toast({ title: "Presupuesto fijo guardado correctamente", status: "success" });
    }
  };

  const renderTabla = (titulo, datos, setDatos, tipo) => (
    <Box mt={10}>
      <Heading size="sm" mb={2}>{titulo}</Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Tipo {tipo}</Th>
            {meses.map((mes) => (
              <Th key={mes} isNumeric>{mes.charAt(0).toUpperCase() + mes.slice(1)}</Th>
            ))}
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {datos.map((fila, i) => (
            <Tr key={i}>
              <Td>
                <Input
                  value={fila.tipo || ""}
                  onChange={(e) => handleChange(setDatos, datos, i, "tipo", e.target.value)}
                  size="sm"
                />
              </Td>
              {meses.map((mes) => (
                <Td key={mes} isNumeric>
                  <Input
                    value={fila[mes] || ""}
                    onChange={(e) => handleChange(setDatos, datos, i, mes, e.target.value)}
                    size="sm"
                    textAlign="right"
                    type="number"
                  />
                </Td>
              ))}
              <Td>
                <IconButton
                  size="sm"
                  icon={<DeleteIcon />}
                  onClick={() => handleEliminarFila(setDatos, datos, i)}
                  aria-label="Eliminar fila"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Button mt={2} size="sm" onClick={() => handleAgregarFila(setDatos)}>
        ➕ Añadir tipo {tipo}
      </Button>
    </Box>
  );

  return (
    <Box mt={10}>
      {renderTabla("Presupuesto fijo - Pedidos", datosPedidos, setDatosPedidos, "pedido")}
      {renderTabla("Presupuesto fijo - Asistencias", datosAsistencias, setDatosAsistencias, "asistencia")}
      <HStack justify="flex-end" mt={6}>
        <Button colorScheme="green" onClick={guardar}>Guardar todo</Button>
      </HStack>
    </Box>
  );
};

export default PresupuestoFijo;
