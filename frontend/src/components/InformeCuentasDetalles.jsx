// src/components/InformeCuentasDetalles.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Button, Input, Flex, Select
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// 🔹 Quitamos "Inversiones"
const cuentas = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite"
];

const mesesCorto = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const InformeCuentasDetalles = ({ buque, buqueNombre, cuenta, mesNum, anio, onBack }) => {
  const [gastos, setGastos] = useState([]);
  const [ajustes, setAjustes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenCampo, setOrdenCampo] = useState("valor");
  const [ordenDireccion, setOrdenDireccion] = useState("desc");
  const [busqueda, setBusqueda] = useState("");

  const buqueNombreSinTilde = buqueNombre?.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // --- Cargar gastos pedidos y asistencias ---
  const cargarDatos = async () => {
    setLoading(true);

    const [{ data: pedidos }, { data: cotizaciones }, { data: asistencias }, { data: cotizacionesAsist }, { data: ajustesCuentas }] = await Promise.all([
      supabase.from("solicitudes_compra").select("numero_pedido, buque_id, numero_cuenta, titulo_pedido"),
      supabase.from("cotizaciones_proveedor").select("numero_pedido, proveedor, valor, valor_factura, estado, fecha_aceptacion").eq("estado", "aceptada"),
      supabase.from("solicitudes_asistencia").select("numero_ate, buque_id, numero_cuenta, titulo_ate"),
      supabase.from("asistencias_proveedor").select("numero_asistencia, proveedor, valor, valor_factura, estado, fecha_aceptacion").eq("estado", "aceptada"),
      supabase.from("ajustes_cuentas")
        .select("*")
        .eq("anio", anio)
        .lte("mes", mesNum)
        .eq("buque_nombre", buqueNombreSinTilde)
        .eq("cuenta", cuenta)
    ]);

    setAjustes(ajustesCuentas || []);

    const lista = [];

    pedidos?.forEach((pedido) => {
      if (pedido.buque_id === buque && pedido.numero_cuenta === cuenta) {
        cotizaciones?.forEach((cot) => {
          if (cot.numero_pedido === pedido.numero_pedido && cot.fecha_aceptacion) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) <= mesNum && f.getFullYear() === anio) {
              lista.push({
                tipo: "Pedido",
                referencia: pedido.numero_pedido,
                titulo: pedido.titulo_pedido || "",
                proveedor: cot.proveedor,
                cuenta: pedido.numero_cuenta || "",
                valor: Number(cot.valor) || 0,
                valor_factura: cot.valor_factura ? Number(cot.valor_factura) : null,
                fecha: cot.fecha_aceptacion,
              });
            }
          }
        });
      }
    });

    asistencias?.forEach((asistencia) => {
      if (asistencia.buque_id === buque && asistencia.numero_cuenta === cuenta) {
        cotizacionesAsist?.forEach((cot) => {
          if (cot.numero_asistencia === asistencia.numero_ate && cot.fecha_aceptacion) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) <= mesNum && f.getFullYear() === anio) {
              lista.push({
                tipo: "Asistencia",
                referencia: asistencia.numero_ate,
                titulo: asistencia.titulo_ate || "",
                proveedor: cot.proveedor,
                cuenta: asistencia.numero_cuenta || "",
                valor: Number(cot.valor) || 0,
                valor_factura: cot.valor_factura ? Number(cot.valor_factura) : null,
                fecha: cot.fecha_aceptacion,
              });
            }
          }
        });
      }
    });

    setGastos(lista);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [buque, cuenta, mesNum, anio]);

  const exportarExcel = () => {
    const datos = gastos.map((g) => ({
      Tipo: g.tipo,
      Proveedor: g.proveedor,
      "Nº Referencia": g.referencia,
      Título: g.titulo,
      "Valor Cotización (€)": g.valor,
      "Valor Factura (€)": g.valor_factura || "-",
      "Cuenta contable": g.cuenta,
      Fecha: g.fecha ? new Date(g.fecha).toLocaleDateString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Informe_${buqueNombre || buque}_${cuenta}_ACUMULADO_hasta_${mesNum}-${anio}.xlsx`);
  };

  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion("asc");
    }
  };

  const gastosFiltrados = gastos.filter((g) =>
    (g.proveedor || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (g.referencia || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (g.titulo || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const gastosOrdenados = [...gastosFiltrados].sort((a, b) => {
    const valA = a[ordenCampo];
    const valB = b[ordenCampo];
    if (typeof valA === "number" && typeof valB === "number") {
      return ordenDireccion === "asc" ? valA - valB : valB - valA;
    }
    return ordenDireccion === "asc"
      ? (valA || "").toString().localeCompare((valB || "").toString())
      : (valB || "").toString().localeCompare((valA || "").toString());
  });

  const sumaProvisiones = gastosOrdenados
    .filter(g => !g.valor_factura)
    .reduce((a, b) => a + (Number(b.valor) || 0), 0);

  const sumaFacturas = gastosOrdenados
    .filter(g => g.valor_factura)
    .reduce((a, b) => a + (Number(b.valor_factura) || 0), 0);

  const sumaTotal = sumaProvisiones + sumaFacturas;

  const sumaAjustes = ajustes.reduce((acc, item) => acc + (item.valor_factura || 0), 0);

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        📑 Informe Detallado (Acumulado) - {buqueNombre || buque} / {cuenta} / hasta {mesesCorto[mesNum - 1]}-{anio}
      </Heading>

      <Flex mb={4} gap={3} align="center" wrap="wrap">
        <Button onClick={onBack} colorScheme="blue">Volver al resumen</Button>
        <Button colorScheme="green" onClick={exportarExcel} leftIcon={<DownloadIcon />}>
          Exportar Excel
        </Button>
        <Input
          placeholder="Buscar por proveedor, referencia o título"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          maxW="300px"
        />
      </Flex>

      {loading ? (
        <Spinner size="xl" />
      ) : (
        <Box overflowX="auto">
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th onClick={() => cambiarOrden("tipo")} cursor="pointer">Tipo</Th>
                <Th onClick={() => cambiarOrden("proveedor")} cursor="pointer">Proveedor</Th>
                <Th onClick={() => cambiarOrden("referencia")} cursor="pointer">Referencia</Th>
                <Th onClick={() => cambiarOrden("titulo")} cursor="pointer">Título</Th>
                <Th isNumeric onClick={() => cambiarOrden("valor")} cursor="pointer">Valor Cotización (€)</Th>
                <Th isNumeric onClick={() => cambiarOrden("valor_factura")} cursor="pointer">Valor Factura (€)</Th>
                <Th>Cuenta contable</Th>
                <Th onClick={() => cambiarOrden("fecha")} cursor="pointer">Fecha</Th>
              </Tr>
            </Thead>
            <Tbody>
              {gastosOrdenados.map((g, index) => (
                <Tr key={`${g.referencia}-${index}`}>
                  <Td>{g.tipo}</Td>
                  <Td>{g.proveedor}</Td>
                  <Td>{g.referencia}</Td>
                  <Td>{g.titulo}</Td>
                  <Td isNumeric>
                    {g.valor_factura
                      ? "-"
                      : Number(g.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </Td>
                  <Td isNumeric>
                    {g.valor_factura
                      ? Number(g.valor_factura).toLocaleString("es-ES", { style: "currency", currency: "EUR" })
                      : "-"}
                  </Td>
                  <Td>
                    <Select value={g.cuenta} size="sm" isDisabled>
                      {cuentas.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Td>
                  <Td>{g.fecha ? new Date(g.fecha).toLocaleDateString() : ""}</Td>
                </Tr>
              ))}

              <Tr bg="gray.50">
                <Td colSpan={4} textAlign="right" fontWeight="bold">Total Provisiones</Td>
                <Td isNumeric fontWeight="bold">
                  {sumaProvisiones.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </Td>
                <Td colSpan={3} />
              </Tr>

              <Tr bg="gray.50">
                <Td colSpan={4} textAlign="right" fontWeight="bold">Total Facturas</Td>
                <Td isNumeric fontWeight="bold">
                  {sumaFacturas.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </Td>
                <Td colSpan={3} />
              </Tr>

              <Tr bg="gray.50">
                <Td colSpan={4} textAlign="right" fontWeight="bold">Ajustes manuales</Td>
                <Td isNumeric fontWeight="bold">
                  {sumaAjustes.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </Td>
                <Td colSpan={3} />
              </Tr>

              <Tr bg="blue.100">
                <Td colSpan={4} textAlign="right" fontWeight="bold">SUMATORIA FINAL</Td>
                <Td isNumeric fontWeight="bold" color="blue.800">
                  {(sumaProvisiones + sumaFacturas + sumaAjustes).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </Td>
                <Td colSpan={3} />
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default InformeCuentasDetalles;
