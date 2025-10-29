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
    
    // 🔥 SIMPLEMENTE DEVOLVER LOS DATOS SIN MODIFICAR
    // Python ya envía los puntajes como porcentaje (51.02, 50.37, etc.)
    res.json(data);
    
  } catch (error) {
    console.error("❌ Error al conectar con la IA:", error);
    res.status(500).send("❌ Error al conectar con la IA.");
  }
});

// =====================================================
// 📝 AGREGAR ESTOS ENDPOINTS A TU index.js
// =====================================================

// =====================================================
// 🔍 EVALUAR CANDIDATO (cambiar estado a Evaluado)
// =====================================================
app.post("/evaluar-candidato/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      `UPDATE hojas_de_vida 
       SET estado = 'Evaluado', fecha_evaluacion = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
    
    console.log(`✅ Candidato ID ${id} marcado como Evaluado`);
    res.status(200).json({ mensaje: "Candidato evaluado correctamente" });
    
  } catch (error) {
    console.error("❌ Error al evaluar candidato:", error);
    res.status(500).json({ error: "Error al evaluar el candidato" });
  }
});

// =====================================================
// 💬 AGREGAR/ACTUALIZAR SEGUIMIENTO
// =====================================================
app.post("/agregar-seguimiento/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { puntaje, comentario } = req.body;
    
    // Validaciones
    if (!comentario || comentario.trim() === "") {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }
    
    if (!puntaje || puntaje < 1 || puntaje > 100) {
      return res.status(400).json({ error: "El puntaje debe estar entre 1 y 100" });
    }
    
    await pool.query(
      `UPDATE hojas_de_vida 
       SET seguimiento = $1,
           puntaje_manual = $2
       WHERE id = $3`,
      [comentario, puntaje, id]
    );
    
    console.log(`✅ Seguimiento agregado al candidato ID ${id} - Puntaje: ${puntaje}`);
    res.status(200).json({ 
      mensaje: "Evaluación guardada correctamente",
      puntaje,
      comentario 
    });
    
  } catch (error) {
    console.error("❌ Error al agregar seguimiento:", error);
    res.status(500).json({ error: "Error al guardar la evaluación" });
  }
});

// =====================================================
// ⭐ ASIGNAR MONITOR (solo permite UNO)
// =====================================================
app.post("/asignar-monitor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { profesorCorreo } = req.body;
    
    // 🔍 Verificar si ya hay alguien asignado
    const verificar = await pool.query(
      "SELECT COUNT(*) as total FROM hojas_de_vida WHERE estado = 'Asignado'"
    );
    
    const yaAsignado = parseInt(verificar.rows[0].total);
    
    if (yaAsignado > 0) {
      return res.status(400).json({ 
        error: "Ya hay un monitor asignado. Solo puedes asignar uno por proceso." 
      });
    }
    
    // ✅ Asignar el monitor
    await pool.query(
      `UPDATE hojas_de_vida 
       SET estado = 'Asignado', 
           asignado_por = $1, 
           fecha_asignacion = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [profesorCorreo, id]
    );
    
    console.log(`✅ Monitor asignado: ID ${id} por ${profesorCorreo}`);
    res.status(200).json({ 
      mensaje: "Monitor asignado correctamente",
      candidatoId: id 
    });
    
  } catch (error) {
    console.error("❌ Error al asignar monitor:", error);
    res.status(500).json({ error: "Error al asignar el monitor" });
  }
});

// =====================================================
// 📊 OBTENER HOJAS DE VIDA CON ESTADO (actualizado)
// =====================================================
// 🔥 REEMPLAZA tu endpoint actual /hojas-de-vida con este:

app.get("/hojas-de-vida", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        nombre, 
        correo, 
        archivo_nombre, 
        estado, 
        puntaje_ia,
        puntaje_manual,
        seguimiento,
        asignado_por,
        fecha_asignacion,
        fecha_evaluacion
      FROM hojas_de_vida
      ORDER BY 
        CASE 
          WHEN puntaje_ia IS NOT NULL THEN puntaje_ia 
          ELSE -1 
        END DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener hojas de vida:", error);
    res.status(500).send("❌ Error al obtener las hojas de vida");
  }
});

// =====================================================
// 💾 GUARDAR PUNTAJE IA EN BD (para no perderlo)
// =====================================================
app.post("/guardar-puntajes-ia", async (req, res) => {
  try {
    const { resultados } = req.body; // Array de {nombre, archivo, puntaje}
    
    for (const resultado of resultados) {
      await pool.query(
        `UPDATE hojas_de_vida 
         SET puntaje_ia = $1 
         WHERE archivo_nombre = $2`,
        [resultado.puntaje, resultado.archivo]
      );
    }
    
    console.log(`✅ Puntajes IA guardados para ${resultados.length} candidatos`);
    res.status(200).json({ mensaje: "Puntajes guardados correctamente" });
    
  } catch (error) {
    console.error("❌ Error al guardar puntajes:", error);
    res.status(500).json({ error: "Error al guardar los puntajes" });
  }
});

// =====================================================
// 🔄 RESETEAR TODOS LOS ESTADOS (solo para testing)
// =====================================================
app.post("/reset-estados", async (req, res) => {
  try {
    await pool.query(`
      UPDATE hojas_de_vida 
      SET estado = 'Pendiente',
          fecha_evaluacion = NULL,
          asignado_por = NULL,
          fecha_asignacion = NULL,
          puntaje_manual = NULL,
          seguimiento = NULL
    `);
    
    console.log("🔄 Todos los estados reseteados a Pendiente");
    res.status(200).json({ 
      mensaje: "Estados reseteados correctamente",
      accion: "Todos los candidatos vuelven a estado Pendiente" 
    });
    
  } catch (error) {
    console.error("❌ Error al resetear estados:", error);
    res.status(500).json({ error: "Error al resetear los estados" });
  }
});

// =====================================================
// 🗑️ QUITAR ASIGNACIÓN (mantener evaluaciones)
// =====================================================
app.post("/quitar-asignacion", async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE hojas_de_vida 
      SET estado = CASE 
                     WHEN fecha_evaluacion IS NOT NULL THEN 'Evaluado'
                     ELSE 'Pendiente'
                   END,
          asignado_por = NULL,
          fecha_asignacion = NULL
      WHERE estado = 'Asignado'
      RETURNING nombre
    `);
    
    if (result.rows.length > 0) {
      console.log(`🗑️ Asignación removida de: ${result.rows[0].nombre}`);
      res.status(200).json({ 
        mensaje: "Asignación removida correctamente",
        candidato: result.rows[0].nombre
      });
    } else {
      res.status(404).json({ mensaje: "No hay ningún candidato asignado" });
    }
    
  } catch (error) {
    console.error("❌ Error al quitar asignación:", error);
    res.status(500).json({ error: "Error al quitar la asignación" });
  }
});

// =====================
// 🚀 INICIAR SERVIDOR
// =====================
app.listen(3001, () => console.log("🚀 Servidor corriendo en puerto 3001"));