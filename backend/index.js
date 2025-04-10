const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Ruta estática para acceder a archivos subidos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuración de almacenamiento con multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Ruta GET para verificar que el backend está operativo
app.get("/", (req, res) => {
  res.send("✅ Servidor backend operativo. Usa /upload para subir archivos.");
});

// Ruta POST para subir múltiples archivos
app.post("/upload", upload.array("archivos", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ mensaje: "No se subieron archivos." });
  }

  const nombres = req.files.map((file) => ({
    nombre: file.filename,
    url: `http://localhost:${PORT}/uploads/${file.filename}`,
  }));

  res.json({ mensaje: "Archivos subidos correctamente.", archivos: nombres });
});

// Ruta DELETE para borrar un archivo
app.delete("/upload/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ mensaje: "Archivo eliminado correctamente." });
  } else {
    res.status(404).json({ mensaje: "Archivo no encontrado." });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend escuchando en http://localhost:${PORT}`);
});
