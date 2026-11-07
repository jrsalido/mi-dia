/* =====================================================================
   sonidos.js — Sonidos generados con el propio navegador (Web Audio)
   No hace falta ningún archivo de audio.
   ===================================================================== */

let contextoAudio = null;

// Los navegadores solo dejan sonar audio después de que el usuario
// haga clic en algo; por eso lo «preparamos» al pulsar un botón.
function prepararAudio() {
  try {
    if (!contextoAudio) contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
    if (contextoAudio.state === 'suspended') contextoAudio.resume();
  } catch (error) {
    contextoAudio = null; // el navegador no admite audio: seguimos sin sonido
  }
}

// Toca una nota suave: frecuencia (Hz), retraso y duración (segundos), volumen (0-1)
function tocarNota(frecuencia, retraso, duracion, volumen) {
  if (!contextoAudio) return;
  const inicio = contextoAudio.currentTime + retraso;
  const oscilador = contextoAudio.createOscillator();
  const ganancia = contextoAudio.createGain();

  oscilador.type = 'sine';
  oscilador.frequency.value = frecuencia;
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.02);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

  oscilador.connect(ganancia);
  ganancia.connect(contextoAudio.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracion + 0.05);
}

// Campanita de tres notas: suena al terminar un pomodoro o un descanso
function sonarCampana() {
  prepararAudio();
  tocarNota(784, 0, 1.2, 0.22);     // Sol
  tocarNota(988, 0.18, 1.2, 0.2);   // Si
  tocarNota(1175, 0.36, 1.4, 0.18); // Re
}

// «Plin» corto y alegre al completar una tarea o una roca
function sonarCompletado() {
  prepararAudio();
  tocarNota(880, 0, 0.25, 0.12);
  tocarNota(1320, 0.07, 0.35, 0.1);
}
