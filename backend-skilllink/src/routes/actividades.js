import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las actividades (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre
      FROM public.actividad a
      JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
      LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
      WHERE a.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener actividades:", error.message);
    res.status(500).json({ error: "Error al obtener actividades" });
  }
});

// GET - Actividad por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre
       FROM public.actividad a
       JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
       LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
       WHERE a.id_actividad = $1 AND a.activo = TRUE`,
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

// GET - Actividades por tutoria (solo activas)
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, tu.nombre as tutor_nombre
       FROM public.actividad a
       LEFT JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
       WHERE a.id_tutoria = $1 AND a.activo = TRUE`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener actividades" });
  }
});

// POST - Crear actividad (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor } = req.body;
    const result = await pool.query(
      `INSERT INTO public.actividad (nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
      [nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutoria, id_tutor]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear actividad" });
  }
});

// PUT - Actualizar actividad (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha_publicacion, fecha_presentacion, nota_act, id_tutor } = req.body;
    
    const result = await pool.query(
      `UPDATE public.actividad 
       SET nombre=$1, descripcion=$2, fecha_publicacion=$3, fecha_presentacion=$4, nota_act=$5, id_tutor=$6 
       WHERE id_actividad=$7 AND activo = TRUE RETURNING *`,
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

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      "UPDATE public.actividad SET activo = FALSE WHERE id_actividad = $1 AND activo = TRUE RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Actividad no encontrada o ya está eliminada" });
    }

    res.json({ 
      mensaje: "Actividad deshabilitada correctamente",
      actividad: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar actividad" });
  }
});

// OPCIONAL: Endpoint para reactivar una actividad
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE public.actividad SET activo = TRUE WHERE id_actividad = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    res.json({ 
      mensaje: "Actividad reactivada correctamente",
      actividad: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al reactivar actividad" });
  }
});

export default router;