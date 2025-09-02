import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Input,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  HStack,
  FormLabel,
  useToast,
  IconButton,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { supabase } from "../supabaseClient";

const ExcelUploadCotizacion = ({ numeroPedido, buqueId }) => {
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const fetchItems = async () => {
      if (!numeroPedido || !buqueId) return;
      const { data, error } = await supabase
        .from("lineas_cotizacion")
        .select("*")
        .eq("numero_pedido", numeroPedido)
        .eq("buque_id", buqueId);

      if (error) {
        toast({ title: "Error cargando datos", status: "error" });
        console.error(error);
      } else {
        setItems(data || []);

        const proveedoresSet = new Set();
        (data || []).forEach(item => {
          if (item.precios) {
            Object.keys(item.precios).forEach(prov => {
              proveedoresSet.add(prov);
            });
          }
        });
        setProveedores(Array.from(proveedoresSet));
      }
    };
    fetchItems();
  }, [numeroPedido, buqueId]);

  const processWord = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });

      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== "");

      const itemsDetectados = [];

      for (let i = 0; i < lines.length; i++) {
        const cantidadMatch = lines[i].match(/^(\d+)\s*(unit|units|meter|meters|pcs)?$/i);
        if (cantidadMatch) {
          const cantidad = parseInt(cantidadMatch[1]);
          const unidad = cantidadMatch[2] ? cantidadMatch[2].toLowerCase() : "unit";
          const descripcion = [];

          for (let j = 1; j <= 3 && i + j < lines.length; j++) {
            if (!/^\d+(\.\d+)?\s*(unit|units|meter|pcs)?$/i.test(lines[i + j])) {
              descripcion.push(lines[i + j]);
            }
          }

          let referencia = "";
          for (let k = Math.max(0, i - 2); k <= i + 4 && k < lines.length; k++) {
            const refMatch = lines[k].match(/\b\d{2,}-\d{4,}\b/);
            if (refMatch) {
              referencia = refMatch[0];
              break;
            }
          }

          itemsDetectados.push({
            numero_pedido: numeroPedido,
            buque_id: buqueId,
            item: itemsDetectados.length + 1,
            descripcion: descripcion.join(" "),
            referencia,
            cantidad,
            unidad,
            precios: {},
          });
        }
      }

      if (itemsDetectados.length === 0) {
        toast({ title: "No se encontraron ítems en el archivo Word", status: "warning" });
        return;
      }

      try {
        const datosSinId = itemsDetectados.map(({ id, ...rest }) => rest);
        const { error } = await supabase.from("lineas_cotizacion").upsert(datosSinId, {
          onConflict: ["numero_pedido", "buque_id", "item"],
        });

        if (error) throw error;

        setItems(itemsDetectados);
        toast({ title: "Archivo Word procesado y datos guardados", status: "success" });
      } catch (err) {
        console.error("Error al guardar en Supabase:", err);
        toast({ title: "Error al guardar los datos", status: "error" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcel = async (file) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const formattedItems = jsonData.map((row, index) => ({
        numero_pedido: numeroPedido,
        buque_id: buqueId,
        item: row["Item"] || index + 1,
        descripcion: row["Nombre/Título"] || row["Descripción"] || row["Nombre"] || "",
        referencia: row["Ref. Fabricante"] || row["Referencia"] || "",
        cantidad: row["Cantidad"] || 1,
        unidad: row["Unidad"] || "Unit",
        precios: {},
      }));

      if (formattedItems.length === 0) {
        toast({ title: "El archivo no contiene datos reconocibles", status: "warning" });
        return;
      }

      try {
        const datosSinId = formattedItems.map(({ id, ...rest }) => rest);
        const { error } = await supabase.from("lineas_cotizacion").upsert(datosSinId, {
          onConflict: ["numero_pedido", "buque_id", "item"],
        });

        if (error) throw error;

        setItems(formattedItems);
        toast({ title: "Archivo procesado y datos guardados", status: "success" });
      } catch (err) {
        console.error("Error al guardar en Supabase:", err);
        toast({ title: "Error al guardar los datos", status: "error" });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNombreArchivo(file.name);
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        processExcel(file);
      } else if (ext === "docx") {
        processWord(file);
      } else {
        toast({ title: "Formato no compatible. Usa Excel o Word.", status: "error" });
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setNombreArchivo(file.name);
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        processExcel(file);
      } else if (ext === "docx") {
        processWord(file);
      } else {
        toast({ title: "Formato no compatible. Usa Excel o Word.", status: "error" });
      }
    }
  };

  const handleExportToExcel = () => {
    if (items.length === 0) {
      toast({ title: "No hay datos para exportar", status: "warning" });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cotizacion");

    XLSX.writeFile(workbook, `Cotizacion_${numeroPedido}.xlsx`);
  };

  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase
        .from("lineas_cotizacion")
        .delete()
        .eq("numero_pedido", numeroPedido)
        .eq("buque_id", buqueId);

      if (error) throw error;

      setItems([]);
      setNombreArchivo("");
      toast({ title: "Todas las líneas eliminadas", status: "info" });
    } catch (err) {
      console.error("Error al eliminar:", err);
      toast({ title: "Error al eliminar", status: "error" });
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleProveedorChange = (index, proveedor, value) => {
    const updated = [...items];
    if (!updated[index].precios) updated[index].precios = {};

    if (value === "" || value === "." || value === "-" || /^-?\d*\.?\d*$/.test(value)) {
      updated[index].precios[proveedor] = value;
      setItems(updated);
    }
  };

  const handleAddProveedor = () => {
    const nombreManual = prompt("Introduce el nombre del nuevo proveedor:");
    if (!nombreManual) return;
    if (proveedores.includes(nombreManual)) {
      toast({ title: "Ese proveedor ya existe", status: "warning" });
      return;
    }
    setProveedores([...proveedores, nombreManual]);
  };

  const handleRemoveProveedor = (nombreProveedor) => {
    const nuevosProveedores = proveedores.filter((p) => p !== nombreProveedor);
    setProveedores(nuevosProveedores);

    const actualizados = items.map((item) => {
      if (item.precios?.[nombreProveedor]) {
        const nuevaPrecio = { ...item.precios };
        delete nuevaPrecio[nombreProveedor];
        return { ...item, precios: nuevaPrecio };
      }
      return item;
    });

    setItems(actualizados);
  };

  const handleSave = async () => {
    try {
      const itemsWithBuqueId = items.map(item => ({
        ...item,
        buque_id: buqueId,
        numero_pedido: numeroPedido,
      }));
      const datosSinId = itemsWithBuqueId.map(({ id, ...rest }) => rest);
      const { error } = await supabase.from("lineas_cotizacion").upsert(datosSinId, {
        onConflict: ["numero_pedido", "buque_id", "item"],
      });
      if (error) throw error;
      toast({ title: "Cambios guardados", status: "success" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al guardar los cambios", status: "error" });
    }
  };

  const handleAddItem = () => {
    const nextItemNumber = items.length > 0 ? Math.max(...items.map(i => i.item || 0)) + 1 : 1;
    setItems([
      ...items,
      {
        numero_pedido: numeroPedido,
        buque_id: buqueId,
        item: nextItemNumber,
        descripcion: "",
        referencia: "",
        cantidad: 1,
        unidad: "Unit",
        precios: {},
      },
    ]);
  };

  const handleRemove = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const totalesProveedores = proveedores.reduce((acc, prov) => {
    acc[prov] = items.reduce((sum, item) => {
      const precioUnit = parseFloat(item.precios?.[prov]) || 0;
      const cantidad = item.cantidad || 0;
      return sum + precioUnit * cantidad;
    }, 0);
    return acc;
  }, {});

  return (
    <Box p={6} maxW="100%">
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Línea de Pedidos
      </Text>

      <Box
        border="2px dashed"
        borderColor={isDragging ? "blue.300" : "gray.300"}
        p={6}
        borderRadius="md"
        textAlign="center"
        mb={4}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          handleDrop(e);
          setIsDragging(false);
        }}
      >
        <Text fontWeight="medium">
          {isDragging
            ? "¡Suelta el archivo Excel o Word aquí!"
            : "Arrastra el archivo Excel o Word aquí"}
        </Text>
        <Input
          type="file"
          accept=".xlsx,.xls,.docx"
          onChange={handleFileChange}
          display="none"
          id="upload-excel"
        />
        <FormLabel
          htmlFor="upload-excel"
          cursor="pointer"
          color="blue.600"
          fontWeight="semibold"
        >
          Seleccionar archivo
        </FormLabel>
        {nombreArchivo && (
          <Text fontSize="sm" color="gray.600" mt={2}>
            Archivo seleccionado: <strong>{nombreArchivo}</strong>
          </Text>
        )}
      </Box>

      <HStack spacing={3} mb={4} flexWrap="wrap">
        <Button onClick={handleExportToExcel} colorScheme="green">
          📤 Exportar Excel
        </Button>
        <Button onClick={handleDeleteAll} colorScheme="red">
          🗑️ Eliminar Todo
        </Button>
        {proveedores.length < 3 && (
          <Button onClick={handleAddProveedor} colorScheme="purple">
            ➕ Añadir Proveedor
          </Button>
        )}
      </HStack>

      <Box w="100%">
        <Table variant="simple" size="sm" w="100%">
          <Thead bg="gray.100">
            <Tr>
              <Th>#</Th>
              <Th minW="250px">Descripción</Th>
              <Th minW="200px">Referencia</Th>
              <Th>Cantidad</Th>
              <Th>Unidad</Th>
              {proveedores.map((prov) => (
                <React.Fragment key={prov}>
                  <Th minW="160px" textAlign="center">
                    <HStack justify="space-between" align="start">
                      <Text fontSize="sm">{prov} €/u</Text>
                      <IconButton
                        size="xs"
                        icon={<CloseIcon />}
                        colorScheme="red"
                        variant="ghost"
                        aria-label={`Eliminar ${prov}`}
                        onClick={() => handleRemoveProveedor(prov)}
                      />
                    </HStack>
                  </Th>
                  <Th minW="140px" fontSize="sm" textAlign="center">
                    {prov} Total
                  </Th>
                </React.Fragment>
              ))}
              <Th>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.length === 0 ? (
              <Tr>
                <Td colSpan={6 + proveedores.length * 2} textAlign="center" py={4}>
                  No hay ítems cargados.
                </Td>
              </Tr>
            ) : (
              <>
                {items.map((item, index) => (
                  <Tr key={index}>
                    <Td>{item.item}</Td>
                    <Td>
                      <Textarea
                        value={item.descripcion}
                        onChange={(e) => {
                          handleChange(index, "descripcion", e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        resize="none"
                        overflow="hidden"
                        minH="40px"
                        fontSize="sm"
                      />
                    </Td>
                    <Td>
                      <Input
                        value={item.referencia}
                        onChange={(e) =>
                          handleChange(index, "referencia", e.target.value)
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleChange(
                            index,
                            "cantidad",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        value={item.unidad}
                        onChange={(e) =>
                          handleChange(index, "unidad", e.target.value)
                        }
                      />
                    </Td>
                    {proveedores.map((prov) => {
                      const precioUnit = parseFloat(item.precios?.[prov]) || 0;
                      const total = precioUnit * (item.cantidad || 0);
                      return (
                        <React.Fragment key={prov}>
                          <Td>
                            <Input
                              type="text"
                              value={item.precios?.[prov] ?? ""}
                              onChange={(e) =>
                                handleProveedorChange(index, prov, e.target.value)
                              }
                            />
                          </Td>
                          <Td>
                            <Text>
                              {isNaN(total) ? "-" : total.toFixed(2)} €
                            </Text>
                          </Td>
                        </React.Fragment>
                      );
                    })}
                    <Td>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleRemove(index)}
                      >
                        Eliminar
                      </Button>
                    </Td>
                  </Tr>
                ))}
                <Tr fontWeight="bold" bg="gray.100">
                  <Td colSpan={5} textAlign="right">
                    Total
                  </Td>
                  {proveedores.map((prov) => (
                    <React.Fragment key={"total-" + prov}>
                      <Td>{totalesProveedores[prov].toFixed(2)} €</Td>
                      <Td></Td>
                    </React.Fragment>
                  ))}
                  <Td></Td>
                </Tr>
              </>
            )}
          </Tbody>
        </Table>
      </Box>

      <HStack spacing={4} mt={4}>
        <Button onClick={handleAddItem} colorScheme="gray">
          Añadir ítem manual
        </Button>
        <Button onClick={handleSave} colorScheme="blue">
          Guardar cambios
        </Button>
      </HStack>
    </Box>
  );
};

ExcelUploadCotizacion.propTypes = {
  numeroPedido: PropTypes.string.isRequired,
  buqueId: PropTypes.string.isRequired,
};

export default ExcelUploadCotizacion;
