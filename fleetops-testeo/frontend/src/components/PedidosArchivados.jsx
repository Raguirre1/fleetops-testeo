import React, { useState, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Button,
  useToast,
  Tooltip,
  Flex,
  Input,
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

/**
 * Ahora este componente espera recibir por props:
 * - buqueId: el ID del buque actualmente seleccionado.
 * Si usas contexto, puedes sacar buqueId de ahí.
 */
const PedidosArchivados = ({ buqueId, onVolver, onVerDetalle }) => {
  const [pedidos, setPedidos] = useState([]);
  const [estadoFactura, setEstadoFactura] = useState({});
  const [filtro, setFiltro] = useState("");
  const [ordenCampo, setOrdenCampo] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);
  const toast = useToast();

  const cargarArchivados = async () => {
    if (!buqueId) {
      setPedidos([]); // Si no hay buque seleccionado, no mostramos nada.
      return;
    }
    const { data, error } = await supabase
      .from("solicitudes_compra")
      .select("*")
      .eq("archivado", true)
      .eq("buque_id", buqueId); // Filtra por buque seleccionado

    if (!error) setPedidos(data);
    else toast({ title: "Error al cargar pedidos archivados", status: "error", duration: 3000 });
  };

  const cargarEstadoFacturas = async () => {
    const { data, error } = await supabase
      .from("cotizaciones_proveedor")
      .select("numero_pedido, estado, valor_factura");

    if (!error && data) {
      const mapa = {};
      data.forEach((c) => {
        if (c.estado === "aceptada" && (!c.valor_factura || Number(c.valor_factura) === 0)) {
          mapa[c.numero_pedido] = true; // pendiente de factura
        }
      });
      setEstadoFactura(mapa);
    }
  };

  const desarchivarPedido = async (numeroPedido) => {
    const { error } = await supabase
      .from("solicitudes_compra")
      .update({ archivado: false })
      .eq("numero_pedido", numeroPedido);

    if (!error) {
      toast({ title: "Pedido desarchivado", status: "success", duration: 3000 });
      cargarArchivados();
    } else {
      toast({ title: "Error al desarchivar", status: "error", duration: 3000 });
    }
  };

  useEffect(() => {
    cargarArchivados();
    cargarEstadoFacturas();
    // eslint-disable-next-line
  }, [buqueId]); // Se recarga al cambiar el buque seleccionado

  // Filtro de búsqueda
  const pedidosFiltrados = pedidos.filter((p) => {
    const texto = filtro.toLowerCase();
    return (
      p.numero_pedido?.toLowerCase().includes(texto) ||
      p.titulo_pedido?.toLowerCase().includes(texto) ||
      p.usuario?.toLowerCase().includes(texto) ||
      (p.estado || "").toLowerCase().includes(texto)
    );
  });

  // Ordenar al hacer click en la cabecera
  const ordenarPorCampo = (campo) => {
    const asc = ordenCampo === campo ? !ordenAscendente : true;
    const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
      let valorA = a[campo] || "";
      let valorB = b[campo] || "";
      return asc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
    });
    setOrdenCampo(campo);
    setOrdenAscendente(asc);
    setPedidos(pedidosOrdenados);
  };

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">📦 Pedidos Archivados</Heading>
        <Button onClick={onVolver} colorScheme="gray" size="sm">
          Volver a pedidos activos
        </Button>
      </Flex>
      <Flex mb={3} gap={2} align="center">
        <Input
          placeholder="Buscar pedido, título, usuario o estado"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          size="sm"
          maxW="300px"
        />
      </Flex>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("numero_pedido")}>
              Nº Pedido {ordenCampo === "numero_pedido" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("titulo_pedido")}>
              Título {ordenCampo === "titulo_pedido" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("usuario")}>
              Usuario {ordenCampo === "usuario" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th cursor="pointer" onClick={() => ordenarPorCampo("estado")}>
              Estado {ordenCampo === "estado" ? (ordenAscendente ? "⬆️" : "⬇️") : ""}
            </Th>
            <Th>Factura</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pedidosFiltrados.map((p) => (
            <Tr key={p.numero_pedido}>
              <Td fontWeight="bold">{p.numero_pedido}</Td>
              <Td>{p.titulo_pedido}</Td>
              <Td>{p.usuario}</Td>
              <Td>{p.estado || "-"}</Td>
              <Td>
                {estadoFactura[p.numero_pedido] ? (
                  <Tooltip label="Falta cargar la factura final" hasArrow>
                    <span>🟡</span>
                  </Tooltip>
                ) : (
                  "✅"
                )}
              </Td>
              <Td>
                <Flex gap={1}>
                  <Tooltip label="Desarchivar pedido" hasArrow>
                    <Button size="xs" onClick={() => desarchivarPedido(p.numero_pedido)}>
                      🔁 Desarchivar
                    </Button>
                  </Tooltip>
                  <Tooltip label="Ver detalles del pedido" hasArrow>
                    <Button size="xs" onClick={() => onVerDetalle(p)}>
                      🔍 Ver
                    </Button>
                  </Tooltip>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      {(!pedidos || pedidos.length === 0) && (
        <Box textAlign="center" mt={6} color="gray.500">
          No hay pedidos archivados para este buque.
        </Box>
      )}
    </Box>
  );
};

export default PedidosArchivados;
