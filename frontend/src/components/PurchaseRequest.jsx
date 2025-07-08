import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Heading,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Tooltip,
} from "@chakra-ui/react";
import { FiSave } from "react-icons/fi";
import { FaCog } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import PurchaseDetail from "./PurchaseDetail";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import PedidosArchivados from "./PedidosArchivados";
import { useFlota } from "./FlotaContext"; // 🔄 MODIFICADO
import { obtenerNombreDesdeEmail } from "./EmailUsuarios";

const PurchaseRequest = ({ usuario, onBack }) => {
  const { buques } = useFlota(); // 🔄 MODIFICADO
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [estadosPago, setEstadosPago] = useState({});
  const [estadoFactura, setEstadoFactura] = useState({});
  const [formulario, setFormulario] = useState({
    numeroPedido: "",
    tituloPedido: "",
    urgencia: "",
    fechaPedido: "",
    fechaEntrega: "",
    numeroCuenta: "",
  });
  const [editarId, setEditarId] = useState(null);
  const [detallePedido, setDetallePedido] = useState(null);
  const [ordenCampo, setOrdenCampo] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const toast = useToast();

  const cargarSolicitudes = async () => {
    if (!buqueSeleccionado) return;
    const { data, error } = await supabase
      .from("solicitudes_compra")
      .select("*, buques(nombre)")
      .eq("buque_id", buqueSeleccionado)
      .eq("archivado", false);
    if (!error) setSolicitudes(data);
  };


  const cargarPagos = async () => {
    const { data, error } = await supabase
      .from("pagos")
      .select("numero_pedido, requiere_pago_anticipado, gestionado, factura_no_euro");

    if (!error && data) {
      const mapa = {};
      data.forEach((p) => {
        let estado = "-";
        if (p.requiere_pago_anticipado) {
          estado = p.gestionado
            ? "✅ Pago realizado"
            : "🟡 Pendiente de pago anticipado";
        }
        if (p.factura_no_euro) {
          estado += "\n💱 Factura distinta a €";
        }
        mapa[p.numero_pedido] = estado;
      });
      setEstadosPago(mapa);
    }
  };

  const cargarEstadoFacturas = async () => {
    const { data, error } = await supabase
      .from("cotizaciones_proveedor")
      .select("numero_pedido, estado, valor_factura");
    if (!error && data) {
      const mapa = {};
      data.forEach((c) => {
        if (c.estado === "aceptada" && (!c.valor_factura || Number(c.valor_factura) === 0)) {
          mapa[c.numero_pedido] = true;
        }
      });
      setEstadoFactura(mapa);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
    cargarPagos();
    cargarEstadoFacturas();
  }, [buqueSeleccionado]);

  const solicitudesFiltradas = solicitudes.filter((s) => {
    const texto = filtro.toLowerCase();
    const tieneFactura = !estadoFactura[s.numero_pedido];
    const sinFactura = estadoFactura[s.numero_pedido];
    if (texto === "sin factura") return sinFactura;
    if (texto === "con factura") return tieneFactura;
    return (
      s.numero_pedido?.toLowerCase().includes(texto) ||
      s.titulo_pedido?.toLowerCase().includes(texto)
    );
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🚨 Validación: bloquear si contiene "/"
    const numero = formulario.numeroPedido;
    if (numero.includes("/")) {
      toast({
        title: "Nº de pedido inválido",
        description: "El número de pedido no puede contener el carácter / (barra).",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    const datosPedido = {
      titulo_pedido: formulario.tituloPedido,
      urgencia: formulario.urgencia,
      fecha_pedido: formulario.fechaPedido || null,
      fecha_entrega: formulario.fechaEntrega || null,
      numero_cuenta: formulario.numeroCuenta,
      buque_id: buqueSeleccionado,
      usuario: obtenerNombreDesdeEmail(usuario?.email),
    };
    let error;
    if (editarId) {
      const { error: updateError } = await supabase
        .from("solicitudes_compra")
        .update(datosPedido)
        .eq("numero_pedido", editarId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("solicitudes_compra")
        .insert([{ ...datosPedido, numero_pedido: formulario.numeroPedido, archivado: false }]);
      error = insertError;
    }
    if (!error) {
      setFormulario({
        numeroPedido: "",
        tituloPedido: "",
        urgencia: "",
        fechaPedido: "",
        fechaEntrega: "",
        numeroCuenta: "",
      });
      setEditarId(null);
      await cargarSolicitudes();
      toast({ title: "Guardado", status: "success", duration: 2000 });
    } else {
      toast({ title: "Error al guardar", description: error.message, status: "error", duration: 3000 });
    }
  };

  const archivarPedido = async (numeroPedido) => {
    const { error } = await supabase
      .from("solicitudes_compra")
      .update({ archivado: true })
      .eq("numero_pedido", numeroPedido);
    if (!error) {
      toast({ title: "Pedido archivado", status: "info", duration: 3000 });
      cargarSolicitudes();
    }
  };

  const exportarAExcel = () => {
    const datos = solicitudes.map((s) => ({
      "Nº Pedido": s.numero_pedido,
      "Título": s.titulo_pedido,
      "Urgencia": s.urgencia,
      "Fecha": s.fecha_pedido?.split("T")[0] || "-",
      "Fecha Límite": s.fecha_entrega?.split("T")[0] || "-",
      "Solicitante": s.usuario,
      "Estado": s.estado === "Pedido Activo" ? "Pedido Activo ✅" : s.estado || "Solicitud de Compra",
      "Fecha Estado": s.fecha_estado?.split("T")[0] || "-",
      "Cuenta": s.numero_cuenta || "-",
      "Estado de Pago": estadosPago[s.numero_pedido] || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitudes");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Solicitudes_${buqueSeleccionado}.xlsx`);
  };

  const ordenarPorCampo = (campo) => {
    const asc = ordenCampo === campo ? !ordenAscendente : true;
    const solicitudesOrdenadas = [...solicitudes].sort((a, b) => {
      let valorA, valorB;
      if (campo === "estado_pago") {
        valorA = estadosPago[a.numero_pedido] || "";
        valorB = estadosPago[b.numero_pedido] || "";
      } else if (campo === "estado_factura") {
        valorA = estadoFactura[a.numero_pedido] ? "🟡" : "✅";
        valorB = estadoFactura[b.numero_pedido] ? "🟡" : "✅";
      } else {
        valorA = a[campo] || "";
        valorB = b[campo] || "";
      }
      return asc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
    });
    setOrdenCampo(campo);
    setOrdenAscendente(asc);
    setSolicitudes(solicitudesOrdenadas);
  };

  const handleEditar = (s) => {
    setFormulario({
      numeroPedido: s.numero_pedido,
      tituloPedido: s.titulo_pedido,
      urgencia: s.urgencia,
      fechaPedido: s.fecha_pedido?.split("T")[0] || "",
      fechaEntrega: s.fecha_entrega?.split("T")[0] || "",
      numeroCuenta: s.numero_cuenta,
    });
    setBuqueSeleccionado(s.buque_id); // <-- Añade esto
    setEditarId(s.numero_pedido);
  };

  const handleEliminar = async (numeroPedido) => {
    const { error } = await supabase.from("solicitudes_compra").delete().eq("numero_pedido", numeroPedido);
    if (!error) await cargarSolicitudes();
  };

  const handleVerDetalle = (s) => {
    setDetallePedido({
      numeroPedido: s.numero_pedido,
      tituloPedido: s.titulo_pedido,
      urgencia: s.urgencia,
      fechaPedido: s.fecha_pedido?.split("T")[0] || "—",
      fechaEntrega: s.fecha_entrega?.split("T")[0] || "—",
      numeroCuenta: s.numero_cuenta || "—",
      buque_id: s.buque_id,
      usuario: s.usuario,
      estado: s.estado || "Solicitud de Compra",
    });
  };

  const handleVolverDetalle = async () => {
    await cargarSolicitudes();
    await cargarPagos();
    await cargarEstadoFacturas();
    setDetallePedido(null);
  };

  const volverDeArchivados = async () => {
    setMostrarArchivados(false);
    await cargarSolicitudes();
  };

  const actualizarEstado = async (numeroPedido, nuevoEstado) => {
    const fechaHoy = new Date().toISOString();
    const { error } = await supabase
      .from("solicitudes_compra")
      .update({ estado: nuevoEstado, fecha_estado: fechaHoy })
      .eq("numero_pedido", numeroPedido);
    if (!error) await cargarSolicitudes();
  };

  const handleCambiarBuque = () => {
    setBuqueSeleccionado("");
    setFormulario({
      numeroPedido: "",
      tituloPedido: "",
      urgencia: "",
      fechaPedido: "",
      fechaEntrega: "",
      numeroCuenta: "",
    });
    setEditarId(null);
  };

  if (detallePedido) {
    return <PurchaseDetail pedido={detallePedido} volver={handleVolverDetalle} />;
  }

  if (mostrarArchivados) {
    return (
      <PedidosArchivados
        buqueId={buqueSeleccionado}           
        onVolver={volverDeArchivados}
        onVerDetalle={handleVerDetalle}
      />
    );
  }


  if (!buqueSeleccionado) {
    return (
      <Box p={6}>
        <Heading size="md" mb={3}>Selecciona un buque</Heading>
        <Select value={buqueSeleccionado} onChange={(e) => setBuqueSeleccionado(e.target.value)} mb={4}>
          <option value="">-- Seleccionar --</option>
          {buques.map((buque) => (
            <option key={buque.id} value={buque.id}>{buque.nombre}</option>
          ))}
        </Select>

        <Button onClick={onBack} colorScheme="gray">Volver atrás</Button>
      </Box>
    );
  }
  const nombreBuqueSeleccionado = buques.find((b) => b.id === buqueSeleccionado)?.nombre || buqueSeleccionado;

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">Solicitud de Compra - {nombreBuqueSeleccionado}</Heading>
        <Button size="sm" onClick={handleCambiarBuque} colorScheme="gray">Cambiar buque</Button>
      </Flex>

      <Box as="form" onSubmit={handleSubmit} mb={6} display="grid" gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
        <Input name="numeroPedido" value={formulario.numeroPedido} onChange={handleChange} placeholder="Nº Pedido" required={!editarId} isDisabled={!!editarId} />
        <Input name="tituloPedido" value={formulario.tituloPedido} onChange={handleChange} placeholder="Título" required />
        <Input name="urgencia" value={formulario.urgencia} onChange={handleChange} placeholder="Urgencia" />
        <Input type="date" name="fechaPedido" value={formulario.fechaPedido} onChange={handleChange} />
        <Input type="date" name="fechaEntrega" value={formulario.fechaEntrega} onChange={handleChange} />
        <Input name="numeroCuenta" value={formulario.numeroCuenta} onChange={handleChange} placeholder="Cuenta contable" />
        <Button type="submit" colorScheme="green" leftIcon={<FiSave />} gridColumn={{ base: "span 1", md: "span 3" }}>Guardar</Button>
      </Box>

      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md">📋 Solicitudes registradas</Heading>
        <Flex gap={2} align="center" flexWrap="nowrap">
          <Input
            placeholder="Buscar pedido o título"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            size="sm"
            maxW="200px"
          />
          <Button
            onClick={exportarAExcel}
            colorScheme="blue"
            size="sm"
            leftIcon={<span>📥</span>}
            whiteSpace="nowrap"
          >
            Exportar a Excel
          </Button>
          <Button
            onClick={() => setMostrarArchivados(true)}
            colorScheme="purple"
            size="sm"
            rightIcon={<span>📦</span>}
            whiteSpace="nowrap"
          >
            Ver pedidos archivados
          </Button>
        </Flex>
      </Flex>

      {/* CORREGIDO: Aquí comienza el Box que envuelve la tabla */}
      <Box maxHeight="500px" overflowY="auto" border="1px solid #E2E8F0" borderRadius="md">
        <Table variant="striped" size="sm">
          <Thead position="sticky" top={0} zIndex={1} bg="gray.100">
            <Tr>
              {[
                ["Nº Pedido", "numero_pedido"],
                ["Título", "titulo_pedido"],
                ["Urgencia", "urgencia"],
                ["Fecha", "fecha_pedido"],
                ["Fecha Límite", "fecha_entrega"],
                ["Solicitante", "usuario"],
                ["Estado", "estado"],
                ["Fecha estado", "fecha_estado"],
                ["Cuenta", "numero_cuenta"],
                ["Estado de Pago", "estado_pago"],
                ["Factura", "estado_factura"],
              ].map(([label, campo]) => (
                <Th key={campo} onClick={() => ordenarPorCampo(campo)} cursor="pointer">
                  {label} {ordenCampo === campo ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
                </Th>
              ))}
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {solicitudesFiltradas.map((s, idx) => (
              <Tr key={idx}>
                <Td fontWeight="bold">{s.numero_pedido}</Td>
                <Td>{s.titulo_pedido}</Td>
                <Td>{s.urgencia}</Td>
                <Td>{s.fecha_pedido?.split("T")[0]}</Td>
                <Td>{s.fecha_entrega?.split("T")[0] || "-"}</Td>
                <Td>{s.usuario}</Td>
                <Td>
                  {s.estado === "Pedido Activo" ? "Pedido Activo ✅"
                  : s.estado === "Cancelado" ? <span style={{color: "red", fontWeight: 700}}>Cancelado</span>
                  : s.estado || "Solicitud de Compra"}
                </Td>
                <Td>{s.fecha_estado?.split("T")[0] || "-"}</Td>
                <Td>{s.numero_cuenta || "-"}</Td>
                <Td>{estadosPago[s.numero_pedido] || "-"}</Td>
                <Td>
                  {estadoFactura[s.numero_pedido] ? (
                    <Tooltip label="Falta cargar la factura final" hasArrow>
                      <span>🟡</span>
                    </Tooltip>
                  ) : (
                    "✅"
                  )}
                </Td>
                <Td>
                  <Flex gap={1} justify="center">
                    <Button size="xs" onClick={() => handleEditar(s)}>📝</Button>
                    <Button size="xs" onClick={() => handleVerDetalle(s)}>👁️</Button>
                    <Button size="xs" onClick={() => handleEliminar(s.numero_pedido)}>🗑️</Button>
                    <Tooltip label="Archivar pedido" hasArrow>
                      <Button size="xs" onClick={() => archivarPedido(s.numero_pedido)}>📦</Button>
                    </Tooltip>
                    <Menu>
                      <MenuButton as={IconButton} size="xs" icon={<FaCog />} />
                      <MenuList>
                        {[
                          "Solicitud de Compra",
                          "En Consulta",
                          "Pedido Activo",
                          "Recibido",
                          "Cancelado", // <-- Añadido aquí
                        ].map((estado) => (
                          <MenuItem
                            key={estado}
                            onClick={() => actualizarEstado(s.numero_pedido, estado)}
                            color={estado === "Cancelado" ? "red.500" : "inherit"} // Rojo si es Cancelado
                          >
                            {estado}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
  }
        export default PurchaseRequest;
