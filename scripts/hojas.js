/* =====================================================================
   hojas.js — Hojas que suben desde abajo (como en las apps de iPhone)
   ---------------------------------------------------------------------
   abrirHoja(contenido) muestra cualquier elemento en la hoja.
   Se cierra tocando el fondo oscuro, deslizando el asa hacia abajo
   o llamando a cerrarHoja().
   También hay piezas reutilizables: filas de chips de duración y prioridad.
   ===================================================================== */

let alCerrarHoja = null;

function abrirHoja(contenido, alCerrar) {
  const zona = $('#hoja-contenido');
  zona.innerHTML = '';
  zona.append(contenido);
  alCerrarHoja = alCerrar || null;

  $('#hoja').scrollTop = 0;
  $('#hoja').classList.add('abierta');
  $('#fondo-hoja').classList.add('visible');
  document.body.classList.add('con-hoja');
}

function cerrarHoja() {
  if (!hojaAbierta()) return;
  const hoja = $('#hoja');
  hoja.classList.remove('abierta');
  hoja.style.transform = '';
  $('#fondo-hoja').classList.remove('visible');
  document.body.classList.remove('con-hoja');

  const funcion = alCerrarHoja;
  alCerrarHoja = null;
  if (funcion) funcion();
}

function hojaAbierta() {
  return $('#hoja').classList.contains('abierta');
}

function iniciarHojas() {
  $('#fondo-hoja').addEventListener('click', cerrarHoja);

  // Deslizar el asa hacia abajo para cerrar
  const asa = $('#hoja-asa');
  const hoja = $('#hoja');
  let yInicial = null;

  asa.addEventListener('pointerdown', evento => {
    yInicial = evento.clientY;
    asa.setPointerCapture(evento.pointerId);
    hoja.style.transition = 'none';
  });
  asa.addEventListener('pointermove', evento => {
    if (yInicial === null) return;
    const bajada = Math.max(0, evento.clientY - yInicial);
    hoja.style.transform = `translateY(${bajada}px)`;
  });
  const soltar = evento => {
    if (yInicial === null) return;
    const bajada = evento.clientY - yInicial;
    yInicial = null;
    hoja.style.transition = '';
    hoja.style.transform = '';
    if (bajada > 80) cerrarHoja();
  };
  asa.addEventListener('pointerup', soltar);
  asa.addEventListener('pointercancel', soltar);
}

/* ---------------------------------------------------------------------
   Piezas reutilizables
   --------------------------------------------------------------------- */

// Fila de «chips» (botones redondeados). Solo uno queda marcado.
// opciones: [{ valor, texto, html, clase }]
function crearFilaChips(opciones, valorActual, alElegir) {
  const fila = crearElemento('div', 'fila-chips');
  opciones.forEach(opcion => {
    const chip = crearElemento('button', `chip ${opcion.clase || ''}`);
    chip.type = 'button';
    chip.dataset.valor = opcion.valor;
    if (opcion.html) chip.innerHTML = opcion.html;
    else chip.textContent = opcion.texto;
    chip.classList.toggle('activo', opcion.valor === valorActual);
    chip.addEventListener('click', () => {
      fila.querySelectorAll('.chip').forEach(otro => otro.classList.remove('activo'));
      chip.classList.add('activo');
      alElegir(opcion.valor);
    });
    fila.append(chip);
  });
  return fila;
}

// 15 → "15 min", 60 → "1 h", 90 → "1 h 30"
function duracionCorta(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto}` : `${horas} h`;
}

function crearChipsDuracion(valorActual, alElegir) {
  const opciones = [15, 30, 45, 60, 90, 120].map(minutos => ({ valor: minutos, texto: duracionCorta(minutos) }));
  return crearFilaChips(opciones, valorActual, alElegir);
}

function crearChipsPrioridad(valorActual, alElegir) {
  const opciones = [1, 2, 3, 4].map(numero => ({
    valor: numero,
    html: `${ICONOS.bandera}P${numero}`,
    clase: `chip-prioridad prioridad-${numero}`,
  }));
  return crearFilaChips(opciones, valorActual, alElegir);
}
