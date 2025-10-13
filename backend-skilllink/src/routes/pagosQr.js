import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todos los pagos QR
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             i.id_estudiante, i.estado_inscripcion,
             e.nombre as estudiante_nombre, e.paterno as estudiante_paterno,
             t.nombre_tutoria, t.sigla
      FROM public.pago_qr p
      JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
      JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
      JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
      ORDER BY p.fecha_de_pago DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos QR:", error.message);
    res.status(500).json({ error: "Error al obtener pagos QR" });
  }
});

// GET - Pago QR por ID
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
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE p.id_pago = $1`,
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

// GET - Pagos por inscripción
router.get("/inscripcion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE p.id_inscripcion = $1
       ORDER BY p.fecha_de_pago DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos por inscripción:", error.message);
    res.status(500).json({ error: "Error al obtener pagos por inscripción" });
  }
});

// GET - Pagos por estudiante
router.get("/estudiante/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, t.nombre_tutoria, t.sigla, i.fecha_inscripcion
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE i.id_estudiante = $1
       ORDER BY p.fecha_de_pago DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener pagos por estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener pagos por estudiante" });
  }
});

// POST - Crear pago QR
router.post("/", async (req, res) => {
  try {
    const { monto, fecha_de_pago, codigo_qr, id_inscripcion } = req.body;
    
    // Validar campos requeridos
    if (!monto || !id_inscripcion) {
      return res.status(400).json({ error: "Monto e ID de inscripción son requeridos" });
    }
    
    // Verificar si la inscripción existe
    const inscripcion = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_inscripcion = $1",
      [id_inscripcion]
    );
    
    if (inscripcion.rows.length === 0) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    
    // Generar código QR automático si no se proporciona
    const codigoQR = codigo_qr || `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await pool.query(
      `INSERT INTO public.pago_qr (monto, fecha_de_pago, codigo_qr, id_inscripcion) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [monto, fecha_de_pago || new Date(), codigoQR, id_inscripcion]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear pago QR:", error.message);
    res.status(500).json({ error: "Error al crear pago QR" });
  }
});

// PUT - Actualizar pago QR
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, fecha_de_pago, codigo_qr } = req.body;
    
    const result = await pool.query(
      `UPDATE public.pago_qr 
       SET monto=$1, fecha_de_pago=$2, codigo_qr=$3 
       WHERE id_pago=$4 RETURNING *`,
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

// DELETE - Eliminar pago QR
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "DELETE FROM public.pago_qr WHERE id_pago = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pago QR no encontrado" });
    }

    res.json({ 
      mensaje: "Pago QR eliminado correctamente",
      pago: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar pago QR:", error.message);
    res.status(500).json({ error: "Error al eliminar pago QR" });
  }
});

// GET - Estadísticas de pagos
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
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estadísticas de pagos:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas de pagos" });
  }
});

// GET - Pagos por rango de fechas
router.get("/fechas/:desde/:hasta", async (req, res) => {
  try {
    const { desde, hasta } = req.params;
    const result = await pool.query(
      `SELECT p.*, e.nombre as estudiante_nombre, t.nombre_tutoria
       FROM public.pago_qr p
       JOIN public.inscripcion i ON p.id_inscripcion = i.id_inscripcion
       JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE p.fecha_de_pago BETWEEN $1 AND $2
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