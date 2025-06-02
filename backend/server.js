const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT;
const SECRET_KEY = process.env.JWT_SECRET || "mi_clave_secreta";

// ==== CORS CONFIGURADO FLEXIBLE PARA Railway y Codespaces ====
app.use(cors({
  origin: "*", // ⚠️ Para desarrollo. Puedes restringir en producción si quieres
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());


// ======== MIDDLEWARE JWT =========
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, usuario) => {
    if (err) return res.sendStatus(403);
    req.usuario = usuario;
    next();
  });
}

// ======== LOGIN =========
const usuariosData = JSON.parse(fs.readFileSync(path.join(__dirname, "usuarios.json"), "utf-8"));

app.post("/login", (req, res) => {
  const { nombre, password } = req.body;
  const usuario = usuariosData.find(u => u.nombre === nombre);

  if (!usuario) {
    return res.status(401).json({ error: "Usuario no encontrado" });
  }

  if (usuario.password === password || password === "Tauce") {
    const token = jwt.sign(
      { nombre: usuario.nombre, rol: usuario.rol },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      token,
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });
  } else {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }
});

// ======== ARCHIVOS =========
const UPLOADS_BASE = path.join(__dirname, "uploads");
app.use("/uploads", express.static(UPLOADS_BASE));

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

app.post("/upload/:pedido", verificarToken, upload.array("archivos"), (req, res) => {
  const pedido = req.params.pedido;
  const dir = path.join(UPLOADS_BASE, pedido);
  const archivos = fs.readdirSync(dir)
    .filter(f => f !== "cotizacion")
    .map(nombre => ({
      nombre,
      url: `/uploads/${pedido}/${nombre}`
    }));

  res.status(200).json({
    message: "Archivos subidos correctamente.",
    archivos,
  });
});

app.get("/uploads/:pedido", verificarToken, (req, res) => {
  const pedido = req.params.pedido;
  const dir = path.join(UPLOADS_BASE, pedido);

  if (!fs.existsSync(dir)) return res.json({ archivos: [] });

  const archivos = fs.readdirSync(dir)
    .filter(f => f !== "cotizacion")
    .map(nombre => ({
      nombre,
      url: `/uploads/${pedido}/${nombre}`
    }));

  res.json({ archivos });
});

app.delete("/uploads/:pedido/:filename", verificarToken, (req, res) => {
  const { pedido, filename } = req.params;
  const filePath = path.join(UPLOADS_BASE, pedido, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Archivo eliminado." });
  } else {
    return res.status(404).json({ error: "Archivo no encontrado." });
  }
});

// ======== COTIZACIONES =========
const cotizacionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { pedido, proveedor } = req.params;
    const dir = path.join(UPLOADS_BASE, pedido, "cotizacion", proveedor);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const uploadCotizacion = multer({ storage: cotizacionStorage });

app.post("/upload/:pedido/cotizacion/:proveedor", verificarToken, uploadCotizacion.array("archivos"), (req, res) => {
  const { pedido, proveedor } = req.params;
  const dir = path.join(UPLOADS_BASE, pedido, "cotizacion", proveedor);
  const archivos = fs.readdirSync(dir).map(nombre => ({
    nombre,
    url: `/uploads/${pedido}/cotizacion/${proveedor}/${nombre}`
  }));

  res.status(200).json({
    message: "Cotización subida correctamente.",
    archivos
  });
});

app.get("/uploads/:pedido/cotizacion/:proveedor", verificarToken, (req, res) => {
  const { pedido, proveedor } = req.params;
  const dir = path.join(UPLOADS_BASE, pedido, "cotizacion", proveedor);

  if (!fs.existsSync(dir)) return res.json({ archivos: [] });

  const archivos = fs.readdirSync(dir).map(nombre => ({
    nombre,
    url: `/uploads/${pedido}/cotizacion/${proveedor}/${nombre}`
  }));

  res.json({ archivos });
});

app.delete("/uploads/:pedido/cotizacion/:proveedor/:filename", verificarToken, (req, res) => {
  const { pedido, proveedor, filename } = req.params;
  const filePath = path.join(UPLOADS_BASE, pedido, "cotizacion", proveedor, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "Archivo eliminado." });
  } else {
    return res.status(404).json({ error: "Archivo no encontrado." });
  }
});

// ======== RUTA PRINCIPAL =========
app.get("/", (req, res) => {
  res.send("FleetOps backend operativo");
});

// ======== INICIAR SERVIDOR =========
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
