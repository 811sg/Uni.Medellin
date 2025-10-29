// =====================
// 🔧 IMPORTACIONES Y CONFIGURACIÓN
// =====================
import express from "express";
import multer from "multer";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

// ✅ Configurar __dirname (necesario en módulos ES)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================
// ⚙️ CONFIGURACIONES BASE
// =====================
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
// 📤 SUBIR HOJA DE VIDA (GUARDAR EN BD + CARPETA IA)
// =====================
app.post("/upload-cv", upload.single("cv"), async (req, res) => {
  try {
    console.log("📥 Petición recibida en /upload-cv");
    const file = req.file;
    const nombre = req.body.nombre;
    const correo = req.body.correo;

    console.log("➡️ Datos recibidos:", { nombre, correo, file: file?.originalname });

    if (!file) {
      console.log("⚠️ No se subió ningún archivo");
      return res.status(400).send("❌ No se subió ningún archivo.");
    }

    // 💾 Guardar en la base de datos
    const query = `
      INSERT INTO hojas_de_vida (nombre, correo, archivo_nombre, archivo_datos)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [nombre, correo, file.originalname, file.buffer]);

    // 🧠 Guardar también el archivo físicamente en IA/hojas_de_vida/
    const outputDir = path.join(__dirname, "../IA/hojas_de_vida");

    // Crear carpeta si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log("📁 Carpeta creada correctamente en:", outputDir);
    }

    // 🔥 GUARDAR CON NOMBRE ORIGINAL (SIN TIMESTAMP)
    const safeFileName = file.originalname.replace(/\s+/g, "_");
    const filePath = path.join(outputDir, safeFileName);

    // ⚠️ Si existe, sobrescribir
    fs.writeFileSync(filePath, file.buffer);
    console.log(`✅ Hoja de vida guardada como: ${safeFileName}`);

    res.status(200).send("✅ Hoja de vida cargada con éxito y guardada para análisis IA.");
  } catch (error) {
    console.error("❌ Error al subir hoja de vida:", error);
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${file.archivo_nombre}`
    );
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

    // Determinar rol según el correo
    let rol = "";
    if (correo.includes("@soydocente")) rol = "docente";
    else if (correo.includes("@soyestudiante")) rol = "estudiante";
    else return res.status(400).send("❌ Correo institucional no válido.");

    // Encriptar contraseña
    const hashed = await bcrypt.hash(contrasena, 10);

    // Guardar en la base de datos
    await pool.query(
      "INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES ($1, $2, $3, $4)",
      [nombre, correo, hashed, rol]
    );

    res.status(200).send("✅ Usuario registrado correctamente.");
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      res.status(400).send("⚠️ Este correo ya está registrado.");
    } else {
      res.status(500).send("❌ Error al registrar el usuario.");
    }
  }
});

// =====================
// 🔑 LOGIN DE USUARIO
// =====================
app.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [
      correo,
    ]);

    if (result.rows.length === 0)
      return res.status(400).send("❌ Usuario no encontrado.");

    const user = result.rows[0];
    const match = await bcrypt.compare(contrasena, user.contrasena);

    if (!match) return res.status(400).send("❌ Contraseña incorrecta.");

    res.json({
      rol: user.rol,
      nombre: user.nombre,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error al iniciar sesión.");
  }
});

// =====================
// 📂 OBTENER TODAS LAS HOJAS DE VIDA (para el panel del profesor)
// =====================
app.get("/hojas-de-vida", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, correo, archivo_nombre FROM hojas_de_vida"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Error al obtener las hojas de vida");
  }
});

// =====================
// 🤖 ENVIAR DATOS A LA IA (Flask)
// =====================
app.post("/analizar-cvs", async (req, res) => {
  try {
    const perfilPorDefecto = `
    Buscamos estudiante para monitoría de Análisis de Datos con:
    - Dominio de Python (Pandas, NumPy, Matplotlib)
    - Conocimientos en estadística y análisis de datos
    - Experiencia previa en enseñanza, tutorías o monitorías
    - Excelente comunicación y paciencia
    - Promedio superior a 4.0
    - Capacidad para explicar conceptos complejos claramente
    `;

    const perfil = req.body.perfil || perfilPorDefecto;

    console.log("🤖 Enviando solicitud a Flask...");

    const response = await fetch("http://127.0.0.1:5000/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil }),
    });

    if (!response.ok) {
      throw new Error(`Flask respondió con status ${response.status}`);
    }

    const data = await response.json();
    
    console.log("✅ Respuesta de Flask recibida:");
    console.log(data);
    
    // 🔥 IMPORTANTE: Convertir puntajes a porcentaje si vienen como decimal
    const resultadosFormateados = data.map(item => ({
      nombre: item.nombre,
      archivo: item.archivo,
      puntaje: item.puntaje > 1 ? item.puntaje : item.puntaje * 100
    }));
    
    console.log("📊 Resultados formateados:", resultadosFormateados);
    
    res.json(resultadosFormateados);
  } catch (error) {
    console.error("❌ Error al conectar con la IA:", error);
    res.status(500).send("❌ Error al conectar con la IA.");
  }
});

// =====================
// 🚀 INICIAR SERVIDOR
// =====================
app.listen(3001, () => console.log("🚀 Servidor corriendo en puerto 3001"));