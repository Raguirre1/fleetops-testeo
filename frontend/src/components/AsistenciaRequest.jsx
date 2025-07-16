import React, { useState, useEffect, useRef } from "react";
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { FiSave } from "react-icons/fi";
import { FaCog } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import AsistenciaDetail from "./AsistenciaDetail";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AsistenciaArchivadas from "./AsistenciaArchivadas";
import { useFlota } from "./FlotaContext";
import { obtenerNombreDesdeEmail } from "./EmailUsuarios";

const listarArchivosRecursivo = async (bucket, carpeta) => {
  let archivos = [];
  const { data: items, error } = await supabase.storage.from(bucket).list(carpeta, { limit: 1000 });
  if (error) return archivos;
  for (const item of items) {
    if (item.type === "file") {
      archivos.push(`${carpeta ? carpeta + "/" : ""}${item.name}`);
    } else if (item.type === "folder") {
      const subarchivos = await listarArchivosRecursivo(bucket, `${carpeta ? carpeta + "/" : ""}${item.name}`);
      archivos = archivos.concat(subarchivos);
    }
  }
  return archivos;
};

const AsistenciaRequest = ({ usuario, onBack }) => {
  const { buques } = useFlota();
  const [buqueSeleccionado, setBuqueSeleccionado] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);
  const [formulario, setFormulario] = useState({
    numeroAsistencia: "",
    tituloAsistencia: "",
    urgencia: "",
    fechaSolicitud: "",
    numeroCuenta: "",
  });
  const [editarId, setEditarId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [estadosPago, setEstadosPago] = useState({});
  const [estadoFactura, setEstadoFactura] = useState({});
  const [ordenCampo, setOrdenCampo] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const [buquesDic, setBuquesDic] = useState({});
  const toast = useToast();

  // 🚩 PARA ALERT DIALOG
  const [asistenciaAEliminar, setAsistenciaAEliminar] = useState(null);
  const cancelRef = useRef();

  const cargarSolicitudes = async () => {
    if (!buqueSeleccionado) return;
    const { data, error } = await supabase
      .from("solicitudes_asistencia")
      .select("*")
      .eq("buque_id", buqueSeleccionado)
      .eq("archivado", false);
    if (!error) setSolicitudes(data);
  };

  const cargarPagos = async () => {
    const { data, error } = await supabase
      .from("pagos_asistencia")
      .select("numero_ate, requiere_pago_anticipado, gestionado, factura_no_euro");
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
        mapa[p.numero_ate] = estado;
      });
      setEstadosPago(mapa);
    }
  };

  const cargarEstadoFacturas = async () => {
    const { data, error } = await supabase
      .from("asistencias_proveedor")
      .select("numero_asistencia, estado, valor_factura");

    if (!error && data) {
      const mapa = {};
      data.forEach((a) => {
        const valor = parseFloat(a.valor_factura);
        if (
          a.estado === "aceptada" &&
          (!a.valor_factura || isNaN(valor) || valor <= 0)
        ) {
          mapa[a.numero_asistencia] = true;
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
    const tieneFactura = !estadoFactura[s.numero_ate];
    const sinFactura = estadoFactura[s.numero_ate];
    if (texto === "sin factura") return sinFactura;
    if (texto === "con factura") return tieneFactura;
    return (
      s.numero_ate?.toLowerCase().includes(texto) ||
      s.titulo_ate?.toLowerCase().includes(texto)
    );
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🚨 Validación ANTES de hacer nada más
    const numero = formulario.numeroAsistencia;
    if (numero.includes("/")) {
      toast({
        title: "Nº de asistencia inválido",
        description: "El número de asistencia no puede contener el carácter / (barra).",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    const datos = {
      numero_ate: formulario.numeroAsistencia,
      titulo_ate: formulario.tituloAsistencia,
      urgencia: formulario.urgencia,
      fecha_solicitud: formulario.fechaSolicitud || null,
      numero_cuenta: formulario.numeroCuenta,
      buque_id: buqueSeleccionado,
      usuario: obtenerNombreDesdeEmail(usuario?.email),
    };
    let error;
    if (editarId) {
      const { error: updateError } = await supabase
        .from("solicitudes_asistencia")
        .update(datos)
        .eq("numero_ate", editarId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("solicitudes_asistencia")
        .insert([datos]);
      error = insertError;
    }
    if (!error) {
      setFormulario({
        numeroAsistencia: "",
        tituloAsistencia: "",
        urgencia: "",
        fechaSolicitud: "",
        numeroCuenta: "",
      });
      setEditarId(null);
      await cargarSolicitudes();
      toast({ title: "Guardado", status: "success", duration: 2000, isClosable: true });
    } else {
      toast({ title: "Error al guardar", description: error.message, status: "error", duration: 3000 });
    }
  };

  const handleEditar = (s) => {
    setFormulario({
      numeroAsistencia: s.numero_ate,
      tituloAsistencia: s.titulo_ate,
      urgencia: s.urgencia,
      fechaSolicitud: s.fecha_solicitud?.split("T")[0] || "",
      numeroCuenta: s.numero_cuenta,
    });
    setEditarId(s.numero_ate);
  };

  const handleEliminar = async (numeroAsistencia) => {
    // 1. Elimina asistencias_proveedor asociadas
    let { error: errorAsistProv } = await supabase
      .from("asistencias_proveedor")
      .delete()
      .eq("numero_asistencia", numeroAsistencia);

    // 2. Elimina pagos asociados
    let { error: errorPagos } = await supabase
      .from("pagos_asistencia")
      .delete()
      .eq("numero_ate", numeroAsistencia);

    // 3. Elimina archivos de Supabase Storage (todas las subcarpetas y archivos)
    const bucket = "asistencias";
    const rutasAEliminar = await listarArchivosRecursivo(bucket, numeroAsistencia);

    if (rutasAEliminar.length > 0) {
      const { error: errorBorrarArchivos } = await supabase
        .storage
        .from(bucket)
        .remove(rutasAEliminar);

      if (errorBorrarArchivos) {
        toast({
          title: "Error al eliminar archivos",
          description: errorBorrarArchivos.message,
          status: "warning",
          duration: 4000,
        });
        console.error("Error borrando archivos:", errorBorrarArchivos);
      }
    }

    // 4. Elimina la solicitud principal
    let { error: errorSolicitud } = await supabase
      .from("solicitudes_asistencia")
      .delete()
      .eq("numero_ate", numeroAsistencia);

    if (
      !errorAsistProv &&
      !errorPagos &&
      !errorSolicitud
    ) {
      await cargarSolicitudes();
      toast({ title: "Asistencia eliminada", status: "success", duration: 2000 });
    } else {
      toast({
        title: "Error al eliminar",
        description:
          errorAsistProv?.message ||
          errorPagos?.message ||
          errorSolicitud?.message ||
          "Error desconocido",
        status: "error",
        duration: 3000,
      });
    }
  };


  const handleVerDetalle = (s) => {
    setDetalle({
      numeroAsistencia: s.numero_ate,
      tituloAsistencia: s.titulo_ate,
      urgencia: s.urgencia,
      fechaSolicitud: s.fecha_solicitud?.split("T")[0] || "—",
      numeroCuenta: s.numero_cuenta || "—",
      buque_id: s.buque_id || "",
      usuario: s.usuario,
      estado: s.estado || "En Consulta",
    });
  };

  const actualizarEstado = async (numeroAsistencia, nuevoEstado) => {
    const fechaHoy = new Date().toISOString();
    const { error } = await supabase
      .from("solicitudes_asistencia")
      .update({ estado: nuevoEstado, fecha_estado: fechaHoy })
      .eq("numero_ate", numeroAsistencia);
    if (!error) await cargarSolicitudes();
  };

  const archivarAsistencia = async (numeroAsistencia) => {
    const { error } = await supabase
      .from("solicitudes_asistencia")
      .update({ archivado: true })
      .eq("numero_ate", numeroAsistencia);
    if (!error) {
      toast({ title: "Asistencia archivada", status: "success", duration: 3000 });
      cargarSolicitudes();
    } else {
      toast({ title: "Error al archivar", status: "error", duration: 3000 });
    }
  };

  const exportarAExcel = () => {
    const datos = solicitudes.map((s) => ({
      "Nº Asistencia": s.numero_ate,
      "Título": s.titulo_ate,
      "Urgencia": s.urgencia,
      "Fecha": s.fecha_solicitud?.split("T")[0] || "-",
      "Solicitante": s.usuario,
      "Estado": s.estado === "Pedido Activo" ? "Pedido Activo ✅" : s.estado || "En Consulta",
      "Fecha Estado": s.fecha_estado?.split("T")[0] || "-",
      "Cuenta": s.numero_cuenta || "-",
      "Estado de Pago": estadosPago[s.numero_ate] || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Asistencias_${buqueSeleccionado}.xlsx`);
  };

  const ordenarPorCampo = (campo) => {
    const asc = ordenCampo === campo ? !ordenAscendente : true;
    const solicitudesOrdenadas = [...solicitudes].sort((a, b) => {
      let valorA, valorB;
      if (campo === "estado_pago") {
        valorA = estadosPago[a.numero_ate] || "";
        valorB = estadosPago[b.numero_ate] || "";
      } else if (campo === "estado_factura") {
        valorA = estadoFactura[a.numero_ate] ? "🟡" : "✅";
        valorB = estadoFactura[b.numero_ate] ? "🟡" : "✅";
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

  const handleVolverDetalle = async () => {
    await cargarSolicitudes();
    await cargarPagos();
    await cargarEstadoFacturas();
    setDetalle(null);
  };

  if (detalle) {
    return (
      <AsistenciaDetail
        key={detalle.numeroAsistencia}
        asistencia={detalle}
        volver={handleVolverDetalle}
      />
    );
  }

  if (mostrarArchivadas) {
    return (
      <AsistenciaArchivadas
        buqueId={buqueSeleccionado}
        onVolver={() => {
          setMostrarArchivadas(false);
          cargarSolicitudes();
        }}
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
        <Heading size="lg"> Asistencia Técnica - {nombreBuqueSeleccionado}</Heading>
        <Button size="sm" onClick={() => setBuqueSeleccionado("")} colorScheme="gray">Cambiar buque</Button>
      </Flex>

      <Box as="form" onSubmit={handleSubmit} mb={6} display="grid" gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
        <Input name="numeroAsistencia" value={formulario.numeroAsistencia} onChange={handleChange} placeholder="Nº Asistencia" required={!editarId} isDisabled={!!editarId} />
        <Input name="tituloAsistencia" value={formulario.tituloAsistencia} onChange={handleChange} placeholder="Título" required />
        <Input name="urgencia" value={formulario.urgencia} onChange={handleChange} placeholder="Urgencia" />
        <Input type="date" name="fechaSolicitud" value={formulario.fechaSolicitud} onChange={handleChange} />
        <Input name="numeroCuenta" value={formulario.numeroCuenta} onChange={handleChange} placeholder="Cuenta contable" />
        <Button type="submit" colorScheme="green" leftIcon={<FiSave />} gridColumn={{ base: "span 1", md: "span 3" }}>Guardar</Button>
      </Box>

      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md">📋 Asistencias registradas</Heading>
        <Flex gap={2} align="center" flexWrap="nowrap">
          <Input
            placeholder="Buscar asistencia o título"
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
            onClick={() => setMostrarArchivadas(true)}
            colorScheme="purple"
            size="sm"
            rightIcon={<span>📦</span>}
            whiteSpace="nowrap"
          >
            Ver asistencias archivados
          </Button>
        </Flex>
      </Flex>

      {/* SCROLL + STICKY HEADER APLICADO */}
      <Box maxHeight="500px" overflowY="auto" border="1px solid #E2E8F0" borderRadius="md">
        <Table variant="striped" size="sm">
          <Thead position="sticky" top={0} zIndex={1} bg="gray.100">
            <Tr>
              {[
                ["Nº Asistencia", "numero_ate"],
                ["Título", "titulo_ate"],
                ["Urgencia", "urgencia"],
                ["Fecha", "fecha_solicitud"],
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
                <Td fontWeight="bold">{s.numero_ate}</Td>
                <Td>{s.titulo_ate}</Td>
                <Td>{s.urgencia}</Td>
                <Td>{s.fecha_solicitud?.split("T")[0]}</Td>
                <Td>{s.usuario}</Td>
                <Td>{s.estado === "Pedido Activo" ? "Pedido Activo ✅" : s.estado || "En Consulta"}</Td>
                <Td>{s.fecha_estado?.split("T")[0] || "-"}</Td>
                <Td>{s.numero_cuenta || "-"}</Td>
                <Td>{estadosPago[s.numero_ate] || "-"}</Td>
                <Td>
                  {estadoFactura[s.numero_ate] ? (
                    <Tooltip label="Falta cargar la factura final" hasArrow>
                      <span>🟡</span>
                    </Tooltip>
                  ) : (
                    "✅"
                  )}
                </Td>
                <Td>
                  <Flex gap={1} justify="center">
                    <Tooltip label="Editar asistenica" hasArrow>
                      <Button size="xs" onClick={() => handleEditar(s)}>📝</Button>
                    </Tooltip>
                    <Tooltip label="Ver detalles" hasArrow>
                      <Button size="xs" onClick={() => handleVerDetalle(s)}>👁️</Button>
                    </Tooltip>
                    <Tooltip label="Eliminar asistencia" hasArrow>
                      <Button size="xs" onClick={() => setPedidoAEliminar(s.numero_pedido)}>🗑️</Button>
                    </Tooltip>
                    <Tooltip label="Archivar asistencia" hasArrow>
                      <Button size="xs" onClick={() => archivarPedido(s.numero_pedido)}>📦</Button>
                    </Tooltip>
                    <Menu>
                      <Tooltip label="Cambiar estado" hasArrow>
                        <MenuButton as={IconButton} size="xs" icon={<FaCog />} />
                      </Tooltip>
                      <MenuList>
                        {[
                          "Solicitud de Compra",
                          "En Consulta",
                          "Pedido Activo",
                          "Recibido",
                          "Cancelado",
                        ].map((estado) => (
                          <MenuItem
                            key={estado}
                            onClick={() => actualizarEstado(s.numero_pedido, estado)}
                            color={estado === "Cancelado" ? "red.500" : "inherit"}
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

      {/* ALERT DIALOG DE CONFIRMACIÓN */}
      <AlertDialog
        isOpen={!!asistenciaAEliminar}
        leastDestructiveRef={cancelRef}
        onClose={() => setAsistenciaAEliminar(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirmar eliminación
            </AlertDialogHeader>
            <AlertDialogBody>
              ¿Estás seguro de que deseas <b>eliminar esta asistencia</b> y <b>TODA</b> su información asociada?<br /><br />
              <span style={{ color: "red" }}>Esta acción no se puede deshacer.</span>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setAsistenciaAEliminar(null)}>
                Cancelar
              </Button>
              <Button
                colorScheme="red"
                onClick={async () => {
                  await handleEliminar(asistenciaAEliminar);
                  setAsistenciaAEliminar(null);
                }}
                ml={3}
              >
                Sí, eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default AsistenciaRequest;
