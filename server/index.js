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

// ✅ TEST DE CONEXIÓN
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error al conectar con Neon:', err.stack);
  } else {
    console.log('✅ Conexión exitosa a Neon PostgreSQL');
    release();
  }
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

    // 📥 GUARDAR CON NOMBRE ORIGINAL (SIN TIMESTAMP)
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
    
    res.json(data);
    
  } catch (error) {
    console.error("❌ Error al conectar con la IA:", error);
    res.status(500).send("❌ Error al conectar con la IA.");
  }
});

// =====================================================
// 📋 OBTENER HOJAS DE VIDA CON ESTADO
// =====================================================
app.get("/hojas-de-vida", async (req, res) => {
  try {
    console.log("📡 Petición GET /hojas-de-vida recibida");
    
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
    
    console.log(`✅ Hojas de vida encontradas: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.warn("⚠️ No hay hojas de vida en la base de datos");
    } else {
      console.log("📊 Primeras 3 filas:");
      result.rows.slice(0, 3).forEach(row => {
        console.log(`  - ID: ${row.id}, Nombre: ${row.nombre}, Estado: ${row.estado}`);
      });
    }
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("❌ Error al obtener hojas de vida:", error);
    console.error("❌ Stack trace:", error.stack);
    res.status(500).json({ 
      error: "Error al obtener las hojas de vida",
      detalle: error.message 
    });
  }
});

// =====================================================
// 📝 EVALUAR CANDIDATO (cambiar estado a Evaluado)
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
// ⭐ ASIGNAR MONITOR (CON TRANSACCIÓN)
// =====================================================
app.post("/asignar-monitor/:id", async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    const { profesorCorreo, profesorNombre, materia, horario, semestre } = req.body;
    
    console.log(`🔄 Iniciando asignación de monitor ID: ${id}`);
    console.log(`📧 Datos recibidos:`, { profesorCorreo, profesorNombre, materia, horario, semestre });
    
    // Obtener cliente de la pool
    client = await pool.connect();
    await client.query('BEGIN');
    
    // 🔍 Verificar si ya hay alguien asignado
    const verificar = await client.query(
      "SELECT COUNT(*) as total FROM hojas_de_vida WHERE estado = 'Asignado'"
    );
    
    const yaAsignado = parseInt(verificar.rows[0].total);
    console.log(`📊 Monitores ya asignados: ${yaAsignado}`);
    
    if (yaAsignado > 0) {
      await client.query('ROLLBACK');
      console.log(`⚠️ Ya hay un monitor asignado`);
      return res.status(400).json({ 
        error: "Ya hay un monitor asignado. Solo puedes asignar uno por proceso." 
      });
    }
    
    // 📄 Obtener datos del candidato
    const candidato = await client.query(
      "SELECT nombre, correo FROM hojas_de_vida WHERE id = $1",
      [id]
    );
    
    if (candidato.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`❌ Candidato ID ${id} no encontrado`);
      return res.status(404).json({ error: "Candidato no encontrado" });
    }
    
    const { nombre, correo } = candidato.rows[0];
    console.log(`👤 Candidato encontrado: ${nombre} (${correo})`);
    
    // ✅ 1. Actualizar estado en hojas_de_vida
    await client.query(
      `UPDATE hojas_de_vida 
       SET estado = 'Asignado', 
           asignado_por = $1, 
           fecha_asignacion = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [profesorCorreo, id]
    );
    console.log(`✅ Estado actualizado en hojas_de_vida`);
    
    // ✅ 2. Crear registro en monitores_activos
    const materiaFinal = materia || 'No especificada';
    const horarioFinal = horario || 'Por definir';
    const semestreFinal = semestre || 'Actual';
    const profesorNombreFinal = profesorNombre || 'Profesor';
    
    await client.query(
      `INSERT INTO monitores_activos 
       (hoja_vida_id, nombre, correo, materia, horario, semestre, profesor_correo, profesor_nombre, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'activo')`,
      [id, nombre, correo, materiaFinal, horarioFinal, semestreFinal, profesorCorreo, profesorNombreFinal]
    );
    console.log(`✅ Registro creado en monitores_activos`);
    
    await client.query('COMMIT');
    console.log(`✅✅ TRANSACCIÓN COMPLETADA EXITOSAMENTE`);
    
    console.log(`✅ Monitor asignado: ${nombre} (ID: ${id})`);
    console.log(`   Profesor: ${profesorCorreo}`);
    console.log(`   Materia: ${materiaFinal}`);
    
    res.status(200).json({ 
      mensaje: "Monitor asignado correctamente",
      candidatoId: id,
      nombre: nombre,
      correo: correo
    });
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      console.log(`🔄 ROLLBACK ejecutado`);
    }
    console.error("❌ Error al asignar monitor:", error);
    console.error("❌ Stack trace:", error.stack);
    res.status(500).json({ 
      error: "Error al asignar el monitor",
      detalle: error.message 
    });
  } finally {
    if (client) {
      client.release();
      console.log(`🔓 Cliente liberado`);
    }
  }
});

// =====================================================
// 💾 GUARDAR PUNTAJE IA EN BD (para no perderlo)
// =====================================================
app.post("/guardar-puntajes-ia", async (req, res) => {
  try {
    const { resultados } = req.body;
    
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
// 🔄 RESETEAR ESTADOS (LIMPIA TODO)
// =====================================================
app.post("/reset-estados", async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // ✅ 1. Eliminar todos los monitores activos
    await client.query(`DELETE FROM monitores_activos`);
    console.log(`🗑️ Monitores activos eliminados`);
    
    // ✅ 2. Resetear hojas de vida
    await client.query(`
      UPDATE hojas_de_vida 
      SET estado = 'Pendiente',
          fecha_evaluacion = NULL,
          asignado_por = NULL,
          fecha_asignacion = NULL,
          puntaje_manual = NULL,
          seguimiento = NULL
    `);
    console.log(`🔄 Hojas de vida reseteadas`);
    
    await client.query('COMMIT');
    
    console.log("🔄 Todos los estados y monitores activos reseteados");
    res.status(200).json({ 
      mensaje: "Estados reseteados correctamente",
      accion: "Todos los candidatos vuelven a estado Pendiente y monitores activos eliminados" 
    });
    
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Error al resetear estados:", error);
    res.status(500).json({ error: "Error al resetear los estados" });
  } finally {
    if (client) client.release();
  }
});

// =====================================================
// 🗑️ QUITAR ASIGNACIÓN
// =====================================================
app.post("/quitar-asignacion", async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // 🔍 Buscar el monitor asignado
    const monitorAsignado = await client.query(`
      SELECT hv.id, hv.nombre, hv.fecha_evaluacion
      FROM hojas_de_vida hv
      WHERE hv.estado = 'Asignado'
    `);
    
    if (monitorAsignado.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: "No hay ningún candidato asignado" });
    }
    
    const { id, nombre, fecha_evaluacion } = monitorAsignado.rows[0];
    
    // ✅ 1. Eliminar de monitores_activos
    await client.query(`
      DELETE FROM monitores_activos 
      WHERE hoja_vida_id = $1
    `, [id]);
    
    // ✅ 2. Actualizar estado en hojas_de_vida
    const nuevoEstado = fecha_evaluacion ? 'Evaluado' : 'Pendiente';
    await client.query(`
      UPDATE hojas_de_vida 
      SET estado = $1,
          asignado_por = NULL,
          fecha_asignacion = NULL
      WHERE id = $2
    `, [nuevoEstado, id]);
    
    await client.query('COMMIT');
    
    console.log(`🗑️ Asignación removida de: ${nombre}`);
    res.status(200).json({ 
      mensaje: "Asignación removida correctamente",
      candidato: nombre
    });
    
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error("❌ Error al quitar asignación:", error);
    res.status(500).json({ error: "Error al quitar la asignación" });
  } finally {
    if (client) client.release();
  }
});

// =====================================================
// 📋 OBTENER MONITORES ACTIVOS
// =====================================================
app.get("/monitores-activos/:profesorCorreo", async (req, res) => {
  try {
    const { profesorCorreo } = req.params;
    
      console.log(`📋 GET /monitores-activos recibido`);
      console.log(`🔍 Buscando monitores para: ${profesorCorreo}`);  

    const result = await pool.query(`
      SELECT 
        ma.id,
        ma.nombre,
        ma.correo,
        ma.materia,
        ma.horario,
        ma.semestre,
        ma.fecha_inicio,
        ma.estado,
        hv.puntaje_ia,
        hv.puntaje_manual,
        hv.seguimiento
      FROM monitores_activos ma
      INNER JOIN hojas_de_vida hv ON ma.hoja_vida_id = hv.id
      WHERE ma.profesor_correo = $1 
        AND ma.estado = 'activo'
      ORDER BY ma.fecha_inicio DESC
    `, [profesorCorreo]);
    
    cconsole.log(`✅ Monitores encontrados en BD: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`📋 Primer monitor:`, result.rows[0]);
    }
    
    res.json(result.rows);
    
  } catch (error) {
    console.error("❌ Error al obtener monitores activos:", error);
    res.status(500).json({ error: "Error al obtener monitores activos" });
  }
});

// =====================
// 🚀 INICIAR SERVIDOR
// =====================
app.listen(3001, () => {
  console.log("=".repeat(60));
  console.log("🚀 SERVIDOR EXPRESS INICIADO");
  console.log("=".repeat(60));
  console.log(`📡 Puerto: 3001`);
  console.log(`🌐 URL: http://localhost:3001`);
  console.log(`💾 Base de datos: Neon PostgreSQL`);
  console.log("=".repeat(60));
});