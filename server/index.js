// =====================
// 🔧 IMPORTACIONES Y CONFIGURACIÓN
// =====================
import express from "express";
import multer from "multer";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// 💾 CONEXIÓN A NEON (POSTGRES)
// =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// =====================
// 📁 CONFIGURACIÓN DE MULTER (para subir archivos en memoria)
// =====================
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// =====================
// 📤 SUBIR HOJA DE VIDA
// =====================
app.post("/upload-cv", upload.single("cv"), async (req, res) => {
  try {
    const file = req.file;
    const nombre = req.body.nombre;
    const correo = req.body.correo;

    const query = `
      INSERT INTO hojas_de_vida (nombre, correo, archivo_nombre, archivo_datos)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [nombre, correo, file.originalname, file.buffer]);

    res.status(200).send("✅ Hoja de vida cargada con éxito");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error al subir la hoja de vida");
  }
});

// =====================
// 📥 DESCARGAR HOJA DE VIDA
// =====================
app.get("/download-cv/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT archivo_nombre, archivo_datos FROM hojas_de_vida WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Archivo no encontrado");
    }

    const file = result.rows[0];
    res.setHeader("Content-Disposition", `attachment; filename=${file.archivo_nombre}`);
    res.send(file.archivo_datos);
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error al descargar la hoja de vida");
  }
});

// =====================
// 👤 REGISTRO DE USUARIO
// =====================
app.post("/register", async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).send("❌ Faltan datos obligatorios.");
    }

    // Determinar rol según el correo
    let rol = "";
    if (correo.includes("@soydocente")) rol = "docente";
    else if (correo.includes("@soyestudiante")) rol = "estudiante";
    else return res.status(400).send("❌ Correo institucional no válido.");

    // Verificar si ya existe el usuario
    const check = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    if (check.rows.length > 0) {
      return res.status(409).send("⚠️ Este correo ya está registrado.");
    }

    // Encriptar contraseña
    const hashed = await bcrypt.hash(contrasena, 10);

    // Guardar usuario en base de datos
    await pool.query(
      "INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES ($1, $2, $3, $4)",
      [nombre, correo, hashed, rol]
    );

    res.status(200).send("✅ Usuario registrado correctamente.");
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    res.status(500).send("❌ Error al registrar el usuario.");
  }
});

// =====================
// 🔑 LOGIN DE USUARIO
// =====================
app.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    if (result.rows.length === 0) {
      return res.status(400).send("❌ Usuario no encontrado.");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(contrasena, user.contrasena);

    if (!match) {
      return res.status(400).send("❌ Contraseña incorrecta.");
    }

    // Enviar solo los datos necesarios
    res.json({
      rol: user.rol,
      nombre: user.nombre,
    });
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error);
    res.status(500).send("❌ Error al iniciar sesión.");
  }
});

// =====================
// 🚀 INICIAR SERVIDOR
// =====================
app.listen(3001, () => console.log("🚀 Servidor corriendo en puerto 3001"));
