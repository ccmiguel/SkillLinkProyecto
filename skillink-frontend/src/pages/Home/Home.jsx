import React from 'react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header className="hero-section">
        <h1>Bienvenido a Skillink</h1>
        <p>Plataforma educativa integral para el aprendizaje personalizado</p>
      </header>

      <section className="mission-vision">
        <div className="card">
          <h2>Misión</h2>
          <p>
            En Skillink nos dedicamos a transformar la educación mediante 
            tecnología innovadora que conecta a estudiantes y tutores, 
            facilitando un aprendizaje personalizado, accesible y de calidad 
            que impulse el desarrollo académico y profesional de nuestra comunidad.
          </p>
        </div>

        <div className="card">
          <h2>Visión</h2>
          <p>
            Ser la plataforma líder en educación personalizada en Latinoamérica, 
            reconocida por nuestra capacidad de conectar talento con conocimiento, 
            rompiendo barreras geográficas y socioeconómicas para construir 
            un futuro donde cada persona pueda alcanzar su máximo potencial educativo.
          </p>
        </div>
      </section>

      <section className="features">
        <h2>¿Qué ofrece Skillink?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>👨‍🏫 Tutorías Personalizadas</h3>
            <p>Conecta con tutores especializados en diversas áreas</p>
          </div>
          <div className="feature-card">
            <h3>📚 Gestión Educativa</h3>
            <p>Administra instituciones, aulas y actividades eficientemente</p>
          </div>
          <div className="feature-card">
            <h3>💳 Sistema de Pagos</h3>
            <p>Proceso seguro y transparente de pagos en línea</p>
          </div>
          <div className="feature-card">
            <h3>📊 Seguimiento Integral</h3>
            <p>Monitorea el progreso y rendimiento académico</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;