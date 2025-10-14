import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las inscripciones (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, 
             e.nombre as estudiante_nombre, e.paterno as estudiante_paterno, e.email as estudiante_email,
             t.nombre_tutoria, t.sigla, t.cupo as cupo_tutoria,
             tu.nombre as tutor_nombre
      FROM public.inscripcion i
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
      JOIN public.tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
      WHERE i.activo = TRUE
      ORDER BY i.fecha_inscripcion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});

// GET - Inscripción por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, 
              e.nombre as estudiante_nombre, e.paterno as estudiante_paterno, e.materno as estudiante_materno,
              e.celular as estudiante_celular, e.email as estudiante_email, e.carrera, e.univer_institu,
              t.nombre_tutoria, t.sigla, t.cupo as cupo_tutoria, t.descripcion_tutoria,
              tu.nombre as tutor_nombre, tu.especialidad as tutor_especialidad
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
       WHERE i.id_inscripcion = $1 AND i.activo = TRUE`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener inscripción:", error.message);
    res.status(500).json({ error: "Error al obtener inscripción" });
  }
});

// GET - Inscripciones por estudiante (solo activas)
router.get("/estudiante/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, t.nombre_tutoria, t.sigla, t.descripcion_tutoria,
              tu.nombre as tutor_nombre, tu.especialidad
       FROM public.inscripcion i
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
       WHERE i.id_estudiante = $1 AND i.activo = TRUE
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones del estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones del estudiante" });
  }
});

// GET - Inscripciones por tutoria (solo activas)
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, e.nombre as estudiante_nombre, e.paterno, e.materno, e.email, e.carrera
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       WHERE i.id_tutoria = $1 AND i.activo = TRUE
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones de la tutoría:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones de la tutoría" });
  }
});

// GET - Inscripciones por estado (solo activas)
router.get("/estado/:estado", async (req, res) => {
  try {
    const { estado } = req.params;
    const result = await pool.query(
      `SELECT i.*, e.nombre as estudiante_nombre, t.nombre_tutoria, t.sigla
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE i.estado_inscripcion = $1 AND i.activo = TRUE
       ORDER BY i.fecha_inscripcion DESC`,
      [estado]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones por estado:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones por estado" });
  }
});

// POST - Crear inscripción (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { fecha_inscripcion, estado_inscripcion, cupo_asignado, id_estudiante, id_tutoria } = req.body;
    
    // Validar campos requeridos
    if (!id_estudiante || !id_tutoria) {
      return res.status(400).json({ error: "ID del estudiante y ID de la tutoría son requeridos" });
    }
    
    // Verificar si el estudiante existe y está activo
    const estudiante = await pool.query(
      "SELECT * FROM public.estudiante WHERE id_estudiante = $1 AND activo = TRUE",
      [id_estudiante]
    );
    
    if (estudiante.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado o deshabilitado" });
    }
    
    // Verificar si la tutoría existe y está activa
    const tutoria = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_tutoria = $1 AND activo = TRUE",
      [id_tutoria]
    );
    
    if (tutoria.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada o deshabilitada" });
    }
    
    // Verificar si el estudiante ya está inscrito en esta tutoría (inscripción activa)
    const inscripcionExistente = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_estudiante = $1 AND id_tutoria = $2 AND activo = TRUE",
      [id_estudiante, id_tutoria]
    );
    
    if (inscripcionExistente.rows.length > 0) {
      return res.status(400).json({ error: "El estudiante ya está inscrito en esta tutoría" });
    }
    
    // Verificar cupos disponibles en la tutoría (solo inscripciones activas)
    const cupoTutoria = tutoria.rows[0].cupo;
    const inscripcionesActivas = await pool.query(
      "SELECT COUNT(*) as total FROM public.inscripcion WHERE id_tutoria = $1 AND estado_inscripcion = 'Activa' AND activo = TRUE",
      [id_tutoria]
    );
    
    const totalInscripciones = parseInt(inscripcionesActivas.rows[0].total);
    
    if (totalInscripciones >= cupoTutoria) {
      return res.status(400).json({ error: "No hay cupos disponibles en esta tutoría" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.inscripcion (fecha_inscripcion, estado_inscripcion, cupo_asignado, id_estudiante, id_tutoria, activo) 
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [fecha_inscripcion || new Date(), estado_inscripcion || 'Pendiente', cupo_asignado, id_estudiante, id_tutoria]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear inscripción:", error.message);
    res.status(500).json({ error: "Error al crear inscripción" });
  }
});

// PUT - Actualizar inscripción (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inscripcion, estado_inscripcion, cupo_asignado } = req.body;
    
    const result = await pool.query(
      `UPDATE public.inscripcion 
       SET fecha_inscripcion=$1, estado_inscripcion=$2, cupo_asignado=$3 
       WHERE id_inscripcion=$4 AND activo = TRUE RETURNING *`,
      [fecha_inscripcion, estado_inscripcion, cupo_asignado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar inscripción:", error.message);
    res.status(500).json({ error: "Error al actualizar inscripción" });
  }
});

// PATCH - Cambiar estado de inscripción (solo si está activa)
router.patch("/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_inscripcion } = req.body;
    
    if (!estado_inscripcion) {
      return res.status(400).json({ error: "El estado es requerido" });
    }
    
    const result = await pool.query(
      "UPDATE public.inscripcion SET estado_inscripcion=$1 WHERE id_inscripcion=$2 AND activo = TRUE RETURNING *",
      [estado_inscripcion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al cambiar estado de inscripción:", error.message);
    res.status(500).json({ error: "Error al cambiar estado de inscripción" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay pagos asociados activos a esta inscripción
    const pagos = await pool.query(
      "SELECT * FROM public.pago_qr WHERE id_inscripcion = $1 AND activo = TRUE",
      [id]
    );
    
    if (pagos.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la inscripción porque tiene pagos activos asociados" 
      });
    }
    
    // Verificar si hay respuestas activas asociadas a esta inscripción
    const respuestas = await pool.query(
      "SELECT * FROM public.respuesta WHERE id_inscripcion = $1 AND activo = TRUE",
      [id]
    );
    
    if (respuestas.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la inscripción porque tiene respuestas activas asociadas" 
      });
    }
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.inscripcion SET activo = FALSE 
       WHERE id_inscripcion = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Inscripción deshabilitada correctamente",
      inscripcion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al deshabilitar inscripción:", error.message);
    res.status(500).json({ error: "Error al deshabilitar inscripción" });
  }
});

// OPCIONAL: Endpoint para reactivar una inscripción
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la tutoría y estudiante sigan activos
    const inscripcion = await pool.query(
      `SELECT i.*, e.activo as estudiante_activo, t.activo as tutoria_activo
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE i.id_inscripcion = $1`,
      [id]
    );
    
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    
    if (!inscripcion.rows[0].estudiante_activo) {
      return res.status(400).json({ error: "No se puede reactivar: el estudiante está deshabilitado" });
    }
    
    if (!inscripcion.rows[0].tutoria_activo) {
      return res.status(400).json({ error: "No se puede reactivar: la tutoría está deshabilitada" });
    }
    
    const result = await pool.query(
      "UPDATE public.inscripcion SET activo = TRUE WHERE id_inscripcion = $1 RETURNING *",
      [id]
    );

    res.json({ 
      mensaje: "Inscripción reactivada correctamente",
      inscripcion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al reactivar inscripción:", error.message);
    res.status(500).json({ error: "Error al reactivar inscripción" });
  }
});

// GET - Estadísticas de inscripciones (solo activas)
router.get("/estadisticas/resumen", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_inscripciones,
        COUNT(CASE WHEN estado_inscripcion = 'Activa' THEN 1 END) as activas,
        COUNT(CASE WHEN estado_inscripcion = 'Pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado_inscripcion = 'Cancelada' THEN 1 END) as canceladas,
        AVG(cupo_asignado) as promedio_cupo
      FROM public.inscripcion
      WHERE activo = TRUE
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

export default router;