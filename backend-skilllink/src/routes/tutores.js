import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todos los tutores (solo los activos)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM public.tutor WHERE activo = TRUE ORDER BY nombre, apellido_paterno"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutores:", error.message);
    res.status(500).json({ error: "Error al obtener tutores" });
  }
});

// GET - Tutor por ID (solo si está activo)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE", 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener tutor:", error.message);
    res.status(500).json({ error: "Error al obtener tutor" });
  }
});

// POST - Crear tutor (se crea como activo por defecto)
router.post("/", async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !apellido_paterno || !email) {
      return res.status(400).json({ error: "Nombre, apellido paterno y email son requeridos" });
    }
    
    // Verificar si el email ya existe (solo en tutores activos)
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE email = $1 AND activo = TRUE",
      [email]
    );
    
    if (tutorExistente.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe un tutor activo con este email" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.tutor (nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear tutor:", error.message);
    res.status(500).json({ error: "Error al crear tutor" });
  }
});

// PUT - Actualizar tutor (solo si está activo)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico } = req.body;
    
    // Verificar que el tutor existe y está activo
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutorExistente.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    // Verificar si el email ya existe en otro tutor activo
    if (email && email !== tutorExistente.rows[0].email) {
      const emailExistente = await pool.query(
        "SELECT * FROM public.tutor WHERE email = $1 AND id_tutor != $2 AND activo = TRUE",
        [email, id]
      );
      
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "Ya existe otro tutor activo con este email" });
      }
    }
    
    const result = await pool.query(
      `UPDATE public.tutor 
       SET nombre=$1, apellido_paterno=$2, apellido_materno=$3, celular=$4, email=$5, especialidad=$6, nivel_academico=$7 
       WHERE id_tutor=$8 AND activo = TRUE RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar tutor:", error.message);
    res.status(500).json({ error: "Error al actualizar tutor" });
  }
});

// PATCH - Actualizar parcialmente tutor (solo si está activo)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar que el tutor existe y está activo
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutorExistente.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    // Construir dinámicamente la consulta UPDATE
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (['nombre', 'apellido_paterno', 'apellido_materno', 'celular', 'email', 'especialidad', 'nivel_academico'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: "No hay campos válidos para actualizar" });
    }
    
    // Validar email único si se está actualizando
    if (updates.email && updates.email !== tutorExistente.rows[0].email) {
      const emailExistente = await pool.query(
        "SELECT * FROM public.tutor WHERE email = $1 AND id_tutor != $2 AND activo = TRUE",
        [updates.email, id]
      );
      
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "Ya existe otro tutor activo con este email" });
      }
    }
    
    values.push(id);
    
    const query = `UPDATE public.tutor SET ${fields.join(', ')} WHERE id_tutor = $${paramCount} AND activo = TRUE RETURNING *`;
    const result = await pool.query(query, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar tutor:", error.message);
    res.status(500).json({ error: "Error al actualizar tutor" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el tutor tiene tutorías activas asignadas
    const tutorias = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutorias.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar el tutor porque tiene tutorías activas asignadas" 
      });
    }
    
    // Verificar si el tutor tiene actividades activas asignadas
    const actividades = await pool.query(
      "SELECT * FROM public.actividad WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (actividades.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar el tutor porque tiene actividades activas asignadas" 
      });
    }
    
    // Verificar si el tutor tiene asignaciones activas
    const asignaciones = await pool.query(
      "SELECT * FROM public.asigna WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (asignaciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar el tutor porque tiene asignaciones activas" 
      });
    }
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.tutor SET activo = FALSE 
       WHERE id_tutor = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado o ya está deshabilitado" });
    }

    res.json({ 
      mensaje: "Tutor deshabilitado correctamente",
      tutor: result.rows[0]
    });
  } catch (error) {
    console.error("Error al deshabilitar tutor:", error.message);
    res.status(500).json({ error: "Error al deshabilitar tutor" });
  }
});

// OPCIONAL: Endpoint para reactivar un tutor
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "UPDATE public.tutor SET activo = TRUE WHERE id_tutor = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }

    res.json({ 
      mensaje: "Tutor reactivado correctamente",
      tutor: result.rows[0]
    });
  } catch (error) {
    console.error("Error al reactivar tutor:", error.message);
    res.status(500).json({ error: "Error al reactivar tutor" });
  }
});

// GET - Buscar tutores por nombre o especialidad (solo activos)
router.get("/buscar/:termino", async (req, res) => {
  try {
    const { termino } = req.params;
    const result = await pool.query(
      `SELECT * FROM public.tutor 
       WHERE (nombre ILIKE $1 OR apellido_paterno ILIKE $1 OR especialidad ILIKE $1) 
       AND activo = TRUE
       ORDER BY nombre, apellido_paterno`,
      [`%${termino}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al buscar tutores:", error.message);
    res.status(500).json({ error: "Error al buscar tutores" });
  }
});

// GET - Tutorías del tutor (solo activas)
router.get("/:id/tutorias", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el tutor existe y está activo
    const tutor = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    const result = await pool.query(
      `SELECT t.*, i.nombre as institucion_nombre
       FROM public.tutoria t
       JOIN public.institucion i ON t.id_institucion = i.id_institucion AND i.activo = TRUE
       WHERE t.id_tutor = $1 AND t.activo = TRUE
       ORDER BY t.id_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutorías del tutor:", error.message);
    res.status(500).json({ error: "Error al obtener tutorías del tutor" });
  }
});

// GET - Asignaciones del tutor (solo activas)
router.get("/:id/asignaciones", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el tutor existe y está activo
    const tutor = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    const result = await pool.query(
      `SELECT a.*, t.nombre_tutoria, au.lugar, au.tipo_aula
       FROM public.asigna a
       JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria AND t.activo = TRUE
       JOIN public.aula au ON a.id_aula = au.id_aula AND au.activo = TRUE
       WHERE a.id_tutor = $1 AND a.activo = TRUE
       ORDER BY a.dia, a.hora_inicio`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener asignaciones del tutor:", error.message);
    res.status(500).json({ error: "Error al obtener asignaciones del tutor" });
  }
});

// GET - Estadísticas del tutor (solo datos activos)
router.get("/:id/estadisticas", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el tutor existe y está activo
    const tutor = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    const estadisticas = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.id_tutoria) as total_tutorias,
        COUNT(DISTINCT a.id_actividad) as total_actividades,
        COUNT(DISTINCT asi.id_tutoria) as total_asignaciones,
        COALESCE(SUM(t.cupo), 0) as total_cupos
       FROM public.tutor tu
       LEFT JOIN public.tutoria t ON tu.id_tutor = t.id_tutor AND t.activo = TRUE
       LEFT JOIN public.actividad a ON tu.id_tutor = a.id_tutor AND a.activo = TRUE
       LEFT JOIN public.asigna asi ON tu.id_tutor = asi.id_tutor AND asi.activo = TRUE
       WHERE tu.id_tutor = $1 AND tu.activo = TRUE
       GROUP BY tu.id_tutor`,
      [id]
    );
    
    res.json(estadisticas.rows[0] || {
      total_tutorias: 0,
      total_actividades: 0,
      total_asignaciones: 0,
      total_cupos: 0
    });
  } catch (error) {
    console.error("Error al obtener estadísticas del tutor:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas del tutor" });
  }
});

export default router;