// src/components/ExcelUploadAjustes.jsx
import React, { useState } from "react";
import {
  Box, Button, Input, Table, Thead, Tbody, Tr, Th, Td,
  Text, HStack, useToast
} from "@chakra-ui/react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

const ExcelUploadAjustes = () => {
  const [rows, setRows] = useState([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const toast = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNombreArchivo(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const formatted = jsonData.map((row, idx) => {
        const valor = String(row.valor_factura || "0").replace(",", ".");
        return {
          id_local: idx + 1, // solo para renderizado
          buque_nombre: row.buque_nombre?.trim() || "",
          cuenta: row.cuenta?.trim() || "",
          mes: row.mes ? parseInt(row.mes, 10) : null,
          anio: row.anio ? parseInt(row.anio, 10) : null,
          valor_factura: isNaN(parseFloat(valor)) ? 0 : parseFloat(valor),
        };
      });

      setRows(formatted);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemove = (id_local) => {
    setRows(rows.filter(r => r.id_local !== id_local));
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      toast({ title: "No hay datos para guardar", status: "warning" });
      return;
    }

    try {
      const datos = rows.map(({ id_local, ...rest }) => rest);
      const { error } = await supabase.from("ajustes_cuentas").upsert(datos, {
        onConflict: ["buque_nombre", "cuenta", "mes", "anio"]
      });
      if (error) throw error;

      toast({ title: "Ajustes guardados correctamente", status: "success" });
      setRows([]);
      setNombreArchivo("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error al guardar en Supabase", description: err.message, status: "error" });
    }
  };

  return (
    <Box p={6} bg="white" borderRadius="md" boxShadow="md">
      <Text fontSize="xl" fontWeight="bold" mb={4}>📊 Cargar Ajustes de Cuentas</Text>

      <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} mb={4} />
      {nombreArchivo && <Text color="gray.600">Archivo: {nombreArchivo}</Text>}

      {rows.length > 0 && (
        <>
          <Table variant="striped" size="sm" mt={4}>
            <Thead>
              <Tr>
                <Th>Buque</Th>
                <Th>Cuenta</Th>
                <Th>Mes</Th>
                <Th>Año</Th>
                <Th isNumeric>Valor Factura (€)</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map(r => (
                <Tr key={r.id_local}>
                  <Td>{r.buque_nombre}</Td>
                  <Td>{r.cuenta}</Td>
                  <Td>{r.mes}</Td>
                  <Td>{r.anio}</Td>
                  <Td isNumeric>{r.valor_factura.toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</Td>
                  <Td>
                    <Button size="sm" colorScheme="red" onClick={() => handleRemove(r.id_local)}>Eliminar</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <HStack mt={4}>
            <Button onClick={handleSave} colorScheme="blue">💾 Guardar en Supabase</Button>
          </HStack>
        </>
      )}
    </Box>
  );
};

export default ExcelUploadAjustes;
