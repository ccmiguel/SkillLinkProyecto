import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las respuestas
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, e.nombre as estudiante_nombre, t.nombre_tutoria
      FROM public.respuesta r
      JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener respuestas:", error.message);
    res.status(500).json({ error: "Error al obtener respuestas" });
  }
});

// GET - Respuesta por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.respuesta r
       JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE r.id_respuesta = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener respuesta" });
  }
});

// POST - Crear respuesta
router.post("/", async (req, res) => {
  try {
    const { opcion_respuestas, descripcion, id_inscripcion } = req.body;
    const result = await pool.query(
      `INSERT INTO public.respuesta (opcion_respuestas, descripcion, id_inscripcion) 
       VALUES ($1, $2, $3) RETURNING *`,
      [opcion_respuestas, descripcion, id_inscripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear respuesta" });
  }
});

// PUT - Actualizar respuesta
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { opcion_respuestas, descripcion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.respuesta 
       SET opcion_respuestas=$1, descripcion=$2 
       WHERE id_respuesta=$3 RETURNING *`,
      [opcion_respuestas, descripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar respuesta" });
  }
});

// DELETE - Eliminar respuesta
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM public.respuesta WHERE id_respuesta = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }

    res.json({ mensaje: "Respuesta eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar respuesta" });
  }
});

export default router;