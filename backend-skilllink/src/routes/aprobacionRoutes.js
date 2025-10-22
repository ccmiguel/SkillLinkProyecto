import express from 'express';
import aprobacionController from '../controllers/aprobacionController.js';
import { verificarToken, verificarRol } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Solo docentes pueden gestionar inscripciones
router.get('/inscripciones/pendientes', verificarToken, verificarRol([3]), aprobacionController.obtenerInscripcionesPendientes);
router.put('/inscripciones/:id', verificarToken, verificarRol([3]), aprobacionController.gestionarInscripcion);

export default router;