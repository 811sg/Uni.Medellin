import express from "express";
import multer from "multer";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 📤 Subir hoja de vida
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

// 📥 Descargar hoja de vida
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

app.listen(3001, () => console.log("🚀 Servidor corriendo en puerto 3001"));