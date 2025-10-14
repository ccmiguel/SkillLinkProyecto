import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las preguntas (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, t.nombre_tutoria
      FROM public.preguntas p
      LEFT JOIN public.tutoria t ON p.id_tutoria = t.id_tutoria AND t.activo = TRUE
      WHERE p.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener preguntas:", error.message);
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
});

// GET - Pregunta por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, t.nombre_tutoria
       FROM public.preguntas p
       LEFT JOIN public.tutoria t ON p.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE p.numero_preg = $1 AND p.activo = TRUE`,
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

// GET - Preguntas por tutoria (solo activas)
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la tutoría existe y está activa
    const tutoria = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutoria.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada" });
    }
    
    const result = await pool.query(
      "SELECT * FROM public.preguntas WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
});

// POST - Crear pregunta (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { descripcion, tipo_pregun, id_tutoria } = req.body;
    
    // Si tiene tutoría asociada, verificar que existe y está activa
    if (id_tutoria) {
      const tutoria = await pool.query(
        "SELECT * FROM public.tutoria WHERE id_tutoria = $1 AND activo = TRUE",
        [id_tutoria]
      );
      
      if (tutoria.rows.length === 0) {
        return res.status(404).json({ error: "Tutoría no encontrada o deshabilitada" });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO public.preguntas (descripcion, tipo_pregun, id_tutoria, activo) 
       VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [descripcion, tipo_pregun, id_tutoria]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear pregunta" });
  }
});

// PUT - Actualizar pregunta (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, tipo_pregun, id_tutoria } = req.body;
    
    // Si se cambia la tutoría, verificar que la nueva existe y está activa
    if (id_tutoria) {
      const tutoria = await pool.query(
        "SELECT * FROM public.tutoria WHERE id_tutoria = $1 AND activo = TRUE",
        [id_tutoria]
      );
      
      if (tutoria.rows.length === 0) {
        return res.status(404).json({ error: "Tutoría no encontrada o deshabilitada" });
      }
    }
    
    const result = await pool.query(
      `UPDATE public.preguntas 
       SET descripcion=$1, tipo_pregun=$2, id_tutoria=$3 
       WHERE numero_preg=$4 AND activo = TRUE RETURNING *`,
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

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay opciones activas asociadas a esta pregunta
    const opciones = await pool.query(
      "SELECT * FROM public.opcion WHERE numero_preg = $1 AND activo = TRUE",
      [id]
    );
    
    if (opciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la pregunta porque tiene opciones activas asociadas" 
      });
    }
    
    // Verificar si hay respuestas activas asociadas a esta pregunta
    // (esto dependería de cómo esté estructurada tu tabla de respuestas)
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.preguntas SET activo = FALSE 
       WHERE numero_preg = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Pregunta deshabilitada correctamente",
      pregunta: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar pregunta" });
  }
});

// OPCIONAL: Endpoint para reactivar una pregunta
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la tutoría asociada (si existe) sigue activa
    const pregunta = await pool.query(
      `SELECT p.*, t.activo as tutoria_activa
       FROM public.preguntas p
       LEFT JOIN public.tutoria t ON p.id_tutoria = t.id_tutoria
       WHERE p.numero_preg = $1`,
      [id]
    );
    
    if (pregunta.rows.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    
    // Si la pregunta tiene tutoría asociada, verificar que esté activa
    if (pregunta.rows[0].id_tutoria && !pregunta.rows[0].tutoria_activa) {
      return res.status(400).json({ error: "No se puede reactivar: la tutoría asociada está deshabilitada" });
    }
    
    const result = await pool.query(
      "UPDATE public.preguntas SET activo = TRUE WHERE numero_preg = $1 RETURNING *",
      [id]
    );

    res.json({ 
      mensaje: "Pregunta reactivada correctamente",
      pregunta: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Error al reactivar pregunta" });
  }
});

// DELETE - Eliminar todas las preguntas de una tutoría (eliminación lógica)
router.delete("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE public.preguntas SET activo = FALSE 
       WHERE id_tutoria = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    res.json({ 
      mensaje: `${result.rows.length} preguntas deshabilitadas correctamente`,
      preguntas: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: "Error al deshabilitar preguntas" });
  }
});

// GET - Preguntas sin tutoría (solo activas)
router.get("/sin-tutoria/activas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM public.preguntas WHERE id_tutoria IS NULL AND activo = TRUE"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener preguntas sin tutoría" });
  }
});

export default router;