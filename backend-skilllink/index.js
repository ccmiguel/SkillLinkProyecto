import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Importar todas las rutas
import tutoriasRouter from "./src/routes/tutorias.js";
import aulasRouter from "./src/routes/aulas.js";
import tutoresRouter from "./src/routes/tutores.js";
import institucionesRouter from "./src/routes/instituciones.js";
import actividadesRouter from "./src/routes/actividades.js";
import estudiantesRouter from "./src/routes/estudiantes.js";
import inscripcionesRouter from "./src/routes/inscripciones.js";
import pagosQrRouter from "./src/routes/pagosQr.js";
import asignaRouter from "./src/routes/asigna.js";
import preguntasRouter from "./src/routes/preguntas.js";
import opcionesRouter from "./src/routes/opciones.js";
import respuestasRouter from "./src/routes/respuestas.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ 
    mensaje: "API SkillLink funcionando 🚀",
    version: "1.0.0",
    endpoints: {
      tutorias: "/tutorias",
      aulas: "/aulas", 
      tutores: "/tutores",
      instituciones: "/instituciones",
      actividades: "/actividades",
      estudiantes: "/estudiantes",
      inscripciones: "/inscripciones",
      pagos: "/pagos",
      asignaciones: "/asigna",
      preguntas: "/preguntas",
      opciones: "/opciones",
      respuestas: "/respuestas"
    }
  });
});

// Configurar todas las rutas
app.use("/tutorias", tutoriasRouter);
app.use("/aulas", aulasRouter);
app.use("/tutores", tutoresRouter);
app.use("/instituciones", institucionesRouter);
app.use("/actividades", actividadesRouter);
app.use("/estudiantes", estudiantesRouter);
app.use("/inscripciones", inscripcionesRouter);
app.use("/pagos", pagosQrRouter);
app.use("/asigna", asignaRouter);
app.use("/preguntas", preguntasRouter);
app.use("/opciones", opcionesRouter);
app.use("/respuestas", respuestasRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📚 Endpoints CRUD completos disponibles:`);
  console.log(`   GET  http://localhost:${PORT}/tutorias`);
  console.log(`   GET  http://localhost:${PORT}/aulas`);
  console.log(`   GET  http://localhost:${PORT}/tutores`);
  console.log(`   GET  http://localhost:${PORT}/instituciones`);
  console.log(`   GET  http://localhost:${PORT}/estudiantes`);
  console.log(`   GET  http://localhost:${PORT}/inscripciones`);
  console.log(`   GET  http://localhost:${PORT}/pagos`);
  console.log(`   GET  http://localhost:${PORT}/asigna`);
  console.log(`   GET  http://localhost:${PORT}/preguntas`);
  console.log(`   GET  http://localhost:${PORT}/opciones`);
  console.log(`   GET  http://localhost:${PORT}/respuestas`);
});