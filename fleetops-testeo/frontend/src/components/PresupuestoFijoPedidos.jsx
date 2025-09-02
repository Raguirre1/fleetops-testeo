import React, { useState, useEffect, useRef } from "react";
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
  Select,
  useToast,
  HStack,
  Spinner,
  Flex,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";

const cuentas = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite", "Inversiones"
];

const tipos = ["Fijo", "Planificado"];

const meses = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const PresupuestoFijoPedidos = ({ anio, buqueId, buqueNombre, onRefrescar }) => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const toast = useToast();

  // Dialogo de confirmación para duplicados
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogFila, setDialogFila] = useState(null);
  const cancelRef = useRef();

  useEffect(() => {
    if (!buqueId) return;

    const cargarDatos = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from("presupuestos_fijos_pedidos")
        .select("*")
        .eq("anio", anio)
        .eq("buque_id", buqueId);

      if (error) {
        toast({
          title: "Error al cargar",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setRegistros([]);
      } else {
        setRegistros(data || []);
      }
      setCargando(false);
    };

    cargarDatos();
  }, [anio, buqueId]);

  const agregarFila = () => {
    setRegistros([
      ...registros,
      {
        id: null,
        buque_id: buqueId,
        anio,
        nombre: "",
        cuenta: "",
        tipo: "",
        ...Object.fromEntries(meses.map((m) => [m, ""])),
      },
    ]);
    setEditando(true);
  };

  const handleChange = (index, campo, valor) => {
    const nuevos = [...registros];
    nuevos[index][campo] = valor;
    setRegistros(nuevos);
    setEditando(true);
  };

  const eliminarFila = async (index) => {
    const fila = registros[index];
    if (fila.id) {
      const { error } = await supabase
        .from("presupuestos_fijos_pedidos")
        .delete()
        .eq("id", fila.id);
      if (error) {
        toast({
          title: "Error al eliminar",
          description: error.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    }
    setRegistros(registros.filter((_, i) => i !== index));
    toast({
      title: "Eliminado correctamente",
      status: "success",
      duration: 1500,
      isClosable: true,
    });
    setEditando(true);
    onRefrescar && onRefrescar();
  };

  // Nuevo: función para buscar duplicados en nuevas filas (sin id)
  const buscarDuplicados = () => {
    // Creamos una lista de claves únicas por fila
    const claves = registros.map(fila =>
        `${fila.nombre.trim().toLowerCase()}|${fila.cuenta}|${fila.tipo}`
    );
    // Busca si alguna clave aparece más de una vez
    for (let i = 0; i < claves.length; i++) {
        if (claves.indexOf(claves[i]) !== i) {
        return registros[i];
        }
    }
    return null;
  };


  const guardar = async () => {
    for (let fila of registros) {
      if (!fila.nombre || fila.nombre.trim() === "") {
        toast({
          title: "Nombre vacío",
          description: "No puede haber presupuestos sin nombre.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (!fila.cuenta || fila.cuenta.trim() === "") {
        toast({
          title: "Cuenta vacía",
          description: "Debe seleccionar una cuenta contable.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (!fila.tipo || fila.tipo.trim() === "") {
        toast({
          title: "Tipo vacío",
          description: "Debe seleccionar un tipo de presupuesto.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    // Buscar duplicados en nuevas filas respecto a todas (existentes + nuevas)
    const duplicada = buscarDuplicados();
    if (duplicada) {
      setDialogFila(duplicada);
      setIsDialogOpen(true);
      return;
    }

    await guardarPresupuestos();
  };

  // Guardado real (llamado por guardar() o desde el dialog)
  const guardarPresupuestos = async () => {
    setCargando(true);

    for (const fila of registros) {
      if (fila.id) {
        // UPDATE (si la fila ya existe)
        const { error } = await supabase
          .from("presupuestos_fijos_pedidos")
          .update({
            nombre: fila.nombre.trim(),
            cuenta: fila.cuenta.trim(),
            tipo: fila.tipo.trim(),
            ...Object.fromEntries(meses.map((m) => [m, parseFloat(fila[m]) || 0])),
          })
          .eq("id", fila.id);

        if (error) {
          toast({
            title: "Error al actualizar",
            description: error.message,
            status: "error",
            duration: 4000,
            isClosable: true,
          });
          setCargando(false);
          return;
        }
      } else {
        // INSERT (si es una fila nueva)
        const { error } = await supabase
          .from("presupuestos_fijos_pedidos")
          .insert([{
            buque_id: buqueId,
            anio,
            nombre: fila.nombre.trim(),
            cuenta: fila.cuenta.trim(),
            tipo: fila.tipo.trim(),
            ...Object.fromEntries(meses.map((m) => [m, parseFloat(fila[m]) || 0]))
          }]);
        if (error) {
          toast({
            title: "Error al insertar",
            description: error.message,
            status: "error",
            duration: 4000,
            isClosable: true,
          });
          setCargando(false);
          return;
        }
      }
    }

    toast({
      title: "Presupuestos guardados correctamente",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
    setEditando(false);

    // Recargar después de guardar
    const { data } = await supabase
      .from("presupuestos_fijos_pedidos")
      .select("*")
      .eq("anio", anio)
      .eq("buque_id", buqueId);

    setRegistros(data || []);
    setCargando(false);
    onRefrescar && onRefrescar();
  };

  const totalAnual = (fila) =>
    meses.reduce((acc, mes) => acc + (parseFloat(fila[mes]) || 0), 0);

  // ---------- Render principal ----------
  if (cargando) {
    return (
      <Flex align="center" justify="center" p={6}>
        <Spinner size="lg" />
        <Box ml={3}>Cargando presupuestos fijos de pedidos...</Box>
      </Flex>
    );
  }

  return (
    <Box mt={2}>
      <HStack mb={3} justify="space-between">
        <Heading size="sm" color="teal.700">
          📦 Presupuesto Fijos Pedidos ({anio}) - {buqueNombre || buqueId}
        </Heading>
        <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={agregarFila} size="sm">
          Añadir presupuesto
        </Button>
      </HStack>
      <Table size="sm" variant="striped" colorScheme="teal">
        <Thead>
          <Tr>
            <Th>Nombre del presupuesto</Th>
            <Th>Cuenta contable</Th>
            <Th>Tipo</Th>
            {meses.map((mes) => (
              <Th key={mes} isNumeric>
                {mes.charAt(0).toUpperCase() + mes.slice(1, 3)}
              </Th>
            ))}
            <Th isNumeric>Total anual</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {registros.map((fila, idx) => (
            <Tr key={fila.id ? fila.id : "nueva-" + idx}>
              <Td>
                <Input
                  value={fila.nombre}
                  size="sm"
                  onChange={(e) =>
                    handleChange(idx, "nombre", e.target.value)
                  }
                  placeholder="Ej: Suministros críticos"
                  variant="flushed"
                  fontWeight="bold"
                />
              </Td>
              <Td>
                <Select
                  value={fila.cuenta}
                  size="sm"
                  onChange={(e) =>
                    handleChange(idx, "cuenta", e.target.value)
                  }
                  placeholder="Selecciona cuenta"
                  variant="flushed"
                  fontWeight="bold"
                >
                  {cuentas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Td>
              <Td>
                <Select
                  value={fila.tipo}
                  size="sm"
                  onChange={(e) =>
                    handleChange(idx, "tipo", e.target.value)
                  }
                  placeholder="Selecciona tipo"
                  variant="flushed"
                  fontWeight="bold"
                >
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Td>
              {meses.map((mes) => (
                <Td key={mes} isNumeric>
                  <Input
                    value={fila[mes]}
                    size="sm"
                    type="number"
                    min={0}
                    step="0.01"
                    onChange={(e) =>
                      handleChange(idx, mes, e.target.value)
                    }
                    variant="filled"
                    textAlign="right"
                  />
                </Td>
              ))}
              <Td isNumeric fontWeight="bold">
                {totalAnual(fila).toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                })}
              </Td>
              <Td>
                <IconButton
                  icon={<DeleteIcon />}
                  colorScheme="red"
                  size="sm"
                  aria-label="Eliminar"
                  onClick={() => eliminarFila(idx)}
                  variant="ghost"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Flex justify="flex-end" mt={4}>
        <Button
          colorScheme="teal"
          onClick={guardar}
          isDisabled={!editando && registros.length > 0}
        >
          Guardar cambios
        </Button>
      </Flex>
      {registros.length === 0 && (
        <Box textAlign="center" color="gray.500" mt={8}>
          No hay presupuestos fijos de pedidos para este buque y año.<br />
          Haz clic en <b>"Añadir presupuesto"</b> para crear uno nuevo.
        </Box>
      )}

      {/* AlertDialog para confirmar duplicados */}
      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Presupuesto duplicado
            </AlertDialogHeader>
            <AlertDialogBody>
              Ya existe un presupuesto con el mismo <b>nombre</b>, <b>cuenta</b> y <b>tipo</b>.<br /><br />
              ¿Seguro que quieres añadirlo igualmente?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button colorScheme="teal" ml={3} onClick={async () => {
                setIsDialogOpen(false);
                await guardarPresupuestos();
              }}>
                Añadir de todos modos
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PresupuestoFijoPedidos;
