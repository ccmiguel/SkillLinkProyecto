import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las actividades
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre
      FROM public.actividad a
      JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
      LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener actividades:", error.message);
    res.status(500).json({ error: "Error al obtener actividades" });
  }
});

// GET - Actividad por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre
       FROM public.actividad a
       JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
       LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
       WHERE a.id_actividad = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener actividad" });
  }
});

// GET - Actividades por tutoria
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, tu.nombre as tutor_nombre
       FROM public.actividad a
       LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
       WHERE a.id_tutoria = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener actividades" });
  }
});

// POST - Crear actividad
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor } = req.body;
    const result = await pool.query(
      `INSERT INTO public.actividad (nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear actividad" });
  }
});

// PUT - Actualizar actividad
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutor } = req.body;
    
    const result = await pool.query(
      `UPDATE public.actividad 
       SET nombre=$1, descripcion=$2, fecha_publicacion=$3, fecha_presentacion=$4, nota_act=$5, id_tutor=$6 
       WHERE id_actividad=$7 RETURNING *`,
      [nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutor, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar actividad" });
  }
});

// DELETE - Eliminar actividad
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM public.actividad WHERE id_actividad = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    res.json({ mensaje: "Actividad eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar actividad" });
  }
});

export default router;