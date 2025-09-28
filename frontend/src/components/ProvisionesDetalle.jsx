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
  Flex
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const cuentas = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite", "Inversiones",
];

// Recibe también buqueNombre si quieres mostrarlo
const ProvisionesDetalle = ({ buque, buqueNombre, cuenta, onBack }) => {
  const [provisiones, setProvisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenCampo, setOrdenCampo] = useState("valor");
  const [ordenDireccion, setOrdenDireccion] = useState("desc");
  const [busqueda, setBusqueda] = useState("");
  const toast = useToast();

  const cargarProvisiones = async () => {
    setLoading(true);

    // Pedidos
    const { data: pedidos } = await supabase
      .from("solicitudes_compra")
      .select("numero_pedido, buque_id, numero_cuenta, sobrevenido")
      .eq("buque_id", buque)
      .in("estado", ["Pedido Activo", "Recibido"]);

    const { data: cotizaciones } = await supabase
      .from("cotizaciones_proveedor")
      .select("numero_pedido, proveedor, valor, valor_factura, estado, fecha_aceptacion")
      .eq("estado", "aceptada");

    const { data: asistencias } = await supabase
      .from("solicitudes_asistencia")
      .select("numero_ate, buque_id, numero_cuenta, sobrevenido")
      .eq("buque_id", buque)

    const { data: cotizacionesAsist } = await supabase
      .from("asistencias_proveedor")
      .select("numero_asistencia, proveedor, valor, valor_factura, estado, fecha_aceptacion")
      .eq("estado", "aceptada");

    const lista = [];
    const hoy = new Date();

    pedidos.forEach((pedido) => {
      const asociadas = cotizaciones.filter(
        (c) =>
          c.numero_pedido === pedido.numero_pedido &&
          (!c.valor_factura || Number(c.valor_factura) === 0)
      );
      asociadas.forEach((cot) => {
        if (pedido.numero_cuenta === cuenta) {
          lista.push({
            tipo: "Pedido",
            numero_pedido: pedido.numero_pedido,
            proveedor: cot.proveedor,
            cuenta: pedido.numero_cuenta || "",
            valor: Number(cot.valor) || 0,
            fecha: cot.fecha_aceptacion || cot.created_at, 
            sobrevenido: pedido.sobrevenido || false 
          });
        }
      });
    });

    asistencias.forEach((asistencia) => {
      const asociadas = cotizacionesAsist.filter(
        (c) =>
          c.numero_asistencia === asistencia.numero_ate &&
          (!c.valor_factura || Number(c.valor_factura) === 0)
      );
      asociadas.forEach((cot) => {
        if (asistencia.numero_cuenta === cuenta) {
          lista.push({
            tipo: "Asistencia",
            numero_pedido: asistencia.numero_ate,
            proveedor: cot.proveedor,
            cuenta: asistencia.numero_cuenta || "",
            valor: Number(cot.valor) || 0,
            fecha: cot.fecha_aceptacion || cot.created_at, 
            sobrevenido: asistencia.sobrevenido || false
          });
        }
      });
    });

    setProvisiones(lista);
    setLoading(false);
  };

  useEffect(() => {
    cargarProvisiones();
  }, [buque, cuenta]);

  const exportarExcel = () => {
    const datos = provisionesFiltradas.map((p) => ({
      Tipo: p.tipo,
      Proveedor: p.proveedor,
      "Nº Referencia": p.numero_pedido,
      "Valor (€)": p.valor,
      "Cuenta contable": p.cuenta,
      Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Provisiones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `Provisiones_${buqueNombre || buque}_${cuenta}.xlsx`);
  };

  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === "asc" ? "desc" : "asc");
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion("asc");
    }
  };

  const handleCuentaChange = async (numero, tipo, nuevaCuenta) => {
    setProvisiones((prev) =>
      prev.map((item) =>
        item.numero_pedido === numero && item.tipo === tipo
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
      .eq(campoId, numero);

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

  const provisionesFiltradas = provisiones.filter((p) =>
    p.proveedor.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.numero_pedido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const provisionesOrdenadas = [...provisionesFiltradas].sort((a, b) => {
    const valA = a[ordenCampo];
    const valB = b[ordenCampo];
    if (typeof valA === "number" && typeof valB === "number") {
      return ordenDireccion === "asc" ? valA - valB : valB - valA;
    }
    return ordenDireccion === "asc"
      ? valA.toString().localeCompare(valB.toString())
      : valB.toString().localeCompare(valA.toString());
  });

  const getColor = (fecha) => {
    if (!fecha) return "black";
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    if (fechaObj.getFullYear() < ahora.getFullYear()) return "red";
    if (fechaObj.getMonth() < ahora.getMonth() && fechaObj.getFullYear() === ahora.getFullYear()) return "orange";
    return "black";
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={4}>
        📋 Detalle de provisiones - {buqueNombre || buque} / {cuenta}
      </Heading>

      <Flex mb={4} gap={3} align="center">
        <Button onClick={onBack} colorScheme="blue">Volver al resumen</Button>
        <Button colorScheme="green" onClick={exportarExcel} leftIcon={<DownloadIcon />}>
          Exportar Excel
        </Button>
        <Input
          placeholder="Buscar por proveedor o Nº referencia"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          maxW="300px"
        />
      </Flex>

      {loading ? (
        <Spinner size="xl" />
      ) : provisionesOrdenadas.length === 0 ? (
        <Box>No hay provisiones activas que coincidan con la búsqueda.</Box>
      ) : (
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
                <Th onClick={() => cambiarOrden("numero_pedido")} cursor="pointer">
                  Nº Referencia {ordenCampo === "numero_pedido" ? (ordenDireccion === "asc" ? "🔼" : "🔽") : ""}
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
              {provisionesOrdenadas.map((prov, index) => (
                <Tr key={`${prov.numero_pedido}-${index}`}>
                  <Td>{prov.tipo}</Td>
                  <Td>{prov.proveedor}</Td>
                  <Td color={getColor(prov.fecha)}>
                    {prov.numero_pedido} {prov.sobrevenido && <span title="Sobrevenido">🚨</span>}
                  </Td>
                  <Td isNumeric>{Number(prov.valor).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}</Td>
                  <Td>
                    <Select
                      value={prov.cuenta}
                      onChange={(e) => handleCuentaChange(prov.numero_pedido, prov.tipo, e.target.value)}
                      size="sm"
                    >
                      {cuentas.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Td>
                  <Td>{prov.fecha ? new Date(prov.fecha).toLocaleDateString() : ""}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default ProvisionesDetalle;
