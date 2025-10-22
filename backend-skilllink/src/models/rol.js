/*
const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Rol = db.define('rol', {
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre_rol: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    descripcion: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'rol',
    timestamps: true
});

module.exports = Rol;*/