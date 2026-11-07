/* =====================================================================
   confeti.js — Animación de confeti hecha a mano con <canvas>
   ---------------------------------------------------------------------
   Cada trocito de confeti es un objeto con posición, velocidad y giro.
   En cada fotograma lo movemos un poco, le aplicamos «gravedad» y lo
   dibujamos. Cuando ya no se ve, lo quitamos.
   ===================================================================== */

const lienzoConfeti = $('#lienzo-confeti');
const pincelConfeti = lienzoConfeti.getContext('2d');
const COLORES_CONFETI = ['#dc4c3e', '#eb8909', '#fad000', '#299438', '#246fe0', '#884dff', '#e05194', '#14aaf5'];

let piezasConfeti = [];
let confetiAnimandose = false;

// El lienzo ocupa toda la ventana (y se ve nítido en pantallas retina)
function ajustarLienzoConfeti() {
  const ratio = window.devicePixelRatio || 1;
  lienzoConfeti.width = window.innerWidth * ratio;
  lienzoConfeti.height = window.innerHeight * ratio;
  pincelConfeti.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', ajustarLienzoConfeti);
ajustarLienzoConfeti();

/* Lanza confeti desde un punto.
   - direccion: hacia dónde sale, en grados (-90 = hacia arriba)
   - apertura: cuánto se abre el abanico, en grados (360 = en todas direcciones) */
function lanzarConfeti({ x = innerWidth / 2, y = innerHeight / 3, cantidad = 120, fuerza = 12, direccion = -90, apertura = 360 } = {}) {
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = movimientoReducido ? Math.ceil(cantidad / 4) : cantidad;

  for (let i = 0; i < total; i++) {
    const angulo = (direccion + (Math.random() - 0.5) * apertura) * Math.PI / 180;
    const velocidad = fuerza * (0.45 + Math.random() * 0.75);
    piezasConfeti.push({
      x,
      y,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad,
      ancho: 6 + Math.random() * 6,
      alto: 8 + Math.random() * 8,
      giro: Math.random() * Math.PI * 2,
      velocidadGiro: (Math.random() - 0.5) * 0.3,
      color: COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)],
      esCirculo: Math.random() < 0.25,
      fase: Math.random() * Math.PI * 2,
      vida: 0,
    });
  }

  if (!confetiAnimandose) {
    confetiAnimandose = true;
    requestAnimationFrame(animarConfeti);
  }
}

function animarConfeti() {
  pincelConfeti.clearRect(0, 0, innerWidth, innerHeight);

  for (const pieza of piezasConfeti) {
    pieza.vida++;
    pieza.vx *= 0.985;                                    // rozamiento del aire
    pieza.vy = Math.min(pieza.vy * 0.985 + 0.32, 6);      // gravedad (con velocidad máxima)
    pieza.x += pieza.vx + Math.sin(pieza.vida / 12 + pieza.fase) * 0.8; // balanceo
    pieza.y += pieza.vy;
    pieza.giro += pieza.velocidadGiro;

    pincelConfeti.save();
    pincelConfeti.translate(pieza.x, pieza.y);
    pincelConfeti.rotate(pieza.giro);
    pincelConfeti.scale(1, Math.cos(pieza.vida / 8 + pieza.fase)); // efecto de dar vueltas
    pincelConfeti.globalAlpha = pieza.vida > 220 ? Math.max(0, 1 - (pieza.vida - 220) / 60) : 1;
    pincelConfeti.fillStyle = pieza.color;
    if (pieza.esCirculo) {
      pincelConfeti.beginPath();
      pincelConfeti.arc(0, 0, pieza.ancho / 2, 0, Math.PI * 2);
      pincelConfeti.fill();
    } else {
      pincelConfeti.fillRect(-pieza.ancho / 2, -pieza.alto / 2, pieza.ancho, pieza.alto);
    }
    pincelConfeti.restore();
  }

  // Quitamos las piezas que ya han caído o que llevan mucho rato
  piezasConfeti = piezasConfeti.filter(pieza => pieza.y < innerHeight + 30 && pieza.vida < 280);

  if (piezasConfeti.length) {
    requestAnimationFrame(animarConfeti);
  } else {
    confetiAnimandose = false;
    pincelConfeti.clearRect(0, 0, innerWidth, innerHeight);
  }
}

// Confeti pequeño que sale de un elemento (por ejemplo, el check de una roca)
function confetiDesde(elemento, cantidad = 40) {
  const caja = elemento.getBoundingClientRect();
  lanzarConfeti({
    x: caja.left + caja.width / 2,
    y: caja.top + caja.height / 2,
    cantidad,
    fuerza: 9,
    direccion: -90,
    apertura: 160,
  });
}

// La gran celebración: cañones desde las dos esquinas de abajo + explosión central
function celebracionGrande() {
  lanzarConfeti({ x: 0, y: innerHeight, cantidad: 140, fuerza: 26, direccion: -60, apertura: 40 });
  lanzarConfeti({ x: innerWidth, y: innerHeight, cantidad: 140, fuerza: 26, direccion: -120, apertura: 40 });
  setTimeout(() => lanzarConfeti({ x: innerWidth / 2, y: innerHeight * 0.35, cantidad: 160, fuerza: 14 }), 400);
}
