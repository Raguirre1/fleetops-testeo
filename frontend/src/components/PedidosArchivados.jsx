// PedidosArchivados.jsx
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
  Flex
} from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const PedidosArchivados = ({ onVolver, onVerDetalle }) => {
  const [pedidos, setPedidos] = useState([]);
  const [estadoFactura, setEstadoFactura] = useState({});
  const toast = useToast();

  const cargarArchivados = async () => {
    const { data, error } = await supabase
      .from("solicitudes_compra")
      .select("*")
      .eq("archivado", true);

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
  }, []);

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">📦 Pedidos Archivados</Heading>
        <Button onClick={onVolver} colorScheme="gray" size="sm">
          Volver a pedidos activos
        </Button>
      </Flex>

      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Nº Pedido</Th>
            <Th>Título</Th>
            <Th>Buque</Th>
            <Th>Usuario</Th>
            <Th>Estado</Th>
            <Th>Factura</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pedidos.map((p) => (
            <Tr key={p.numero_pedido}>
              <Td fontWeight="bold">{p.numero_pedido}</Td>
              <Td>{p.titulo_pedido}</Td>
              <Td>{p.buque}</Td>
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
    </Box>
  );
};

export default PedidosArchivados;
