const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// ✅ Crear la carpeta base 'uploads' si no existe
const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// Ruta pública para acceder a los archivos
app.use("/uploads", express.static(uploadRoot));

// Multer configuración
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); // carpeta temporal, luego se mueve a subcarpeta
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Servidor backend operativo. Usa /upload para subir archivos.");
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

// Obtener archivos
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

// Eliminar archivo
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
  console.log(`✅ Servidor backend escuchando en http://localhost:${PORT}`);
});
