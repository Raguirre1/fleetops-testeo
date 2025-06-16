import React, { useState, useEffect } from "react";
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
  Spinner,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../supabaseClient";
import PresupuestoFijo from "./PresupuestoFijo";

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

const meses = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const PresupuestoMensual = ({ anio, buque, onVolver }) => {
  const [datos, setDatos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [refrescarFijo, setRefrescarFijo] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const cargarDatos = async () => {
      const { data, error } = await supabase
        .from("presupuesto_mensual")
        .select("*")
        .eq("anio", anio)
        .eq("buque", buque);

      const estructura = {};
      cuentas.forEach((cuenta) => {
        estructura[cuenta] = {};
        meses.forEach((mes) => {
          const fila = data?.find(
            (r) => r.cuenta === cuenta && r.mes === mes
          );
          estructura[cuenta][mes] = fila ? fila.valor : "";
        });
      });

      setDatos(estructura);
      setCargando(false);
    };

    cargarDatos();
  }, [anio, buque]);

  const handleChange = (cuenta, mes, valor) => {
    setDatos((prev) => ({
      ...prev,
      [cuenta]: {
        ...prev[cuenta],
        [mes]: valor,
      },
    }));
  };

  const guardar = async () => {
    const registros = [];

    cuentas.forEach((cuenta) => {
      meses.forEach((mes) => {
        const valor = parseFloat(datos[cuenta][mes]) || 0;
        registros.push({ anio, buque, cuenta, mes, valor });
      });
    });

    const { error } = await supabase
      .from("presupuesto_mensual")
      .upsert(registros, { onConflict: ["anio", "buque", "cuenta", "mes"] });

    if (error) {
      toast({
        title: "Error al guardar",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Presupuesto mensual guardado correctamente",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const exportarExcel = () => {
    const datosExcel = [];

    cuentas.forEach((cuenta) => {
      const fila = { Cuenta: cuenta };
      meses.forEach((mes) => {
        fila[mes] = datos[cuenta][mes] || 0;
      });
      datosExcel.push(fila);
    });

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${buque}_${anio}`);
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `PresupuestoMensual_${buque}_${anio}.xlsx`);
  };

  const totalPorCuenta = (cuenta) =>
    meses.reduce(
      (acc, mes) => acc + (parseFloat(datos[cuenta][mes]) || 0),
      0
    );

  const totalPorMes = (mes) =>
    cuentas.reduce(
      (acc, cuenta) => acc + (parseFloat(datos[cuenta][mes]) || 0),
      0
    );

  const totalGeneral = () =>
    cuentas.reduce(
      (acc, cuenta) =>
        acc +
        meses.reduce(
          (sum, mes) => sum + (parseFloat(datos[cuenta][mes]) || 0),
          0
        ),
      0
    );

  if (cargando) {
    return (
      <Box p={8}>
        <Heading size="md" mb={4}>
          Cargando presupuesto mensual de {buque} ({anio})...
        </Heading>
        <Spinner size="lg" color="teal.500" />
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">📅 Presupuesto mensual - {buque} ({anio})</Heading>
        <Button onClick={onVolver} colorScheme="gray">
          ← Volver al resumen
        </Button>
      </HStack>

      <HStack justify="flex-end" mb={2}>
        <Button colorScheme="green" onClick={guardar}>
          Guardar
        </Button>
        <Button colorScheme="blue" leftIcon={<DownloadIcon />} onClick={exportarExcel}>
          Exportar Excel
        </Button>
      </HStack>

      <Table size="sm" variant="striped" colorScheme="gray" boxShadow="md">
        <Thead>
          <Tr>
            <Th>Cuenta \ Mes</Th>
            {meses.map((mes) => (
              <Th key={mes} isNumeric>{mes}</Th>
            ))}
            <Th isNumeric bg="teal.50">Total cuenta</Th>
          </Tr>
        </Thead>
        <Tbody>
          {cuentas.map((cuenta) => (
            <Tr key={cuenta}>
              <Td>{cuenta}</Td>
              {meses.map((mes) => (
                <Td key={mes} isNumeric>
                  <Input
                    size="sm"
                    type="number"
                    textAlign="right"
                    value={datos[cuenta][mes] || ""}
                    onChange={(e) => handleChange(cuenta, mes, e.target.value)}
                    variant="filled"
                    borderColor="teal.300"
                    focusBorderColor="teal.500"
                  />
                </Td>
              ))}
              <Td isNumeric fontWeight="bold" bg="teal.50">
                {totalPorCuenta(cuenta).toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </Td>
            </Tr>
          ))}
          <Tr bg="teal.100">
            <Td fontWeight="bold">Total mes</Td>
            {meses.map((mes) => (
              <Td key={mes} isNumeric fontWeight="bold">
                {totalPorMes(mes).toLocaleString("es-ES", {
                  style: "currency",
                  currency: "EUR",
                })}
              </Td>
            ))}
            <Td isNumeric fontWeight="bold" bg="teal.200">
              {totalGeneral().toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <Box mt={10}>
        <PresupuestoFijo
          anio={anio}
          buque={buque}
          onRefrescar={() => setRefrescarFijo(!refrescarFijo)}
        />
      </Box>
    </Box>
  );
};

export default PresupuestoMensual;
