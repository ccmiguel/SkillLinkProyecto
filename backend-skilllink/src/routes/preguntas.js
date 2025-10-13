import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las preguntas
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, t.nombre_tutoria
      FROM public.preguntas p
      LEFT JOIN public.tutoria t ON p.id_tutoria = t.id_tutoria
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener preguntas:", error.message);
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
});

// GET - Pregunta por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, t.nombre_tutoria
       FROM public.preguntas p
       LEFT JOIN public.tutoria t ON p.id_tutoria = t.id_tutoria
       WHERE p.numero_preg = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener pregunta" });
  }
});

// GET - Preguntas por tutoria
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.preguntas WHERE id_tutoria = $1",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
});

// POST - Crear pregunta
router.post("/", async (req, res) => {
  try {
    const { descripcion, tipo_pregun, id_tutoria } = req.body;
    const result = await pool.query(
      `INSERT INTO public.preguntas (descripcion, tipo_pregun, id_tutoria) 
       VALUES ($1, $2, $3) RETURNING *`,
      [descripcion, tipo_pregun, id_tutoria]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear pregunta" });
  }
});

// PUT - Actualizar pregunta
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, tipo_pregun, id_tutoria } = req.body;
    
    const result = await pool.query(
      `UPDATE public.preguntas 
       SET descripcion=$1, tipo_pregun=$2, id_tutoria=$3 
       WHERE numero_preg=$4 RETURNING *`,
      [descripcion, tipo_pregun, id_tutoria, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar pregunta" });
  }
});

// DELETE - Eliminar pregunta
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM public.preguntas WHERE numero_preg = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    res.json({ mensaje: "Pregunta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar pregunta" });
  }
});

export default router;