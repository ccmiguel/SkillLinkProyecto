import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las inscripciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, 
             e.nombre as estudiante_nombre, e.paterno as estudiante_paterno, e.email as estudiante_email,
             t.nombre_tutoria, t.sigla, t.cupo as cupo_tutoria,
             tu.nombre as tutor_nombre
      FROM public.inscripcion i
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
      JOIN public.tutor tu ON t.id_tutor = tu.id_tutor
      ORDER BY i.fecha_inscripcion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});

// GET - Inscripción por ID
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
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor
       WHERE i.id_inscripcion = $1`,
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

// GET - Inscripciones por estudiante
router.get("/estudiante/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, t.nombre_tutoria, t.sigla, t.descripcion_tutoria,
              tu.nombre as tutor_nombre, tu.especialidad
       FROM public.inscripcion i
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor
       WHERE i.id_estudiante = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones del estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones del estudiante" });
  }
});

// GET - Inscripciones por tutoria
router.get("/tutoria/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, e.nombre as estudiante_nombre, e.paterno, e.materno, e.email, e.carrera
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       WHERE i.id_tutoria = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones de la tutoría:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones de la tutoría" });
  }
});

// GET - Inscripciones por estado
router.get("/estado/:estado", async (req, res) => {
  try {
    const { estado } = req.params;
    const result = await pool.query(
      `SELECT i.*, e.nombre as estudiante_nombre, t.nombre_tutoria, t.sigla
       FROM public.inscripcion i
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE i.estado_inscripcion = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [estado]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones por estado:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones por estado" });
  }
});

// POST - Crear inscripción
router.post("/", async (req, res) => {
  try {
    const { fecha_inscripcion, estado_inscripcion, cupo_asignado, id_estudiante, id_tutoria } = req.body;
    
    // Validar campos requeridos
    if (!id_estudiante || !id_tutoria) {
      return res.status(400).json({ error: "ID del estudiante y ID de la tutoría son requeridos" });
    }
    
    // Verificar si el estudiante ya está inscrito en esta tutoría
    const inscripcionExistente = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_estudiante = $1 AND id_tutoria = $2",
      [id_estudiante, id_tutoria]
    );
    
    if (inscripcionExistente.rows.length > 0) {
      return res.status(400).json({ error: "El estudiante ya está inscrito en esta tutoría" });
    }
    
    // Verificar cupos disponibles en la tutoría
    const tutoria = await pool.query(
      "SELECT cupo FROM public.tutoria WHERE id_tutoria = $1",
      [id_tutoria]
    );
    
    if (tutoria.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada" });
    }
    
    const cupoTutoria = tutoria.rows[0].cupo;
    const inscripcionesActivas = await pool.query(
      "SELECT COUNT(*) as total FROM public.inscripcion WHERE id_tutoria = $1 AND estado_inscripcion = 'Activa'",
      [id_tutoria]
    );
    
    const totalInscripciones = parseInt(inscripcionesActivas.rows[0].total);
    
    if (totalInscripciones >= cupoTutoria) {
      return res.status(400).json({ error: "No hay cupos disponibles en esta tutoría" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.inscripcion (fecha_inscripcion, estado_inscripcion, cupo_asignado, id_estudiante, id_tutoria) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fecha_inscripcion || new Date(), estado_inscripcion || 'Pendiente', cupo_asignado, id_estudiante, id_tutoria]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear inscripción:", error.message);
    res.status(500).json({ error: "Error al crear inscripción" });
  }
});

// PUT - Actualizar inscripción
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_inscripcion, estado_inscripcion, cupo_asignado } = req.body;
    
    const result = await pool.query(
      `UPDATE public.inscripcion 
       SET fecha_inscripcion=$1, estado_inscripcion=$2, cupo_asignado=$3 
       WHERE id_inscripcion=$4 RETURNING *`,
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

// PATCH - Cambiar estado de inscripción
router.patch("/:id/estado", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_inscripcion } = req.body;
    
    if (!estado_inscripcion) {
      return res.status(400).json({ error: "El estado es requerido" });
    }
    
    const result = await pool.query(
      "UPDATE public.inscripcion SET estado_inscripcion=$1 WHERE id_inscripcion=$2 RETURNING *",
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

// DELETE - Eliminar inscripción
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay pagos asociados a esta inscripción
    const pagos = await pool.query(
      "SELECT * FROM public.pago_qr WHERE id_inscripcion = $1",
      [id]
    );
    
    if (pagos.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar la inscripción porque tiene pagos asociados" 
      });
    }
    
    // Verificar si hay respuestas asociadas a esta inscripción
    const respuestas = await pool.query(
      "SELECT * FROM public.respuesta WHERE id_inscripcion = $1",
      [id]
    );
    
    if (respuestas.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar la inscripción porque tiene respuestas asociadas" 
      });
    }
    
    const result = await pool.query(
      "DELETE FROM public.inscripcion WHERE id_inscripcion = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    res.json({ 
      mensaje: "Inscripción eliminada correctamente",
      inscripcion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar inscripción:", error.message);
    res.status(500).json({ error: "Error al eliminar inscripción" });
  }
});

// GET - Estadísticas de inscripciones
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
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

export default router;