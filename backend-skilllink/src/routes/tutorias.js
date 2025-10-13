import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ✅ GET - Obtener todas las tutorías (ACTUALIZADO)
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Ejecutando consulta para obtener todas las tutorías...");
    const result = await pool.query("SELECT * FROM tutoria");
    console.log(`✅ Se encontraron ${result.rows.length} tutorías`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener tutorías:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutorías",
      detalle: error.message 
    });
  }
});

// ✅ GET - Obtener una tutoria por ID (ACTUALIZADO)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM tutoria WHERE id_tutoria = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoria no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener tutoria:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutoria",
      detalle: error.message 
    });
  }
});

// ✅ POST - Crear una nueva tutoria (ACTUALIZADO)
router.post("/", async (req, res) => {
  try {
    const { sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion } = req.body;
    
    const result = await pool.query(
      `INSERT INTO tutoria (sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al crear tutoria:", error.message);
    res.status(500).json({ 
      error: "Error al crear tutoria",
      detalle: error.message 
    });
  }
});

// ✅ PUT - Actualizar una tutoria (ACTUALIZADO)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion } = req.body;

    const result = await pool.query(
      `UPDATE tutoria 
       SET sigla=$1, nombre_tutoria=$2, cupo=$3, descripcion_tutoria=$4, id_tutor=$5, id_institucion=$6 
       WHERE id_tutoria=$7 RETURNING *`,
      [sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoria no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar tutoria:", error.message);
    res.status(500).json({ 
      error: "Error al actualizar tutoria",
      detalle: error.message 
    });
  }
});

// ✅ DELETE - Eliminar una tutoria (MANTIENE IGUAL)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM tutoria WHERE id_tutoria = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoria no encontrada" });
    }

    res.json({ mensaje: "Tutoria eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar tutoria:", error.message);
    res.status(500).json({ 
      error: "Error al eliminar tutoria",
      detalle: error.message 
    });
  }
});

export default router;