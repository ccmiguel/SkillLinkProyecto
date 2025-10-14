import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las instituciones (solo las activas)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM public.institucion WHERE activo = TRUE ORDER BY id_institucion"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener instituciones:", error.message);
    res.status(500).json({ error: "Error al obtener instituciones" });
  }
});

// GET - Institución por ID (solo si está activa)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.institucion WHERE id_institucion = $1 AND activo = TRUE", 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener institución:", error.message);
    res.status(500).json({ error: "Error al obtener institución" });
  }
});

// POST - Crear institución (se crea como activa por defecto)
router.post("/", async (req, res) => {
  try {
    const { nombre, direccion, telefono, tipo_institucion, horario_atencion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: "El nombre de la institución es requerido" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.institucion (nombre, direccion, telefono, tipo_institucion, horario_atencion, activo) 
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [nombre, direccion, telefono, tipo_institucion, horario_atencion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear institución:", error.message);
    res.status(500).json({ error: "Error al crear institución" });
  }
});

// PUT - Actualizar institución (solo si está activa)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, tipo_institucion, horario_atencion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.institucion 
       SET nombre=$1, direccion=$2, telefono=$3, tipo_institucion=$4, horario_atencion=$5 
       WHERE id_institucion=$6 AND activo = TRUE RETURNING *`,
      [nombre, direccion, telefono, tipo_institucion, horario_atencion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar institución:", error.message);
    res.status(500).json({ error: "Error al actualizar institución" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay aulas activas asociadas a esta institución
    const aulas = await pool.query(
      "SELECT * FROM public.aula WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (aulas.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la institución porque tiene aulas activas asociadas" 
      });
    }
    
    // Verificar si hay tutorías activas asociadas a esta institución
    const tutorias = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutorias.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la institución porque tiene tutorías activas asociadas" 
      });
    }
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.institucion SET activo = FALSE 
       WHERE id_institucion = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Institución deshabilitada correctamente",
      institucion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al deshabilitar institución:", error.message);
    res.status(500).json({ error: "Error al deshabilitar institución" });
  }
});

// OPCIONAL: Endpoint para reactivar una institución
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE public.institucion SET activo = TRUE WHERE id_institucion = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }

    res.json({ 
      mensaje: "Institución reactivada correctamente",
      institucion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al reactivar institución:", error.message);
    res.status(500).json({ error: "Error al reactivar institución" });
  }
});

// GET - Aulas de la institución (solo activas)
router.get("/:id/aulas", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la institución existe y está activa
    const institucion = await pool.query(
      "SELECT * FROM public.institucion WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (institucion.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    const result = await pool.query(
      "SELECT * FROM public.aula WHERE id_institucion = $1 AND activo = TRUE ORDER BY id_aula",
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener aulas de la institución:", error.message);
    res.status(500).json({ error: "Error al obtener aulas de la institución" });
  }
});

// GET - Tutorías de la institución (solo activas)
router.get("/:id/tutorias", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la institución existe y está activa
    const institucion = await pool.query(
      "SELECT * FROM public.institucion WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (institucion.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    const result = await pool.query(
      `SELECT t.*, tu.nombre as tutor_nombre 
       FROM public.tutoria t
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
       WHERE t.id_institucion = $1 AND t.activo = TRUE
       ORDER BY t.id_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutorías de la institución:", error.message);
    res.status(500).json({ error: "Error al obtener tutorías de la institución" });
  }
});

// GET - Estadísticas de la institución
router.get("/:id/estadisticas", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la institución existe y está activa
    const institucion = await pool.query(
      "SELECT * FROM public.institucion WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (institucion.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    const estadisticas = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM public.aula WHERE id_institucion = $1 AND activo = TRUE) as total_aulas,
        (SELECT COUNT(*) FROM public.tutoria WHERE id_institucion = $1 AND activo = TRUE) as total_tutorias,
        (SELECT COUNT(*) FROM public.inscripcion i 
         JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria 
         WHERE t.id_institucion = $1 AND i.activo = TRUE) as total_inscripciones`,
      [id]
    );
    
    res.json(estadisticas.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas de la institución:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas de la institución" });
  }
});

export default router;