/*
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');

// Rutas de usuarios
router.post('/', usuarioController.crearUsuario);
router.get('/pendientes', verificarToken, usuarioController.obtenerPendientes);
router.put('/:id/aprobar', verificarToken, usuarioController.aprobarUsuario);

module.exports = router;*/

import express from 'express';
import usuarioController from '../controllers/usuarioController.js';
import { verificarToken, verificarRol } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', usuarioController.crearUsuario);
router.get('/pendientes', verificarToken, verificarRol([1, 2, 3]), usuarioController.obtenerPendientes);
router.put('/:id/aprobar', verificarToken, verificarRol([1, 2, 3]), usuarioController.aprobarUsuario);

export default router;