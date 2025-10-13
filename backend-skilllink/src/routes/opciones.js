import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las opciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, p.descripcion as pregunta_descripcion
      FROM public.opcion o
      JOIN public.preguntas p ON o.numero_preg = p.numero_preg
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener opciones:", error.message);
    res.status(500).json({ error: "Error al obtener opciones" });
  }
});

// GET - Opción por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, p.descripcion as pregunta_descripcion
       FROM public.opcion o
       JOIN public.preguntas p ON o.numero_preg = p.numero_preg
       WHERE o.id_opcion = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener opción" });
  }
});

// GET - Opciones por pregunta
router.get("/pregunta/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.opcion WHERE numero_preg = $1",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener opciones" });
  }
});

// POST - Crear opción
router.post("/", async (req, res) => {
  try {
    const { numero_preg, respuesta_opcion } = req.body;
    const result = await pool.query(
      `INSERT INTO public.opcion (numero_preg, respuesta_opcion) 
       VALUES ($1, $2) RETURNING *`,
      [numero_preg, respuesta_opcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear opción" });
  }
});

// PUT - Actualizar opción
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { respuesta_opcion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.opcion 
       SET respuesta_opcion=$1 
       WHERE id_opcion=$2 RETURNING *`,
      [respuesta_opcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar opción" });
  }
});

// DELETE - Eliminar opción
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM public.opcion WHERE id_opcion = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }

    res.json({ mensaje: "Opción eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar opción" });
  }
});

export default router;