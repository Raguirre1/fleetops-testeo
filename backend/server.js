const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const UPLOADS_BASE = path.join(__dirname, "uploads");

// Middleware para servir archivos estáticos
app.use("/uploads", express.static(UPLOADS_BASE));

/* ========== GESTIÓN GENERAL DE ARCHIVOS DE PEDIDO ========== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pedido = req.params.pedido;
    const dir = path.join(UPLOADS_BASE, pedido);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

app.post("/upload/:pedido", upload.array("archivos"), (req, res) => {
  const pedido = req.params.pedido;
  const dir = path.join(UPLOADS_BASE, pedido);
  const archivos = fs.readdirSync(dir).filter(f => f !== "cotizacion");
  res.status(200).json({
    message: "Archivos subidos correctamente.",
    archivos,
  });
});


app.get("/uploads/:pedido", (req, res) => {
  const pedido = req.params.pedido;
  const dir = path.join(UPLOADS_BASE, pedido);

  if (!fs.existsSync(dir)) {
    return res.json({ archivos: [] });
  }

  const archivos = fs.readdirSync(dir).filter(f => f !== 'cotizacion');
  res.json({ archivos });
});

app.delete("/uploads/:pedido/:filename", (req, res) => {
  const { pedido, filename } = req.params;
  const filePath = path.join(UPLOADS_BASE, pedido, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Archivo eliminado." });
  } else {
    return res.status(404).json({ error: "Archivo no encontrado." });
  }
});

/* ========== GESTIÓN DE ARCHIVOS DE COTIZACIÓN ========== */

// Subida de cotizaciones
const cotizacionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pedido = req.params.pedido;
    const dir = path.join(UPLOADS_BASE, pedido, "cotizacion");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const uploadCotizacion = multer({ storage: cotizacionStorage });

app.post("/upload/:pedido/cotizacion", uploadCotizacion.array("archivos"), (req, res) => {
  res.status(200).json({ message: "Cotización subida correctamente." });
});

// Listado de archivos de cotización
app.get("/uploads/:pedido/cotizacion", (req, res) => {
  const pedido = req.params.pedido;
  const dir = path.join(UPLOADS_BASE, pedido, "cotizacion");

  if (!fs.existsSync(dir)) {
    return res.json({ archivos: [] });
  }

  const archivos = fs.readdirSync(dir);
  res.json({ archivos });
});

/* ========== RUTA RAÍZ ========== */

app.get("/", (req, res) => {
  res.send("FleetOps backend operativo");
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
