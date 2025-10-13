import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todos los tutores
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM public.tutor ORDER BY nombre, apellido_paterno");
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutores:", error.message);
    res.status(500).json({ error: "Error al obtener tutores" });
  }
});

// GET - Tutor por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM public.tutor WHERE id_tutor = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener tutor:", error.message);
    res.status(500).json({ error: "Error al obtener tutor" });
  }
});

// POST - Crear tutor
router.post("/", async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !apellido_paterno || !email) {
      return res.status(400).json({ error: "Nombre, apellido paterno y email son requeridos" });
    }
    
    // Verificar si el email ya existe
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE email = $1",
      [email]
    );
    
    if (tutorExistente.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe un tutor con este email" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.tutor (nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear tutor:", error.message);
    res.status(500).json({ error: "Error al crear tutor" });
  }
});

// PUT - Actualizar tutor
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico } = req.body;
    
    // Verificar que el tutor existe
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1",
      [id]
    );
    
    if (tutorExistente.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    // Verificar si el email ya existe en otro tutor
    if (email && email !== tutorExistente.rows[0].email) {
      const emailExistente = await pool.query(
        "SELECT * FROM public.tutor WHERE email = $1 AND id_tutor != $2",
        [email, id]
      );
      
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "Ya existe otro tutor con este email" });
      }
    }
    
    const result = await pool.query(
      `UPDATE public.tutor 
       SET nombre=$1, apellido_paterno=$2, apellido_materno=$3, celular=$4, email=$5, especialidad=$6, nivel_academico=$7 
       WHERE id_tutor=$8 RETURNING *`,
      [nombre, apellido_paterno, apellido_materno, celular, email, especialidad, nivel_academico, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar tutor:", error.message);
    res.status(500).json({ error: "Error al actualizar tutor" });
  }
});

// PATCH - Actualizar parcialmente tutor
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar que el tutor existe
    const tutorExistente = await pool.query(
      "SELECT * FROM public.tutor WHERE id_tutor = $1",
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
    
    values.push(id);
    
    const query = `UPDATE public.tutor SET ${fields.join(', ')} WHERE id_tutor = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar tutor:", error.message);
    res.status(500).json({ error: "Error al actualizar tutor" });
  }
});

// DELETE - Eliminar tutor
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el tutor tiene tutorías asignadas
    const tutorias = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_tutor = $1",
      [id]
    );
    
    if (tutorias.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el tutor porque tiene tutorías asignadas" 
      });
    }
    
    // Verificar si el tutor tiene actividades asignadas
    const actividades = await pool.query(
      "SELECT * FROM public.actividad WHERE id_tutor = $1",
      [id]
    );
    
    if (actividades.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el tutor porque tiene actividades asignadas" 
      });
    }
    
    // Verificar si el tutor tiene asignaciones
    const asignaciones = await pool.query(
      "SELECT * FROM public.asigna WHERE id_tutor = $1",
      [id]
    );
    
    if (asignaciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el tutor porque tiene asignaciones activas" 
      });
    }
    
    const result = await pool.query(
      "DELETE FROM public.tutor WHERE id_tutor = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }

    res.json({ 
      mensaje: "Tutor eliminado correctamente",
      tutor: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar tutor:", error.message);
    res.status(500).json({ error: "Error al eliminar tutor" });
  }
});

// GET - Buscar tutores por nombre o especialidad
router.get("/buscar/:termino", async (req, res) => {
  try {
    const { termino } = req.params;
    const result = await pool.query(
      `SELECT * FROM public.tutor 
       WHERE nombre ILIKE $1 OR apellido_paterno ILIKE $1 OR especialidad ILIKE $1 
       ORDER BY nombre, apellido_paterno`,
      [`%${termino}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al buscar tutores:", error.message);
    res.status(500).json({ error: "Error al buscar tutores" });
  }
});

// GET - Tutorías del tutor
router.get("/:id/tutorias", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, i.nombre as institucion_nombre
       FROM public.tutoria t
       JOIN public.institucion i ON t.id_institucion = i.id_institucion
       WHERE t.id_tutor = $1
       ORDER BY t.id_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutorías del tutor:", error.message);
    res.status(500).json({ error: "Error al obtener tutorías del tutor" });
  }
});

// GET - Asignaciones del tutor
router.get("/:id/asignaciones", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, t.nombre_tutoria, au.lugar, au.tipo_aula
       FROM public.asigna a
       JOIN public.tutoria t ON a.id_tutoria = t.id_tutoria
       JOIN public.aula au ON a.id_aula = au.id_aula
       WHERE a.id_tutor = $1
       ORDER BY a.dia, a.hora_inicio`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener asignaciones del tutor:", error.message);
    res.status(500).json({ error: "Error al obtener asignaciones del tutor" });
  }
});

// GET - Estadísticas del tutor
router.get("/:id/estadisticas", async (req, res) => {
  try {
    const { id } = req.params;
    
    const estadisticas = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.id_tutoria) as total_tutorias,
        COUNT(DISTINCT a.id_actividad) as total_actividades,
        COUNT(DISTINCT asi.id_tutoria) as total_asignaciones,
        COALESCE(SUM(t.cupo), 0) as total_cupos
       FROM public.tutor tu
       LEFT JOIN public.tutoria t ON tu.id_tutor = t.id_tutor
       LEFT JOIN public.actividad a ON tu.id_tutor = a.id_tutor
       LEFT JOIN public.asigna asi ON tu.id_tutor = asi.id_tutor
       WHERE tu.id_tutor = $1
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