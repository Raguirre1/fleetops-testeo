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
  const toast = useToast();

  // --- Cargar gastos pedidos y asistencias ---
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
      if (
        pedido.buque_id === buque &&
        pedido.numero_cuenta === cuenta
      ) {
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
      if (
        asistencia.buque_id === buque &&
        asistencia.numero_cuenta === cuenta
      ) {
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

  // --- Cargar gastos fijos y planificados ---
  const cargarPresupuestoFijo = async () => {
    const mesStr = mesesDB[mesNum - 1];

    // Traer Fijos y Planificados de ambas tablas usando SOLO campo tipo (nuevo modelo)
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

    // Unifica resultados y separa por tipo
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

  // --- Exportar a Excel ---
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

    // Añadir los fijos como fila extra
    gastosFijos.forEach((fijo) => {
      datos.push({
        Tipo: "Gasto Fijo",
        Proveedor: "-",
        "Nº Referencia": "-",
        Título: fijo.nombre || "",
        "Valor (€)": fijo.valor,
        "Cuenta contable": fijo.cuenta || "",
        Fecha: "-",
      });
    });

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Gastos_${buqueNombre || buque}_${cuenta}_${mesNum}-${anio}.xlsx`);
  };

  // --- Cambiar orden ---
  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion("asc");
    }
  };

  // --- Cambiar cuenta contable ---
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

  // --- Búsqueda y orden ---
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

  // --- Suma total gastos + fijos ---
  const sumaGastos = gastosOrdenados.reduce((a, b) => a + (Number(b.valor) || 0), 0);
  const sumaFijos = gastosFijos.reduce((a, b) => a + (Number(b.valor) || 0), 0);

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        📋 Detalle de gastos - {buqueNombre || buque} / {cuenta} / {mesesCorto[mesNum-1]}-{anio}
      </Heading>

      <Flex mb={4} gap={3} align="center">
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
                {gastosFijos.length > 0 && gastosFijos.map((fijo, idx) => (
                  <Tr key={`fijo-${idx}`} bg="blue.50">
                    <Td fontWeight="bold" colSpan={3}>Gasto Fijo Presupuestado</Td>
                    <Td>{fijo.nombre}</Td>
                    <Td isNumeric fontWeight="bold" color="blue.700">
                      {Number(fijo.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </Td>
                    <Td colSpan={2} />
                  </Tr>
                ))}
                {(gastosOrdenados.length > 0 || gastosFijos.length > 0) && (
                  <Tr>
                    <Td colSpan={4} fontWeight="bold" textAlign="right">Total (incluye Gastos Fijos)</Td>
                    <Td isNumeric fontWeight="bold">
                      {(sumaGastos + sumaFijos).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </Td>
                    <Td colSpan={2} />
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
          {/* Cuadro de avisos para gastos planificados */}
          {gastosPlanificados.length > 0 && (
            <Alert status="info" mt={6} borderRadius="md" variant="left-accent">
              <AlertIcon />
              <Box>
                <AlertTitle>Gastos Planificados para este mes</AlertTitle>
                <AlertDescription>
                  {gastosPlanificados.map((plan, i) => (
                    <Box key={i}>
                      <b>{plan.nombre}</b>:&nbsp;
                      {Number(plan.valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </Box>
                  ))}
                  <Box fontStyle="italic" mt={2} color="gray.600">
                    (No restan en los totales hasta que se ejecuten como pedido o asistencia)
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
