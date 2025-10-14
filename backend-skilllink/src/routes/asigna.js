import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las asignaciones (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre, au.lugar, au.tipo_aula
      FROM public.asigna a
      JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
      JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
      JOIN public.aula au ON a.id_aula = au.id_aula
      WHERE a.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener asignaciones:", error.message);
    res.status(500).json({ error: "Error al obtener asignaciones" });
  }
});

// GET - Asignación por IDs compuestos (solo si está activa)
router.get("/:id_aula/:id_tutoria/:id_tutor", async (req, res) => {
  try {
    const { id_aula, id_tutoria, id_tutor } = req.params;
    const result = await pool.query(
      `SELECT a.*, t.nombre_tutoria, tu.nombre as tutor_nombre, au.lugar, au.tipo_aula
       FROM public.asigna a
       JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
       JOIN public.tutor tu ON a.id_tutor = tu.id_tutor
       JOIN public.aula au ON a.id_aula = au.id_aula
       WHERE a.id_aula = $1 AND a.id_tutoria = $2 AND a.id_tutor = $3 AND a.activo = TRUE`,
      [id_aula, id_tutoria, id_tutor]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener asignación" });
  }
});

// POST - Crear asignación (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { id_aula, id_tutoria, id_tutor, hora_inicio, hora_fin, dia } = req.body;
    const result = await pool.query(
      `INSERT INTO public.asigna (id_aula, id_tutoria, id_tutor, hora_inicio, hora_fin, dia, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
      [id_aula, id_tutoria, id_tutor, hora_inicio, hora_fin, dia]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear asignación" });
  }
});

// PUT - Actualizar asignación (solo si está activa)
router.put("/:id_aula/:id_tutoria/:id_tutor", async (req, res) => {
  try {
    const { id_aula, id_tutoria, id_tutor } = req.params;
    const { hora_inicio, hora_fin, dia } = req.body;
    
    const result = await pool.query(
      `UPDATE public.asigna 
       SET hora_inicio=$1, hora_fin=$2, dia=$3 
       WHERE id_aula=$4 AND id_tutoria=$5 AND id_tutor=$6 AND activo = TRUE 
       RETURNING *`,
      [hora_inicio, hora_fin, dia, id_aula, id_tutoria, id_tutor]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar asignación" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id_aula/:id_tutoria/:id_tutor", async (req, res) => {
  try {
    const { id_aula, id_tutoria, id_tutor } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.asigna SET activo = FALSE 
       WHERE id_aula = $1 AND id_tutoria = $2 AND id_tutor = $3 AND activo = TRUE 
       RETURNING *`,
      [id_aula, id_tutoria, id_tutor]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada o ya está eliminada" });
    }

    res.json({ 
      mensaje: "Asignación deshabilitada correctamente",
      asignacion: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar asignación" });
  }
});

// OPCIONAL: Endpoint para reactivar una asignación
router.patch("/:id_aula/:id_tutoria/:id_tutor/activar", async (req, res) => {
  try {
    const { id_aula, id_tutoria, id_tutor } = req.params;
    
    const result = await pool.query(
      `UPDATE public.asigna SET activo = TRUE 
       WHERE id_aula = $1 AND id_tutoria = $2 AND id_tutor = $3 
       RETURNING *`,
      [id_aula, id_tutoria, id_tutor]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    res.json({ 
      mensaje: "Asignación reactivada correctamente",
      asignacion: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al reactivar asignación" });
  }
});

export default router;