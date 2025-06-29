import React, { useEffect, useState, useRef } from "react";
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
  useToast,
  HStack,
  Select,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

// Nombres de columnas tal y como están en la BBDD
const mesesDB = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];
// Nombres visuales (cortos)
const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const cuentasContables = [
  "Casco",
  "Máquinas",
  "Electricidad",
  "Electrónica",
  "MLC",
  "SEP",
  "Fonda",
  "Aceite",
  "Otros",
];

const tiposGasto = [
  { value: "Fijo", label: "Fijo" },
  { value: "Planificado", label: "Planificado" },
];

const PresupuestoFijo = ({ buqueId, anio }) => {
  const [datosPedidos, setDatosPedidos] = useState([]);
  const [datosAsistencias, setDatosAsistencias] = useState([]);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, tabla: null, idx: null });
  const toast = useToast();
  const boxRef = useRef();

  // Cierra el menú contextual si haces clic fuera
  useEffect(() => {
    const handleClick = () => setMenu({ open: false, x: 0, y: 0, tabla: null, idx: null });
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: pedidos, error: errorPedidos } = await supabase
        .from("presupuestos_fijos_pedidos")
        .select("id, tipo, cuenta, tipo_gasto, " + mesesDB.join(", "))
        .eq("buque_id", buqueId)
        .eq("anio", anio);

      const { data: asistencias, error: errorAsistencias } = await supabase
        .from("presupuestos_fijos_asistencias")
        .select("id, tipo, cuenta, tipo_gasto, " + mesesDB.join(", "))
        .eq("buque_id", buqueId)
        .eq("anio", anio);

      if (errorPedidos || errorAsistencias) {
        toast({
          title: "Error al cargar presupuestos fijos",
          description: errorPedidos?.message || errorAsistencias?.message,
          status: "error",
          duration: 3000,
        });
      } else {
        setDatosPedidos((pedidos || []).map(fila => ({
          ...fila,
          tipo_gasto: fila.tipo_gasto || "Fijo",
          ...Object.fromEntries(mesesDB.map(mes => [mes, fila[mes] ?? ""]))
        })));
        setDatosAsistencias((asistencias || []).map(fila => ({
          ...fila,
          tipo_gasto: fila.tipo_gasto || "Fijo",
          ...Object.fromEntries(mesesDB.map(mes => [mes, fila[mes] ?? ""]))
        })));
      }
    };

    cargarDatos();
  }, [buqueId, anio]);

  const handleChange = (setDatos, datos, index, campo, valor) => {
    const nuevos = [...datos];
    nuevos[index][campo] = valor;
    setDatos(nuevos);
  };

  const handleAgregarFila = (setDatos) => {
    const nuevaFila = { 
      // No incluimos id aquí, se generará en la BBDD para nuevas filas
      tipo: "",
      cuenta: "",
      tipo_gasto: "Fijo"
    };
    mesesDB.forEach((mes) => (nuevaFila[mes] = ""));
    setDatos((prev) => [...prev, nuevaFila]);
  };

  const handleEliminarFila = (tabla, idx) => {
    if (tabla === "pedidos") setDatosPedidos(prev => prev.filter((_, i) => i !== idx));
    if (tabla === "asistencias") setDatosAsistencias(prev => prev.filter((_, i) => i !== idx));
    setMenu({ open: false, x: 0, y: 0, tabla: null, idx: null });
  };

  // Helper para comprobar si un string es un uuid v4 válido (básico)
  const isUUID = (str) =>
    typeof str === "string" && str.length === 36 && /^[0-9a-f-]+$/.test(str) && str.includes("-");

  const guardar = async () => {
    const isUUID = (str) =>
      typeof str === "string" && str.length === 36 && /^[0-9a-f-]+$/.test(str) && str.includes("-");

    const preparar = (fila) => {
      const registro = {
        buque_id: buqueId,
        anio,
        tipo: fila.tipo,
        cuenta: fila.cuenta,
        tipo_gasto: fila.tipo_gasto || "Fijo"
      };
      mesesDB.forEach((mes) => {
        registro[mes] = parseFloat(fila[mes]) || 0;
      });
      if (fila.id && isUUID(fila.id)) registro.id = fila.id;
      return registro;
    };

    const registrosPedidos = datosPedidos.map(preparar);
    const registrosAsistencias = datosAsistencias.map(preparar);

    let errorPedidos, errorAsistencias;

    // 🔴 Aquí el onConflict va con el conjunto UNIQUE
    ({ error: errorPedidos } = await supabase
      .from("presupuestos_fijos_pedidos")
      .upsert(registrosPedidos, { onConflict: ["buque_id", "anio", "tipo", "cuenta"] }));

    ({ error: errorAsistencias } = await supabase
      .from("presupuestos_fijos_asistencias")
      .upsert(registrosAsistencias, { onConflict: ["buque_id", "anio", "tipo", "cuenta"] }));

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

  
  const renderTabla = (titulo, datos, setDatos, tipo, tablaKey) => (
    <Box
      mt={10}
      bg="gray.50"
      borderRadius="xl"
      boxShadow="base"
      p={4}
      overflowX="auto"
      maxW="100%"
      ref={boxRef}
      position="relative"
    >
      <Box minW="1200px">
        <Heading size="sm" mb={2}>{titulo}</Heading>
        <Table size="sm" variant="striped" colorScheme="teal" borderRadius="xl">
          <Thead>
            <Tr>
              <Th fontSize="sm">TIPO {tipo.toUpperCase()}</Th>
              <Th fontSize="sm">CUENTA</Th>
              <Th fontSize="sm">TIPO DE GASTO</Th>
              {meses.map((mes, idx) => (
                <Th key={mes} isNumeric fontSize="sm">{mes}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {datos.map((fila, i) => (
              <Tr key={fila.id || i} _hover={{ bg: "teal.50" }}>
                <Td
                  bg="white"
                  style={{ cursor: "context-menu", userSelect: "none" }}
                  onContextMenu={e => {
                    e.preventDefault();
                    setMenu({ open: true, x: e.clientX, y: e.clientY, tabla: tablaKey, idx: i });
                  }}
                >
                  <Input
                    placeholder="Ej: Contrato IT"
                    value={fila.tipo || ""}
                    onChange={(e) => handleChange(setDatos, datos, i, "tipo", e.target.value)}
                    size="sm"
                    w="auto"
                    borderRadius="lg"
                  />
                </Td>
                <Td bg="white">
                  <Select
                    value={fila.cuenta || ""}
                    onChange={(e) => handleChange(setDatos, datos, i, "cuenta", e.target.value)}
                    size="sm"
                    placeholder="Selecciona"
                    minW="85px"
                    maxW="110px"
                    borderRadius="lg"
                  >
                    {cuentasContables.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Td>
                <Td bg="white">
                  <Select
                    value={fila.tipo_gasto || "Fijo"}
                    onChange={(e) => handleChange(setDatos, datos, i, "tipo_gasto", e.target.value)}
                    size="sm"
                    bg={fila.tipo_gasto === "Planificado" ? "orange.50" : "blue.50"}
                    color={fila.tipo_gasto === "Planificado" ? "orange.800" : "blue.800"}
                    fontWeight="bold"
                    minW="110px"
                    maxW="130px"
                    borderRadius="lg"
                  >
                    {tiposGasto.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </Td>
                {mesesDB.map((mes, idx) => (
                  <Td key={mes} bg="white" isNumeric>
                    <Input
                      value={fila[mes] || ""}
                      onChange={(e) => handleChange(setDatos, datos, i, mes, e.target.value)}
                      size="sm"
                      textAlign="right"
                      type="number"
                      borderRadius="lg"
                      minW="50px"
                      placeholder="0"
                    />
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
        {menu.open && menu.tabla === tablaKey && (
          <Box
            position="fixed"
            zIndex={10}
            left={menu.x}
            top={menu.y}
            bg="white"
            boxShadow="xl"
            borderRadius="md"
            border="1px solid #eee"
            minW="130px"
            p={1}
          >
            <Button
              colorScheme="red"
              variant="ghost"
              size="sm"
              w="100%"
              onClick={() => handleEliminarFila(menu.tabla, menu.idx)}
            >
              Eliminar fila
            </Button>
          </Box>
        )}
      </Box>
      <Button
        mt={4}
        size="sm"
        onClick={() => handleAgregarFila(setDatos)}
        colorScheme="teal"
        borderRadius="xl"
      >
        ➕ Añadir tipo {tipo}
      </Button>
    </Box>
  );

  return (
    <Box mt={10}>
      {renderTabla("Presupuesto fijo - Pedidos", datosPedidos, setDatosPedidos, "pedido", "pedidos")}
      {renderTabla("Presupuesto fijo - Asistencias", datosAsistencias, setDatosAsistencias, "asistencia", "asistencias")}
      <HStack justify="flex-end" mt={6}>
        <Button colorScheme="green" onClick={guardar}>Guardar todo</Button>
      </HStack>
    </Box>
  );
};

export default PresupuestoFijo;
