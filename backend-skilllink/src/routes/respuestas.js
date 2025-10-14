import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las respuestas (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, e.nombre as estudiante_nombre, t.nombre_tutoria
      FROM public.respuesta r
      JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
      WHERE r.activo = TRUE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener respuestas:", error.message);
    res.status(500).json({ error: "Error al obtener respuestas" });
  }
});

// GET - Respuesta por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.respuesta r
       JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE r.id_resp = $1 AND r.activo = TRUE`,
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

// GET - Respuestas por inscripción (solo activas)
router.get("/inscripcion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la inscripción existe y está activa
    const inscripcion = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_inscripcion = $1 AND activo = TRUE",
      [id]
    );
    
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    
    const result = await pool.query(
      `SELECT r.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.respuesta r
       JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE r.id_inscripcion = $1 AND r.activo = TRUE`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener respuestas por inscripción:", error.message);
    res.status(500).json({ error: "Error al obtener respuestas por inscripción" });
  }
});

// GET - Respuestas por estudiante (solo activas)
router.get("/estudiante/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el estudiante existe y está activo
    const estudiante = await pool.query(
      "SELECT * FROM public.estudiante WHERE id_estudiante = $1 AND activo = TRUE",
      [id]
    );
    
    if (estudiante.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    
    const result = await pool.query(
      `SELECT r.*, t.nombre_tutoria, i.fecha_inscripcion
       FROM public.respuesta r
       JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE i.id_estudiante = $1 AND r.activo = TRUE`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener respuestas por estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener respuestas por estudiante" });
  }
});

// POST - Crear respuesta (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { opcion_respuestas, descripcion, id_inscripcion } = req.body;
    
    // Validar campos requeridos
    if (!id_inscripcion) {
      return res.status(400).json({ error: "ID de inscripción es requerido" });
    }
    
    // Verificar si la inscripción existe y está activa
    const inscripcion = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_inscripcion = $1 AND activo = TRUE",
      [id_inscripcion]
    );
    
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada o deshabilitada" });
    }
    
    // Verificar si ya existe una respuesta activa para esta inscripción
    const respuestaExistente = await pool.query(
      "SELECT * FROM public.respuesta WHERE id_inscripcion = $1 AND activo = TRUE",
      [id_inscripcion]
    );
    
    if (respuestaExistente.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe una respuesta activa para esta inscripción" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.respuesta (opcion_respuestas, descripcion, id_inscripcion, activo) 
       VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [opcion_respuestas, descripcion, id_inscripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear respuesta:", error.message);
    res.status(500).json({ error: "Error al crear respuesta" });
  }
});

// PUT - Actualizar respuesta (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { opcion_respuestas, descripcion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.respuesta 
       SET opcion_respuestas=$1, descripcion=$2 
       WHERE id_resp=$3 AND activo = TRUE RETURNING *`,
      [opcion_respuestas, descripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar respuesta:", error.message);
    res.status(500).json({ error: "Error al actualizar respuesta" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.respuesta SET activo = FALSE 
       WHERE id_resp = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Respuesta deshabilitada correctamente",
      respuesta: result.rows[0]
    });
  } catch (error) {
    console.error("Error al deshabilitar respuesta:", error.message);
    res.status(500).json({ error: "Error al deshabilitar respuesta" });
  }
});

// OPCIONAL: Endpoint para reactivar una respuesta
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la inscripción asociada sigue activa
    const respuesta = await pool.query(
      `SELECT r.*, i.activo as inscripcion_activa
       FROM public.respuesta r
       JOIN public.inscripcion i ON r.id_inscripcion = i.id_inscripcion
       WHERE r.id_resp = $1`,
      [id]
    );
    
    if (respuesta.rows.length === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }
    
    if (!respuesta.rows[0].inscripcion_activa) {
      return res.status(400).json({ error: "No se puede reactivar: la inscripción asociada está deshabilitada" });
    }
    
    // Verificar que no existe otra respuesta activa para la misma inscripción
    const respuestaActivaExistente = await pool.query(
      "SELECT * FROM public.respuesta WHERE id_inscripcion = $1 AND activo = TRUE AND id_resp != $2",
      [respuesta.rows[0].id_inscripcion, id]
    );
    
    if (respuestaActivaExistente.rows.length > 0) {
      return res.status(400).json({ error: "No se puede reactivar: ya existe una respuesta activa para esta inscripción" });
    }
    
    const result = await pool.query(
      "UPDATE public.respuesta SET activo = TRUE WHERE id_resp = $1 RETURNING *",
      [id]
    );

    res.json({ 
      mensaje: "Respuesta reactivada correctamente",
      respuesta: result.rows[0]
    });
  } catch (error) {
    console.error("Error al reactivar respuesta:", error.message);
    res.status(500).json({ error: "Error al reactivar respuesta" });
  }
});

// GET - Estadísticas de respuestas (solo activas)
router.get("/estadisticas/resumen", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_respuestas,
        COUNT(DISTINCT id_inscripcion) as inscripciones_con_respuesta,
        COUNT(CASE WHEN opcion_respuestas IS NOT NULL THEN 1 END) as respuestas_con_opcion,
        COUNT(CASE WHEN descripcion IS NOT NULL THEN 1 END) as respuestas_con_descripcion
      FROM public.respuesta
      WHERE activo = TRUE
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas de respuestas:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas de respuestas" });
  }
});

export default router;