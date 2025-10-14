import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las aulas (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, i.nombre as institucion_nombre
      FROM public.aula a
      LEFT JOIN public.institucion i ON a.id_institucion = i.id_institucion
      WHERE a.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener aulas:", error.message);
    res.status(500).json({ error: "Error al obtener aulas" });
  }
});

// GET - Aula por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, i.nombre as institucion_nombre
       FROM public.aula a
       LEFT JOIN public.institucion i ON a.id_institucion = i.id_institucion
       WHERE a.id_aula = $1 AND a.activo = TRUE`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Aula no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener aula" });
  }
});

// POST - Crear aula (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { tipo_aula, lugar, capacidad, id_institucion } = req.body;
    const result = await pool.query(
      `INSERT INTO public.aula (tipo_aula, lugar, capacidad, id_institucion, activo) 
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [tipo_aula, lugar, capacidad, id_institucion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear aula" });
  }
});

// PUT - Actualizar aula (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_aula, lugar, capacidad, id_institucion } = req.body;
    const result = await pool.query(
      `UPDATE public.aula 
       SET tipo_aula=$1, lugar=$2, capacidad=$3, id_institucion=$4 
       WHERE id_aula=$5 AND activo = TRUE 
       RETURNING *`,
      [tipo_aula, lugar, capacidad, id_institucion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Aula no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar aula" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.aula SET activo = FALSE 
       WHERE id_aula = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Aula no encontrada o ya está eliminada" });
    }

    res.json({ 
      mensaje: "Aula deshabilitada correctamente",
      aula: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar aula" });
  }
});

// OPCIONAL: Endpoint para reactivar un aula
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE public.aula SET activo = TRUE WHERE id_aula = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Aula no encontrada" });
    }

    res.json({ 
      mensaje: "Aula reactivada correctamente",
      aula: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al reactivar aula" });
  }
});

export default router;