import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todos los pagos QR (solo los activos)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             i.id_estudiante, i.estado_inscripcion,
             e.nombre as estudiante_nombre, e.paterno as estudiante_paterno,
             t.nombre_tutoria, t.sigla
      FROM public.pago_qr p
      JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
      WHERE p.activo = TRUE
      ORDER BY p.fecha_de_pago DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos QR:", error.message);
    res.status(500).json({ error: "Error al obtener pagos QR" });
  }
});

// GET - Pago QR por ID (solo si está activo)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, 
              i.id_estudiante, i.estado_inscripcion, i.fecha_inscripcion,
              e.nombre as estudiante_nombre, e.paterno as estudiante_paterno, e.materno as estudiante_materno,
              e.email as estudiante_email, e.celular as estudiante_celular,
              t.nombre_tutoria, t.sigla, t.descripcion_tutoria
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE p.nro_pago = $1 AND p.activo = TRUE`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago QR no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener pago QR:", error.message);
    res.status(500).json({ error: "Error al obtener pago QR" });
  }
});

// GET - Pagos por inscripción (solo activos)
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
      `SELECT p.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE p.id_inscripcion = $1 AND p.activo = TRUE
       ORDER BY p.fecha_de_pago DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos por inscripción:", error.message);
    res.status(500).json({ error: "Error al obtener pagos por inscripción" });
  }
});

// GET - Pagos por estudiante (solo activos)
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
      `SELECT p.*, t.nombre_tutoria, t.sigla, i.fecha_inscripcion
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE i.id_estudiante = $1 AND p.activo = TRUE
       ORDER BY p.fecha_de_pago DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos por estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener pagos por estudiante" });
  }
});

// POST - Crear pago QR (se crea como activo por defecto)
router.post("/", async (req, res) => {
  try {
    const { monto, fecha_de_pago, codigo_qr, id_inscripcion } = req.body;
    
    // Validar campos requeridos
    if (!monto || !id_inscripcion) {
      return res.status(400).json({ error: "Monto e ID de inscripción son requeridos" });
    }
    
    // Verificar si la inscripción existe y está activa
    const inscripcion = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_inscripcion = $1 AND activo = TRUE",
      [id_inscripcion]
    );
    
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada o deshabilitada" });
    }
    
    // Generar código QR automático si no se proporciona
    const codigoQR = codigo_qr || `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(
      `INSERT INTO public.pago_qr (monto, fecha_de_pago, codigo_qr, id_inscripcion, activo) 
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [monto, fecha_de_pago || new Date(), codigoQR, id_inscripcion]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear pago QR:", error.message);
    res.status(500).json({ error: "Error al crear pago QR" });
  }
});

// PUT - Actualizar pago QR (solo si está activo)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, fecha_de_pago, codigo_qr } = req.body;
    
    const result = await pool.query(
      `UPDATE public.pago_qr 
       SET monto=$1, fecha_de_pago=$2, codigo_qr=$3 
       WHERE nro_pago=$4 AND activo = TRUE RETURNING *`,
      [monto, fecha_de_pago, codigo_qr, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago QR no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar pago QR:", error.message);
    res.status(500).json({ error: "Error al actualizar pago QR" });
  }
});

// DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE public.pago_qr SET activo = FALSE 
       WHERE nro_pago = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago QR no encontrado o ya está deshabilitado" });
    }

    res.json({ 
      mensaje: "Pago QR deshabilitado correctamente",
      pago: result.rows[0]
    });
  } catch (error) {
    console.error("Error al deshabilitar pago QR:", error.message);
    res.status(500).json({ error: "Error al deshabilitar pago QR" });
  }
});

// OPCIONAL: Endpoint para reactivar un pago QR
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la inscripción asociada sigue activa
    const pago = await pool.query(
      `SELECT p.*, i.activo as inscripcion_activa
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
       WHERE p.nro_pago = $1`,
      [id]
    );
    
    if (pago.rows.length === 0) {
      return res.status(404).json({ error: "Pago QR no encontrado" });
    }
    
    if (!pago.rows[0].inscripcion_activa) {
      return res.status(400).json({ error: "No se puede reactivar: la inscripción asociada está deshabilitada" });
    }
    
    const result = await pool.query(
      "UPDATE public.pago_qr SET activo = TRUE WHERE nro_pago = $1 RETURNING *",
      [id]
    );

    res.json({ 
      mensaje: "Pago QR reactivado correctamente",
      pago: result.rows[0]
    });
  } catch (error) {
    console.error("Error al reactivar pago QR:", error.message);
    res.status(500).json({ error: "Error al reactivar pago QR" });
  }
});

// GET - Estadísticas de pagos (solo activos)
router.get("/estadisticas/resumen", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_pagos,
        SUM(monto) as total_recaudado,
        AVG(monto) as promedio_pago,
        MIN(monto) as pago_minimo,
        MAX(monto) as pago_maximo,
        COUNT(DISTINCT id_inscripcion) as inscripciones_con_pago
      FROM public.pago_qr
      WHERE activo = TRUE
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas de pagos:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas de pagos" });
  }
});

// GET - Pagos por rango de fechas (solo activos)
router.get("/fechas/:desde/:hasta", async (req, res) => {
  try {
    const { desde, hasta } = req.params;
    const result = await pool.query(
      `SELECT p.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion AND i.activo = TRUE
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
       WHERE p.fecha_de_pago BETWEEN $1 AND $2 AND p.activo = TRUE
       ORDER BY p.fecha_de_pago DESC`,
      [desde, hasta]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos por fecha:", error.message);
    res.status(500).json({ error: "Error al obtener pagos por fecha" });
  }
});

export default router;