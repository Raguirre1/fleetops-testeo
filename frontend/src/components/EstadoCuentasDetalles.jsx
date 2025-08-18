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
  Select,
  Spinner,
  Button,
  Input,
  useToast,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const cuentas = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite", "Inversiones",
];

const mesesDB = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];
const mesesCorto = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const EstadoCuentasDetalles = ({ buque, buqueNombre, cuenta, mesNum, anio, onBack }) => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenCampo, setOrdenCampo] = useState("valor");
  const [ordenDireccion, setOrdenDireccion] = useState("desc");
  const [busqueda, setBusqueda] = useState("");
  const [gastosFijos, setGastosFijos] = useState([]);
  const [gastosPlanificados, setGastosPlanificados] = useState([]);
  const [restarFijosVisual, setRestarFijosVisual] = useState(false); // ajuste visual
  const toast = useToast();

  // --- Cargar gastos pedidos y asistencias (ejecutado) ---
  const cargarGastos = async () => {
    setLoading(true);

    // Pedidos
    const { data: pedidos } = await supabase
      .from("solicitudes_compra")
      .select("numero_pedido, buque_id, numero_cuenta, titulo_pedido");

    const { data: cotizaciones } = await supabase
      .from("cotizaciones_proveedor")
      .select("numero_pedido, proveedor, valor, estado, fecha_aceptacion")
      .eq("estado", "aceptada");

    // Asistencias
    const { data: asistencias } = await supabase
      .from("solicitudes_asistencia")
      .select("numero_ate, buque_id, numero_cuenta, titulo_ate");

    const { data: cotizacionesAsist } = await supabase
      .from("asistencias_proveedor")
      .select("numero_asistencia, proveedor, valor, estado, fecha_aceptacion")
      .eq("estado", "aceptada");

    // --- LISTA FINAL ---
    const lista = [];

    // Gastos de pedidos
    pedidos?.forEach((pedido) => {
      if (pedido.buque_id === buque && pedido.numero_cuenta === cuenta) {
        cotizaciones?.forEach((cot) => {
          if (
            cot.numero_pedido === pedido.numero_pedido &&
            cot.valor &&
            cot.fecha_aceptacion
          ) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
              lista.push({
                tipo: "Pedido",
                referencia: pedido.numero_pedido,
                titulo: pedido.titulo_pedido || "",
                proveedor: cot.proveedor,
                cuenta: pedido.numero_cuenta || "",
                valor: Number(cot.valor) || 0,
                fecha: cot.fecha_aceptacion,
              });
            }
          }
        });
      }
    });

    // Gastos de asistencias
    asistencias?.forEach((asistencia) => {
      if (asistencia.buque_id === buque && asistencia.numero_cuenta === cuenta) {
        cotizacionesAsist?.forEach((cot) => {
          if (
            cot.numero_asistencia === asistencia.numero_ate &&
            cot.valor &&
            cot.fecha_aceptacion
          ) {
            const f = new Date(cot.fecha_aceptacion);
            if ((f.getMonth() + 1) === mesNum && f.getFullYear() === anio) {
              lista.push({
                tipo: "Asistencia",
                referencia: asistencia.numero_ate,
                titulo: asistencia.titulo_ate || "",
                proveedor: cot.proveedor,
                cuenta: asistencia.numero_cuenta || "",
                valor: Number(cot.valor) || 0,
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

  // --- Cargar fijos y planificados (informativos) ---
  const cargarPresupuestoFijo = async () => {
    const mesStr = mesesDB[mesNum - 1];

    const [{ data: fijosPedidos }, { data: fijosAsistencias }] = await Promise.all([
      supabase.from("presupuestos_fijos_pedidos")
        .select(`id, nombre, cuenta, tipo, ${mesStr}`)
        .eq("buque_id", buque)
        .eq("anio", anio)
        .eq("cuenta", cuenta)
        .or("tipo.eq.Fijo,tipo.eq.Planificado"),
      supabase.from("presupuestos_fijos_asistencias")
        .select(`id, nombre, cuenta, tipo, ${mesStr}`)
        .eq("buque_id", buque)
        .eq("anio", anio)
        .eq("cuenta", cuenta)
        .or("tipo.eq.Fijo,tipo.eq.Planificado"),
    ]);

    const todos = [...(fijosPedidos || []), ...(fijosAsistencias || [])].map(e => ({
      ...e,
      valor: Number(e[mesStr]) || 0
    }));

    setGastosFijos(todos.filter(g => g.tipo === "Fijo" && g.valor > 0));
    setGastosPlanificados(todos.filter(g => g.tipo === "Planificado" && g.valor > 0));
  };

  useEffect(() => {
    cargarGastos();
    cargarPresupuestoFijo();
    // eslint-disable-next-line
  }, [buque, cuenta, mesNum, anio]);

  // --- Exportar a Excel (solo ejecutado) ---
  const exportarExcel = () => {
    const datos = gastosFiltrados.map((g) => ({
      Tipo: g.tipo,
      Proveedor: g.proveedor,
      "Nº Referencia": g.referencia,
      Título: g.titulo,
      "Valor (€)": g.valor,
      "Cuenta contable": g.cuenta,
      Fecha: g.fecha ? new Date(g.fecha).toLocaleDateString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Gastos_${buqueNombre || buque}_${cuenta}_${mesNum}-${anio}.xlsx`);
  };

  // --- Orden ---
  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion("asc");
    }
  };

  // --- Cambiar cuenta contable (persistente en solicitudes) ---
  const handleCuentaChange = async (referencia, tipo, nuevaCuenta) => {
    setGastos((prev) =>
      prev.map((item) =>
        item.referencia === referencia && item.tipo === tipo
          ? { ...item, cuenta: nuevaCuenta }
          : item
      )
    );

    const tabla = tipo === "Pedido" ? "solicitudes_compra" : "solicitudes_asistencia";
    const campoId = tipo === "Pedido" ? "numero_pedido" : "numero_ate";
    const campoActualizar = "numero_cuenta";

    const { error } = await supabase
      .from(tabla)
      .update({ [campoActualizar]: nuevaCuenta })
      .eq(campoId, referencia);

    if (error) {
      toast({
        title: "❌ Error al actualizar cuenta",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "✅ Cuenta actualizada",
        description: `Nueva cuenta: ${nuevaCuenta}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // --- Filtros y orden ---
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

  // --- Totales ---
  const sumaGastos = gastosOrdenados.reduce((a, b) => a + (Number(b.valor) || 0), 0); // ejecutado
  const sumaFijos = gastosFijos.reduce((a, b) => a + (Number(b.valor) || 0), 0);      // informativo
  const sumaPlanificados = gastosPlanificados.reduce((a, b) => a + (Number(b.valor) || 0), 0); // informativo
  const totalVisual = restarFijosVisual ? (sumaGastos - sumaFijos) : sumaGastos;

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        📋 Detalle de gastos - {buqueNombre || buque} / {cuenta} / {mesesCorto[mesNum-1]}-{anio}
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
        <>
          <Box overflowX="auto">
            <Table variant="striped" colorScheme="gray" size="sm">
              <Thead>
                <Tr>
                  <Th onClick={() => cambiarOrden("tipo")} cursor="pointer">
                    Tipo {ordenCampo === "tipo" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                  <Th onClick={() => cambiarOrden("proveedor")} cursor="pointer">
                    Proveedor {ordenCampo === "proveedor" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                  <Th onClick={() => cambiarOrden("referencia")} cursor="pointer">
                    Nº Referencia {ordenCampo === "referencia" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                  <Th onClick={() => cambiarOrden("titulo")} cursor="pointer">
                    Título {ordenCampo === "titulo" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                  <Th isNumeric onClick={() => cambiarOrden("valor")} cursor="pointer">
                    Valor (€) {ordenCampo === "valor" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                  <Th>
                    Cuenta contable
                  </Th>
                  <Th onClick={() => cambiarOrden("fecha")} cursor="pointer">
                    Fecha {ordenCampo === "fecha" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {gastosOrdenados.map((g, index) => (
                  <Tr key={`${g.referencia}-${index}`}>
                    <Td>{g.tipo}</Td>
                    <Td>{g.proveedor}</Td>
                    <Td>{g.referencia}</Td>
                    <Td>{g.titulo}</Td>
                    <Td isNumeric>{Number(g.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</Td>
                    <Td>
                      <Select
                        value={g.cuenta}
                        onChange={(e) => handleCuentaChange(g.referencia, g.tipo, e.target.value)}
                        size="sm"
                      >
                        {cuentas.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    </Td>
                    <Td>{g.fecha ? new Date(g.fecha).toLocaleDateString() : ""}</Td>
                  </Tr>
                ))}

                {gastosOrdenados.length > 0 && (
                  <>
                    <Tr>
                      <Td colSpan={4} fontWeight="bold" textAlign="right">
                        Total {restarFijosVisual ? " — fijos restados (visual)" : " — sin fijos ni planificados"}
                      </Td>
                      <Td isNumeric fontWeight="bold">
                        {totalVisual.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </Td>
                      <Td colSpan={2} />
                    </Tr>
                    <Tr>
                      <Td colSpan={7} fontSize="sm" color="gray.600">
                        Ejecutado : {sumaGastos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} ·{" "}
                        Fijos : {sumaFijos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} ·{" "}
                        Planificados : {sumaPlanificados.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        {restarFijosVisual && " · Ajuste aplicado: – Fijos"}
                      </Td>
                    </Tr>
                  </>
                )}
              </Tbody>
            </Table>
          </Box>

          {/* Nota Fijos (amarillo pastel) con botón de ajuste visual */}
          {gastosFijos.length > 0 && (
            <Alert status="warning" mt={6} borderRadius="md" variant="subtle" bg="yellow.50">
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>Gastos Fijos presupuestados para este mes</AlertTitle>
                <AlertDescription>
                  {gastosFijos.map((fijo, i) => (
                    <Box key={i}>
                      <b>{fijo.nombre}</b>:{" "}
                      {Number(fijo.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </Box>
                  ))}
                  <Box fontStyle="italic" mt={2} color="gray.600">
                    (Solo informativo; puedes restarlos del total de forma visual. Provisionar en caso de no ejecutar)
                  </Box>
                </AlertDescription>
              </Box>
              <Button
                ml={4}
                size="sm"
                colorScheme={restarFijosVisual ? "gray" : "yellow"}
                variant={restarFijosVisual ? "outline" : "solid"}
                onClick={() => setRestarFijosVisual((v) => !v)}
              >
                {restarFijosVisual ? "Deshacer ajuste" : "Restar fijos del total (visual)"}
              </Button>
            </Alert>
          )}

          {/* Nota Planificados (azul/info) */}
          {gastosPlanificados.length > 0 && (
            <Alert status="info" mt={6} borderRadius="md" variant="left-accent">
              <AlertIcon />
              <Box>
                <AlertTitle>Gastos Planificados para este mes</AlertTitle>
                <AlertDescription>
                  {gastosPlanificados.map((plan, i) => (
                    <Box key={i}>
                      <b>{plan.nombre}</b>:{" "}
                      {Number(plan.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </Box>
                  ))}
                  <Box fontStyle="italic" mt={2} color="gray.600">
                    (Solo informativo; no se incluyen en los totales hasta que se ejecuten como pedido o asistencia)
                  </Box>
                </AlertDescription>
              </Box>
            </Alert>
          )}
        </>
      )}
    </Box>
  );
};

export default EstadoCuentasDetalles;
