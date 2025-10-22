/*
const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Usuario = db.define('usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    pendiente_aprobacion: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    id_usuario_aprobador: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fecha_solicitud: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    fecha_aprobacion: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'usuario',
    timestamps: true
});

module.exports = Usuario;*/