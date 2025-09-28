// src/components/InformeCuentas.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Heading, Spinner, Text, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Button
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { supabase } from "../supabaseClient";
import { useFlota } from "./FlotaContext";
import { motion, AnimatePresence } from "framer-motion";
import InformeCuentasDetalles from "./InformeCuentasDetalles";
import AjusteCuentas from "./AjusteCuentas";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const ORDEN_CUENTAS = [
  "Casco", "Máquinas", "Electricidad", "Electrónicas",
  "SEP", "Fonda", "MLC", "Aceite"
];

const InformeCuentas = () => {
  const { buques } = useFlota();
  const [selectedBuque, setSelectedBuque] = useState("");
  const [selectedMes, setSelectedMes] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(false);

  const [detalleCuenta, setDetalleCuenta] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [mesNumDetalle, setMesNumDetalle] = useState(null);

  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  useEffect(() => {
    const user = supabase.auth.getUser();
    user.then(res => {
      setUsuarioEmail(res.data?.user?.email || "");
    });

    if (selectedBuque && selectedMes && anioSeleccionado) cargarResumen();
  }, [selectedBuque, selectedMes, anioSeleccionado]);

  const cargarResumen = async () => {
    setLoading(true);

    const { data: presupuestos } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("buque_id", selectedBuque)
      .eq("anio", anioSeleccionado);

    const { data: compras } = await supabase
      .from("solicitudes_compra")
      .select("numero_pedido, buque_id, numero_cuenta");

    const { data: asistencias } = await supabase
      .from("solicitudes_asistencia")
      .select("numero_ate, buque_id, numero_cuenta");

    const { data: cotizaciones } = await supabase
      .from("cotizaciones_proveedor")
      .select("*")
      .eq("estado", "aceptada");

    const { data: cotizacionesAsis } = await supabase
      .from("asistencias_proveedor")
      .select("*")
      .eq("estado", "aceptada");

    const buqueNombreSel = buques.find(b => b.id === selectedBuque)?.nombre || "";
    const { data: ajustes } = await supabase
      .from("ajustes_cuentas")
      .select("*")
      .eq("buque_nombre", buqueNombreSel)
      .eq("anio", anioSeleccionado);

    console.log("📌 Ajustes cargados:", ajustes);

    const mesNum = meses.findIndex(m => m === selectedMes) + 1;

    const cuentas = [
      ...(presupuestos || []).map(p => p.cuenta),
      ...(ajustes || []).map(a => a.cuenta),
      ...(asistencias || []).map(a => a.numero_cuenta),
      ...(compras || []).map(c => c.numero_cuenta),
    ]
      .filter(Boolean)
      .filter(c => c !== "Inversiones");

    const cuentasUnicas = [...new Set(cuentas)];

    const resumenCuentas = cuentasUnicas.map(cuenta => {
      const presAcumulado = (presupuestos || [])
        .filter(p =>
          p.cuenta === cuenta &&
          mesesCorto.indexOf(p.mes.slice(0,3)) + 1 <= mesNum
        )
        .reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

      let gastoPedidos = 0;
      (cotizaciones || []).forEach(cot => {
        const solicitud = (compras || []).find(
          s => String(s.numero_pedido) === String(cot.numero_pedido)
        );
        if (
          solicitud &&
          solicitud.buque_id === selectedBuque &&
          solicitud.numero_cuenta === cuenta &&
          cot.fecha_aceptacion
        ) {
          const f = new Date(cot.fecha_aceptacion);
          if ((f.getMonth() + 1) <= mesNum && f.getFullYear() === anioSeleccionado) {
            gastoPedidos += parseFloat(cot.valor_factura || cot.valor || 0);
          }
        }
      });

      let gastoAsistencias = 0;
      (asistencias || []).forEach(asistencia => {
        if (asistencia.buque_id === selectedBuque && asistencia.numero_cuenta === cuenta) {
          (cotizacionesAsis || []).forEach(cot => {
            if (
              String(cot.numero_asistencia) === String(asistencia.numero_ate) &&
              cot.fecha_aceptacion
            ) {
              const f = new Date(cot.fecha_aceptacion);
              if ((f.getMonth() + 1) <= mesNum && f.getFullYear() === anioSeleccionado) {
                gastoAsistencias += parseFloat(cot.valor_factura || cot.valor || 0);
              }
            }
          });
        }
      });

      const ajustesFiltrados = (ajustes || [])
        .filter(a => a.cuenta?.toLowerCase() === cuenta.toLowerCase() && a.mes <= mesNum);

      console.log(`🔍 Ajustes para cuenta: ${cuenta} (hasta mes ${mesNum}) →`, ajustesFiltrados);

      let gastoAjustes = 0;
      ajustesFiltrados.forEach((ajuste, i) => {
        let valor = String(ajuste.valor_factura).replace(",", ".");
        let valorNumerico = parseFloat(valor);

        if (isNaN(valorNumerico)) {
          console.warn(`❌ Ajuste inválido [${i}]: cuenta=${ajuste.cuenta}, mes=${ajuste.mes}, valor="${ajuste.valor_factura}"`);
        } else {
          console.log(`✅ Ajuste válido [${i}]: ${ajuste.cuenta} - mes ${ajuste.mes} - valor=${valorNumerico}`);
          gastoAjustes += valorNumerico;
        }
      });

      const gastoAcumulado = gastoAjustes - (gastoPedidos + gastoAsistencias);
      const balance = presAcumulado - gastoAcumulado;

      return { cuenta, presAcumulado, gastoAcumulado, balance };
    });

    resumenCuentas.sort((a, b) => {
      const ia = ORDEN_CUENTAS.indexOf(a.cuenta);
      const ib = ORDEN_CUENTAS.indexOf(b.cuenta);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    setResumen(resumenCuentas);
    setLoading(false);
  };

  const abrirDetalle = (cuenta) => {
    setDetalleCuenta(cuenta);
    setMesNumDetalle(meses.findIndex(m => m === selectedMes) + 1);
    setModalOpen(true);
  };
  const cerrarDetalle = () => setModalOpen(false);

  return (
    <Box p={4} bg="white" boxShadow="md" borderRadius="md">
      <Heading size="md" mb={4}>📑 Informe de Cuentas</Heading>

      {usuarioEmail === "raguirre@cotenaval.es" && (
        <Box mb={4} display="flex" gap={4}>
          <Button
            colorScheme={mostrarAjustes ? "red" : "blue"}
            onClick={() => setMostrarAjustes(!mostrarAjustes)}
          >
            {mostrarAjustes ? "❌ Cerrar Ajuste de Cuentas" : "⚙️ Ajuste de Cuentas"}
          </Button>
        </Box>
      )}

      {mostrarAjustes && (
        <Box mb={6} p={4} border="1px solid #ddd" borderRadius="md" bg="gray.50">
          <AjusteCuentas />
        </Box>
      )}

      <Box mb={4} display="flex" gap={4}>
        <Select placeholder="Selecciona buque" value={selectedBuque} onChange={e => setSelectedBuque(e.target.value)} width="auto">
          {buques.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </Select>
        <Select value={anioSeleccionado} onChange={e => setAnioSeleccionado(parseInt(e.target.value))} width="auto">
          {[2023, 2024, 2025].map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select placeholder="Selecciona mes" value={selectedMes} onChange={e => setSelectedMes(e.target.value)} width="auto">
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </Box>

      {loading ? (
        <Spinner />
      ) : resumen.length === 0 ? (
        <Text>No hay datos disponibles.</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th>Cuenta</Th>
                <Th>Presupuesto acumulado</Th>
                <Th>Real acumulado</Th>
                <Th>Balance</Th>
              </Tr>
            </Thead>
            <Tbody>
              {resumen.map((fila, idx) => (
                <Tr key={idx}>
                  <Td>{fila.cuenta}</Td>
                  <Td>{Number(fila.presAcumulado || 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</Td>
                  <Td>
                    <Box as={motion.div} whileHover={{ scale: 1.05, backgroundColor: "#e3f2fd" }} whileTap={{ scale: 0.97 }}
                      style={{cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:6, padding:"0 0.5rem", minWidth:110}}
                      onClick={() => abrirDetalle(fila.cuenta)} title="Ver detalle acumulado">
                      <span style={{color:"#1565c0", textDecoration:"underline"}}>
                        {Number(fila.gastoAcumulado || 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}
                      </span>
                      <ExternalLinkIcon ml={2} color="gray.500" />
                    </Box>
                  </Td>
                  <Td style={{
                    color: fila.balance >= 0 ? "green" : "red",
                    fontWeight: "bold",
                    background: fila.balance >= 0 ? "#e8f5e9" : "#ffebee"
                  }}>
                    {Number(fila.balance || 0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <AnimatePresence>
        {modalOpen && (
          <Modal isOpen={modalOpen} onClose={cerrarDetalle} size="6xl" motionPreset="slideInBottom">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                Detalle acumulado - {detalleCuenta} / {selectedMes} {anioSeleccionado}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <InformeCuentasDetalles
                  buque={selectedBuque}
                  buqueNombre={buques.find(b => b.id === selectedBuque)?.nombre}
                  cuenta={detalleCuenta}
                  mesNum={mesNumDetalle}
                  anio={anioSeleccionado}
                  onBack={cerrarDetalle}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default InformeCuentas;
