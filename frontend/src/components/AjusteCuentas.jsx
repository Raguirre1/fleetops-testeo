import React, { useEffect, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Select, Input, Spinner, useToast, Text
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";
import { useFlota } from "./FlotaContext";

const ORDEN_CUENTAS = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite"
];

const AjusteCuentas = () => {
  const { buques } = useFlota();
  const toast = useToast();

  const [selectedBuque, setSelectedBuque] = useState("");
  const [selectedMes, setSelectedMes] = useState("");
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [valores, setValores] = useState({});
  const [loading, setLoading] = useState(false);

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    if (selectedBuque && selectedMes && selectedAnio) {
      cargarAjustes();
    }
  }, [selectedBuque, selectedMes, selectedAnio]);

  const cargarAjustes = async () => {
    setLoading(true);
    const nombreBuque = buques.find(b => b.id === selectedBuque)?.nombre;
    const { data, error } = await supabase
      .from("ajustes_cuentas")
      .select()
      .eq("buque_nombre", nombreBuque)
      .eq("anio", selectedAnio)
      .eq("mes", meses.indexOf(selectedMes) + 1);

    if (error) {
      toast({ status: "error", title: "Error al cargar ajustes" });
      setLoading(false);
      return;
    }

    const nuevosValores = {};
    ORDEN_CUENTAS.forEach(cuenta => {
      const ajuste = data?.find(d => d.cuenta === cuenta);
      nuevosValores[cuenta] = ajuste?.real_acumulado || "";
    });
    setValores(nuevosValores);
    setLoading(false);
  };

  const guardarAjuste = async (cuenta, valor) => {
    if (!selectedBuque || !selectedMes || !selectedAnio || valor === "") return;

    const nombreBuque = buques.find(b => b.id === selectedBuque)?.nombre;
    const mesNum = meses.indexOf(selectedMes) + 1;

    const { error } = await supabase.from("ajustes_cuentas").upsert({
      buque_id: selectedBuque,
      buque_nombre: nombreBuque,
      cuenta,
      real_acumulado: parseFloat(valor),
      mes: mesNum,
      anio: selectedAnio,
    }, { onConflict: "buque_id,cuenta,mes,anio" });

    if (error) {
      console.error(error);
      toast({ status: "error", title: `Error al guardar ${cuenta}` });
    } else {
      toast({ status: "success", title: `Guardado ${cuenta}` });
    }
  };

  const handleChange = (cuenta, valor) => {
    const valorNum = valor.replace(",", ".");
    if (!isNaN(valorNum)) {
      setValores(prev => ({ ...prev, [cuenta]: valorNum }));
      guardarAjuste(cuenta, valorNum);
    }
  };

  return (
    <Box p={6} bg="white" borderRadius="md" boxShadow="md">
      <Heading size="md" mb={4}>🧮 Ajuste de cuentas – Real acumulado</Heading>

      <Box display="flex" gap={4} mb={4}>
        <Select placeholder="Selecciona buque" value={selectedBuque} onChange={e => setSelectedBuque(e.target.value)}>
          {buques.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </Select>
        <Select value={selectedAnio} onChange={e => setSelectedAnio(Number(e.target.value))}>
          {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select placeholder="Selecciona mes" value={selectedMes} onChange={e => setSelectedMes(e.target.value)}>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </Box>

      {loading ? (
        <Spinner />
      ) : selectedBuque && selectedMes ? (
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Cuenta</Th>
              <Th>Real acumulado (€)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {ORDEN_CUENTAS.map(cuenta => (
              <Tr key={cuenta}>
                <Td>{cuenta}</Td>
                <Td>
                  <Input
                    value={valores[cuenta] || ""}
                    onChange={e => handleChange(cuenta, e.target.value)}
                    placeholder="0.00"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Text>Selecciona buque, mes y año para comenzar.</Text>
      )}
    </Box>
  );
};

export default AjusteCuentas;
