import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las opciones (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, p.descripcion as pregunta_descripcion
      FROM public.opcion o
      JOIN public.preguntas p ON o.numero_preg = p.numero_preg AND p.activo = TRUE
      WHERE o.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener opciones:", error.message);
    res.status(500).json({ error: "Error al obtener opciones" });
  }
});

// GET - Opción por IDs compuestos (inciso y numero_preg)
router.get("/:inciso/:numero_preg", async (req, res) => {
  try {
    const { inciso, numero_preg } = req.params;
    const result = await pool.query(
      `SELECT o.*, p.descripcion as pregunta_descripcion
       FROM public.opcion o
       JOIN public.preguntas p ON o.numero_preg = p.numero_preg AND p.activo = TRUE
       WHERE o.inciso = $1 AND o.numero_preg = $2 AND o.activo = TRUE`,
      [inciso, numero_preg]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener opción" });
  }
});

// GET - Opciones por pregunta (solo activas)
router.get("/pregunta/:numero_preg", async (req, res) => {
  try {
    const { numero_preg } = req.params;
    const result = await pool.query(
      `SELECT o.* 
       FROM public.opcion o
       JOIN public.preguntas p ON o.numero_preg = p.numero_preg AND p.activo = TRUE
       WHERE o.numero_preg = $1 AND o.activo = TRUE`,
      [numero_preg]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener opciones" });
  }
});

// POST - Crear opción (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { numero_preg, respuesta_opcion } = req.body;
    
    // Verificar que la pregunta existe y está activa
    const pregunta = await pool.query(
      "SELECT * FROM public.preguntas WHERE numero_preg = $1 AND activo = TRUE",
      [numero_preg]
    );
    
    if (pregunta.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada o deshabilitada" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.opcion (numero_preg, respuesta_opcion, activo) 
       VALUES ($1, $2, TRUE) RETURNING *`,
      [numero_preg, respuesta_opcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear opción" });
  }
});

// PUT - Actualizar opción (solo si está activa)
router.put("/:inciso/:numero_preg", async (req, res) => {
  try {
    const { inciso, numero_preg } = req.params;
    const { respuesta_opcion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.opcion 
       SET respuesta_opcion=$1 
       WHERE inciso=$2 AND numero_preg=$3 AND activo = TRUE 
       RETURNING *`,
      [respuesta_opcion, inciso, numero_preg]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar opción" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:inciso/:numero_preg", async (req, res) => {
  try {
    const { inciso, numero_preg } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.opcion SET activo = FALSE 
       WHERE inciso = $1 AND numero_preg = $2 AND activo = TRUE 
       RETURNING *`,
      [inciso, numero_preg]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Opción deshabilitada correctamente",
      opcion: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar opción" });
  }
});

// OPCIONAL: Endpoint para reactivar una opción
router.patch("/:inciso/:numero_preg/activar", async (req, res) => {
  try {
    const { inciso, numero_preg } = req.params;
    
    // Verificar que la pregunta sigue activa
    const pregunta = await pool.query(
      "SELECT * FROM public.preguntas WHERE numero_preg = $1 AND activo = TRUE",
      [numero_preg]
    );
    
    if (pregunta.rows.length === 0) {
      return res.status(400).json({ error: "No se puede reactivar: la pregunta está deshabilitada" });
    }
    
    const result = await pool.query(
      `UPDATE public.opcion SET activo = TRUE 
       WHERE inciso = $1 AND numero_preg = $2 
       RETURNING *`,
      [inciso, numero_preg]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Opción no encontrada" });
    }

    res.json({ 
      mensaje: "Opción reactivada correctamente",
      opcion: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Error al reactivar opción" });
  }
});

// DELETE - Eliminar todas las opciones de una pregunta (eliminación lógica)
router.delete("/pregunta/:numero_preg", async (req, res) => {
  try {
    const { numero_preg } = req.params;
    
    const result = await pool.query(
      `UPDATE public.opcion SET activo = FALSE 
       WHERE numero_preg = $1 AND activo = TRUE 
       RETURNING *`,
      [numero_preg]
    );

    res.json({ 
      mensaje: `${result.rows.length} opciones deshabilitadas correctamente`,
      opciones: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar opciones" });
  }
});

export default router;