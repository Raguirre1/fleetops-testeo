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
  Button,
  Input,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { DownloadIcon, AddIcon, DeleteIcon } from "@chakra-ui/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import PresupuestoMensual from "./PresupuestoMensual";
import { supabase } from "../supabaseClient";
import { useFlota } from "./FlotaContext"; // ✅ NUEVO

const cuentas = [
  "Casco",
  "Máquinas",
  "Electricidad",
  "Electrónicas",
  "SEP",
  "Fonda",
  "MLC",
  "Aceite",
  "Inversiones",
];

const agrupaciones = {
  MANTENIMIENTO: ["Casco", "Máquinas", "Electricidad", "Electrónicas"],
  "OTROS CASCOS": ["MLC", "SEP", "Fonda"],
};

const Presupuesto = () => {
  const { buques } = useFlota(); // ✅ NUEVO
  const [presupuestos, setPresupuestos] = useState({});
  const [anios, setAnios] = useState([]);
  const [vistaMensual, setVistaMensual] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const cargarPresupuestos = async () => {
      const { data, error } = await supabase.from("presupuestos").select("*");
      if (error) return;

      const nuevosPresupuestos = {};
      const añosUnicos = new Set();

      data.forEach(({ anio, cuenta, buque, valor }) => {
        if (!nuevosPresupuestos[anio]) nuevosPresupuestos[anio] = {};
        if (!nuevosPresupuestos[anio][cuenta]) nuevosPresupuestos[anio][cuenta] = {};
        nuevosPresupuestos[anio][cuenta][buque] = valor;
        añosUnicos.add(anio);
      });

      setPresupuestos(nuevosPresupuestos);
      setAnios(Array.from(añosUnicos).sort());
    };

    cargarPresupuestos();
  }, []);

  const crearNuevoPresupuesto = () => {
    const nuevoAño = anios.length > 0 ? Math.max(...anios) + 1 : 2025;
    if (anios.includes(nuevoAño)) return;

    const nuevo = {};
    cuentas.forEach((cuenta) => {
      nuevo[cuenta] = {};
      buques.forEach((buque) => {
        nuevo[cuenta][buque] = "";
      });
    });

    setPresupuestos((prev) => ({ ...prev, [nuevoAño]: nuevo }));
    setAnios((prev) => [...prev, nuevoAño]);
  };

  const actualizarValor = (año, cuenta, buque, valor) => {
    setPresupuestos((prev) => ({
      ...prev,
      [año]: {
        ...prev[año],
        [cuenta]: {
          ...prev[año][cuenta],
          [buque]: valor,
        },
      },
    }));
  };

  const guardarPresupuesto = async (año) => {
    const registros = [];
    cuentas.forEach((cuenta) => {
      buques.forEach((buque) => {
        const valor = parseFloat(presupuestos[año][cuenta][buque]) || 0;
        registros.push({ anio: año, cuenta, buque, valor });
      });
    });

    const { error } = await supabase.from("presupuestos").upsert(registros, {
      onConflict: ["anio", "cuenta", "buque"],
    });

    if (!error) {
      toast({
        title: `Presupuesto ${año} guardado correctamente`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const exportarExcel = (año) => {
    const datos = [];
    cuentas.forEach((cuenta) => {
      const fila = { Cuenta: cuenta };
      buques.forEach((buque) => {
        fila[buque] = presupuestos[año][cuenta][buque] || 0;
      });
      datos.push(fila);
    });

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Presupuesto_${año}`);
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Presupuesto_${año}.xlsx`);
  };

  if (vistaMensual) {
    return (
      <PresupuestoMensual
        anio={vistaMensual.año}
        buque={vistaMensual.buque}
        onVolver={() => setVistaMensual(null)}
      />
    );
  }

  if (!buques.length) return null; // 🛑 Prevención si aún no se han cargado

  return (
    <Box>
      <Heading size="md" mb={4}>
        📊 Presupuesto Anual por Buque y Cuenta
      </Heading>
      <Button
        colorScheme="teal"
        leftIcon={<AddIcon />}
        onClick={crearNuevoPresupuesto}
        mb={4}
      >
        Nuevo presupuesto
      </Button>

      <Tabs variant="enclosed" isFitted>
        <TabList>
          {anios.map((año) => (
            <Tab key={año}>{año}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {anios.map((año) => (
            <TabPanel key={año} px={0}>
              <HStack justify="flex-end" mb={2} gap={2} px={4}>
                <Button colorScheme="green" onClick={() => guardarPresupuesto(año)}>
                  Guardar presupuesto
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => exportarExcel(año)}
                  leftIcon={<DownloadIcon />}
                >
                  Exportar Excel
                </Button>
                <Button
                  colorScheme="red"
                  leftIcon={<DeleteIcon />}
                  onClick={async () => {
                    const confirmado = window.confirm(`¿Seguro que deseas eliminar el presupuesto de ${año}?`);
                    if (!confirmado) return;

                    const { error } = await supabase
                      .from("presupuestos")
                      .delete()
                      .eq("anio", año);

                    if (error) {
                      toast({
                        title: "Error al eliminar el presupuesto",
                        description: error.message,
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                      });
                      return;
                    }

                    const actualizado = { ...presupuestos };
                    delete actualizado[año];
                    setPresupuestos(actualizado);
                    setAnios((prev) => prev.filter((a) => a !== año));

                    toast({
                      title: `Presupuesto ${año} eliminado`,
                      status: "info",
                      duration: 2000,
                      isClosable: true,
                    });
                  }}
                >
                  Eliminar
                </Button>
              </HStack>

              <Table size="sm" variant="striped" colorScheme="gray" boxShadow="md" borderRadius="md">
                <Thead>
                  <Tr>
                    <Th fontSize="sm" bg="teal.100" color="teal.800" textTransform="uppercase">
                      CUENTA \ BUQUE
                    </Th>
                    {buques.map((buque) => (
                      <Th
                        key={buque}
                        fontSize="sm"
                        bg="teal.100"
                        color="teal.800"
                        textTransform="uppercase"
                        isNumeric
                        cursor="pointer"
                        _hover={{ bg: "teal.200" }}
                        onClick={() => setVistaMensual({ año, buque })}
                        title={`Ver mensualización de ${buque}`}
                      >
                        {buque}
                      </Th>
                    ))}
                    <Th fontSize="sm" bg="teal.100" color="teal.800" textTransform="uppercase" isNumeric>
                      TOTAL
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Object.entries(agrupaciones).map(([grupo, cuentasGrupo]) => (
                    <React.Fragment key={grupo}>
                      <Tr bg="teal.50">
                        <Td colSpan={buques.length + 2} fontWeight="bold" textAlign="center">
                          {grupo}
                        </Td>
                      </Tr>
                      {cuentasGrupo.map((cuenta) => {
                        const totalCuenta = buques.reduce(
                          (acc, buque) => acc + (parseFloat(presupuestos[año][cuenta][buque]) || 0),
                          0
                        );
                        return (
                          <Tr key={cuenta}>
                            <Td>{cuenta}</Td>
                            {buques.map((buque) => (
                              <Td key={buque} isNumeric>
                                <Input
                                  size="sm"
                                  type="number"
                                  value={presupuestos[año][cuenta][buque] || ""}
                                  textAlign="right"
                                  px={2}
                                  variant="filled"
                                  borderColor="teal.300"
                                  focusBorderColor="teal.500"
                                  onChange={(e) => actualizarValor(año, cuenta, buque, e.target.value)}
                                />
                              </Td>
                            ))}
                            <Td isNumeric fontWeight="bold">
                              {totalCuenta.toLocaleString("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </Td>
                          </Tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <Tr bg="teal.200">
                    <Td fontWeight="bold">TOTAL FINAL</Td>
                    {buques.map((buque) => {
                      const totalBuque = cuentas.reduce(
                        (acc, cuenta) => acc + (parseFloat(presupuestos[año][cuenta][buque]) || 0),
                        0
                      );
                      return (
                        <Td key={buque} isNumeric fontWeight="bold">
                          {totalBuque.toLocaleString("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </Td>
                      );
                    })}
                    <Td isNumeric fontWeight="bold">
                      {cuentas.reduce((acc, cuenta) => {
                        return (
                          acc +
                          buques.reduce(
                            (suma, buque) => suma + (parseFloat(presupuestos[año][cuenta][buque]) || 0),
                            0
                          )
                        );
                      }, 0).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Presupuesto;
