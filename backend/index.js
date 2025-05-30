const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5001;

// Middleware básico
app.use(cors());
app.use(express.json());

// ===== Autenticación básica =====
const AUTH_USER = "admin";
const AUTH_PASS = "fleetops123";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="FleetOps Backend"');
    return res.status(401).send("Autenticación requerida");
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
  const [user, password] = credentials.split(":");

  if (user === AUTH_USER && password === AUTH_PASS) {
    return next();
  } else {
    res.setHeader("WWW-Authenticate", 'Basic realm="FleetOps Backend"');
    return res.status(401).send("Credenciales inválidas");
  }
};

// Carpeta base
const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// Rutas públicas (solo acceso a archivos)
app.use("/uploads", express.static(uploadRoot));

// Rutas protegidas con autenticación
app.use("/upload", authMiddleware);
app.use("/uploads", authMiddleware);

// Multer configuración
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Ruta principal
app.get("/", (req, res) => {
  res.send("✅ Servidor FleetOps operativo con protección básica");
});

// Subir archivos por número de pedido
app.post("/upload/:pedidoId", upload.array("archivos", 10), (req, res) => {
  const pedidoId = req.params.pedidoId;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ mensaje: "No se subieron archivos." });
  }

  const dir = path.join(uploadRoot, pedidoId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const archivos = [];
  req.files.forEach((file) => {
    const newPath = path.join(dir, file.filename);
    fs.renameSync(file.path, newPath);
    archivos.push({
      nombre: file.filename,
      url: `http://localhost:${PORT}/uploads/${pedidoId}/${file.filename}`,
    });
  });

  res.json({ mensaje: "Archivos subidos correctamente", archivos });
});

// Listar archivos por pedido
app.get("/uploads/:pedidoId", (req, res) => {
  const pedidoId = req.params.pedidoId;
  const dir = path.join(uploadRoot, pedidoId);

  if (!fs.existsSync(dir)) {
    return res.json({ archivos: [] });
  }

  const archivos = fs.readdirSync(dir).map((nombre) => ({
    nombre,
    url: `http://localhost:${PORT}/uploads/${pedidoId}/${nombre}`,
  }));

  res.json({ archivos });
});

// Eliminar archivo específico
app.delete("/uploads/:pedidoId/:filename", (req, res) => {
  const { pedidoId, filename } = req.params;
  const filePath = path.join(uploadRoot, pedidoId, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ mensaje: "Archivo eliminado correctamente." });
  } else {
    return res.status(404).json({ mensaje: "Archivo no encontrado." });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend protegido en http://localhost:${PORT}`);
});
