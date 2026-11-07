/* =====================================================================
   utilidades.js — Funciones pequeñas que usan todos los bloques
   ===================================================================== */

// Busca un elemento de la página. Ejemplo: $('#rocas')
function $(selector) {
  return document.querySelector(selector);
}

// Crea un elemento HTML con una clase y, si quieres, un texto.
// Ejemplo: crearElemento('span', 'etiqueta', 'Hola')
function crearElemento(etiqueta, clase = '', texto = '') {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

// 7 → "07"
function dosCifras(numero) {
  return String(numero).padStart(2, '0');
}

// Fecha de hoy en formato "2026-11-07" (sirve para saber si ha cambiado el día)
function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${dosCifras(hoy.getMonth() + 1)}-${dosCifras(hoy.getDate())}`;
}

// Minutos que han pasado desde las 00:00. Ejemplo: a las 09:30 → 570
function minutosDeAhora() {
  const ahora = new Date();
  return ahora.getHours() * 60 + ahora.getMinutes();
}

// 570 → "09:30"
function minutosAHora(minutos) {
  return `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`;
}

// 90 → "1 h 30 min"
function formatearDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// Identificador único para cada tarea
function crearId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Redondea al múltiplo más cercano. Ejemplo: redondearA(22, 15) → 15
function redondearA(valor, paso) {
  return Math.round(valor / paso) * paso;
}

// Mantiene un número entre un mínimo y un máximo
function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

/* ---------------------------------------------------------------------
   Avisos: mensajes pequeños que aparecen abajo y se van solos.
   Opcionalmente llevan un botón (por ejemplo «Deshacer»).
   --------------------------------------------------------------------- */
let temporizadorAviso = null;

function mostrarAviso(texto, accion) {
  const aviso = $('#aviso');
  aviso.innerHTML = '';
  aviso.append(crearElemento('span', '', texto));

  if (accion) {
    const boton = crearElemento('button', '', accion.texto);
    boton.addEventListener('click', () => {
      accion.alPulsar();
      ocultarAviso();
    });
    aviso.append(boton);
  }

  aviso.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(ocultarAviso, accion ? 5000 : 3000);
}

function ocultarAviso() {
  $('#aviso').classList.remove('visible');
}

/* ---------------------------------------------------------------------
   Iconos SVG (dibujados a mano, sin librerías)
   --------------------------------------------------------------------- */
function iconoDeLinea(dibujo, grosor = 2) {
  return `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dibujo}</svg>`;
}

function iconoRelleno(dibujo) {
  return `<svg class="icono" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${dibujo}</svg>`;
}

const ICONOS = {
  check:     iconoDeLinea('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  mas:       iconoDeLinea('<path d="M12 5v14M5 12h14"/>'),
  bandera:   iconoDeLinea('<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>'),
  papelera:  iconoDeLinea('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  reloj:     iconoDeLinea('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  volver:    iconoDeLinea('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  ajustes:   iconoDeLinea('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  sol:       iconoDeLinea('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  reiniciar: iconoDeLinea('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>'),
  play:      iconoRelleno('<path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.5-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z"/>'),
  pausa:     iconoRelleno('<rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/>'),
  saltar:    iconoRelleno('<path d="M5 6v12a.8.8 0 0 0 1.2.7l9-6a.8.8 0 0 0 0-1.4l-9-6A.8.8 0 0 0 5 6z"/><rect x="16.5" y="5" width="3" height="14" rx="1"/>'),
  asa:       iconoRelleno('<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>'),
  // Iconos extra de la versión móvil
  bandeja:    iconoDeLinea('<path d="M3.5 13.5l2.6-7.6A2 2 0 0 1 8 4.5h8a2 2 0 0 1 1.9 1.4l2.6 7.6"/><path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5h-5l-1.5 2.5h-4l-1.5-2.5z"/>'),
  calendario: iconoDeLinea('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  foco:       iconoDeLinea('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M10 2.5h4M18.5 6l1.5-1.5"/>'),
  lapiz:      iconoDeLinea('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  flecha:     iconoDeLinea('<path d="M9 6l6 6-6 6"/>'),
  menos:      iconoDeLinea('<path d="M5 12h14"/>'),
};

// Rellena con su icono todos los elementos del HTML que tengan data-icono="nombre"
function pintarIconos() {
  document.querySelectorAll('[data-icono]').forEach(elemento => {
    elemento.insertAdjacentHTML('afterbegin', ICONOS[elemento.dataset.icono] || '');
  });
}
