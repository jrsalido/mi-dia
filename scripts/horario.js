/* =====================================================================
   horario.js — El horario del día (versión móvil)
   ---------------------------------------------------------------------
   - Tocar un hueco vacío → eliges qué tarea del cajón va ahí.
   - Tocar una tarea → se abre su ficha (hora, duración, prioridad…).
   - Mantener pulsada una tarea y deslizar → la mueves de hora.
   Cada hora mide 72 píxeles y todo se ajusta a tramos de 15 minutos.
   ===================================================================== */

const PX_POR_HORA = 72;
const PX_POR_MINUTO = PX_POR_HORA / 60;
const PASO_MINUTOS = 15;
const ESPERA_PULSACION_LARGA = 350; // milisegundos

function minutoInicioDia() { return estado.ajustes.horaInicio * 60; }
function minutoFinDia()    { return estado.ajustes.horaFin * 60; }
function minutoAPixel(minuto) { return (minuto - minutoInicioDia()) * PX_POR_MINUTO; }
function altoRejilla() { return (minutoFinDia() - minutoInicioDia()) * PX_POR_MINUTO; }
function textoRango(inicio, duracion) { return `${minutosAHora(inicio)} – ${minutosAHora(inicio + duracion)}`; }

function iniciarHorario() {
  // Tocar un hueco vacío del horario
  $('#horario-rejilla').addEventListener('click', evento => {
    if (evento.target.closest('.bloque-tarea')) return;
    const caja = $('#horario-rejilla').getBoundingClientRect();
    const minutoTocado = minutoInicioDia() + (evento.clientY - caja.top) / PX_POR_MINUTO;
    const minuto = Math.floor(minutoTocado / PASO_MINUTOS) * PASO_MINUTOS;
    if (minuto < minutoInicioDia() || minuto >= minutoFinDia()) return;
    abrirHojaHueco(minuto);
  });

  $('#btn-ajustes-horario').addEventListener('click', abrirAjustesHorario);

  // En iPhone: mientras mueves una tarea, la página no debe hacer scroll
  document.addEventListener('touchmove', evento => {
    if (movimiento && movimiento.activo) evento.preventDefault();
  }, { passive: false });
}

/* ---------------------------------------------------------------------
   Pintar el horario: líneas de horas, tareas y línea de «ahora»
   --------------------------------------------------------------------- */
function pintarHorario() {
  const rejilla = $('#horario-rejilla');
  rejilla.innerHTML = '';
  rejilla.style.height = `${altoRejilla()}px`;

  const zonaPasada = crearElemento('div', 'zona-pasada');
  zonaPasada.id = 'zona-pasada';
  rejilla.append(zonaPasada);

  for (let hora = estado.ajustes.horaInicio; hora <= estado.ajustes.horaFin; hora++) {
    const linea = crearElemento('div', 'linea-hora');
    linea.style.top = `${minutoAPixel(hora * 60)}px`;
    linea.append(crearElemento('span', 'etiqueta-hora', `${dosCifras(hora)}:00`));
    rejilla.append(linea);

    if (hora < estado.ajustes.horaFin) {
      const mediaHora = crearElemento('div', 'linea-media-hora');
      mediaHora.style.top = `${minutoAPixel(hora * 60 + 30)}px`;
      rejilla.append(mediaHora);
    }
  }

  const capa = crearElemento('div', 'capa-tareas');
  capa.id = 'capa-tareas';
  rejilla.append(capa);

  const programadas = estado.tareas.filter(tarea => tarea.inicio !== null);
  const carriles = calcularCarriles(programadas);
  programadas.forEach(tarea => capa.append(crearBloqueTarea(tarea, carriles.get(tarea.id))));

  const lineaAhora = crearElemento('div', 'linea-ahora');
  lineaAhora.id = 'linea-ahora';
  rejilla.append(lineaAhora);
  actualizarLineaAhora();

  const minutosPlanificados = programadas.reduce((suma, tarea) => suma + tarea.duracion, 0);
  $('#horario-total').textContent = programadas.length
    ? `${formatearDuracion(minutosPlanificados)} planificadas`
    : 'Toca un hueco para empezar';
}

function crearBloqueTarea(tarea, carril = { carril: 0, total: 1 }) {
  const bloque = crearElemento('div', `bloque-tarea prioridad-${tarea.prioridad}`);
  bloque.classList.toggle('hecha', tarea.hecha);
  bloque.classList.toggle('mini', tarea.duracion <= 15);
  bloque.classList.toggle('corta', tarea.duracion > 15 && tarea.duracion <= 30);
  bloque.style.top = `${minutoAPixel(tarea.inicio)}px`;
  bloque.style.height = `${tarea.duracion * PX_POR_MINUTO - 2}px`;
  bloque.style.left = `calc(${(carril.carril / carril.total) * 100}% + 1px)`;
  bloque.style.width = `calc(${100 / carril.total}% - 3px)`;

  bloque.innerHTML = `
    <button class="check" aria-label="Completar">${ICONOS.check}</button>
    <div class="bloque-info">
      <span class="bloque-texto"></span>
      <span class="bloque-hora"></span>
    </div>`;
  bloque.querySelector('.bloque-texto').textContent = tarea.texto;
  bloque.querySelector('.bloque-hora').textContent = textoRango(tarea.inicio, tarea.duracion);

  bloque.querySelector('.check').addEventListener('click', evento => {
    evento.stopPropagation();
    alternarTareaHecha(tarea.id);
  });
  bloque.addEventListener('click', () => {
    if (!ignorarSiguienteClic) abrirFichaTarea(tarea.id);
  });
  bloque.addEventListener('pointerdown', evento => empezarPulsacion(evento, tarea, bloque));
  bloque.addEventListener('contextmenu', evento => evento.preventDefault()); // sin menú al mantener pulsado

  return bloque;
}

function devolverAlCajon(id) {
  const tarea = buscarTarea(id);
  if (!tarea) return;
  tarea.inicio = null;
  guardar();
  pintarTodo();
  comprobarDiaCompleto(false);
  mostrarAviso('↩️ Tarea devuelta al cajón');
}

/* ---------------------------------------------------------------------
   Tareas que se solapan: las repartimos en «carriles» lado a lado.
   Devuelve un mapa id → { carril, total }
   --------------------------------------------------------------------- */
function calcularCarriles(tareas) {
  const resultado = new Map();
  const ordenadas = [...tareas].sort((a, b) => a.inicio - b.inicio || b.duracion - a.duracion);
  let grupo = [];
  let finDeCarril = [];
  let finDelGrupo = -1;

  const cerrarGrupo = () => {
    grupo.forEach(id => { resultado.get(id).total = finDeCarril.length; });
    grupo = [];
    finDeCarril = [];
  };

  for (const tarea of ordenadas) {
    if (tarea.inicio >= finDelGrupo) cerrarGrupo();
    let carril = finDeCarril.findIndex(fin => fin <= tarea.inicio);
    if (carril === -1) {
      carril = finDeCarril.length;
      finDeCarril.push(0);
    }
    finDeCarril[carril] = tarea.inicio + tarea.duracion;
    finDelGrupo = Math.max(finDelGrupo, tarea.inicio + tarea.duracion);
    resultado.set(tarea.id, { carril, total: 1 });
    grupo.push(tarea.id);
  }
  cerrarGrupo();
  return resultado;
}

// Primer hueco libre (de 15 en 15 min) a partir de ahora donde quepa la tarea
function sugerirHueco(duracion) {
  const ocupadas = estado.tareas.filter(tarea => tarea.inicio !== null);
  const estaLibre = minuto => !ocupadas.some(t => minuto < t.inicio + t.duracion && t.inicio < minuto + duracion);
  const desdeAhora = Math.max(minutoInicioDia(), Math.ceil(minutosDeAhora() / PASO_MINUTOS) * PASO_MINUTOS);

  for (const desde of [desdeAhora, minutoInicioDia()]) {
    for (let minuto = desde; minuto + duracion <= minutoFinDia(); minuto += PASO_MINUTOS) {
      if (estaLibre(minuto)) return minuto;
    }
  }
  return minutoInicioDia();
}

/* ---------------------------------------------------------------------
   Mantener pulsada una tarea y deslizar para cambiarla de hora
   --------------------------------------------------------------------- */
let movimiento = null;            // datos del movimiento en curso
let ignorarSiguienteClic = false; // para que soltar no abra la ficha

function empezarPulsacion(evento, tarea, bloque) {
  if (evento.target.closest('button') || movimiento) return;
  if (evento.pointerType === 'mouse' && evento.button !== 0) return;

  movimiento = {
    tarea,
    bloque,
    activo: false,
    xInicial: evento.clientX,
    yInicial: evento.pageY,             // pageY incluye el scroll de la página
    inicioOriginal: tarea.inicio,
    temporizador: setTimeout(activarMovimiento, ESPERA_PULSACION_LARGA),
  };
  window.addEventListener('pointermove', moverBloque);
  window.addEventListener('pointerup', soltarBloque);
  window.addEventListener('pointercancel', cancelarMovimiento);
}

function activarMovimiento() {
  if (!movimiento) return;
  movimiento.activo = true;
  movimiento.bloque.classList.add('levantado');
  document.body.classList.add('moviendo');
  if (navigator.vibrate) navigator.vibrate(15);
}

function moverBloque(evento) {
  if (!movimiento) return;

  // Si el dedo se mueve antes de tiempo, es que quiere hacer scroll
  if (!movimiento.activo) {
    const distancia = Math.hypot(evento.clientX - movimiento.xInicial, evento.pageY - movimiento.yInicial);
    if (distancia > 8) cancelarMovimiento();
    return;
  }

  evento.preventDefault();
  const { tarea, bloque } = movimiento;
  const minutosMovidos = (evento.pageY - movimiento.yInicial) / PX_POR_MINUTO;
  const ultimoPosible = Math.max(minutoInicioDia(), minutoFinDia() - tarea.duracion);
  const nuevoInicio = limitar(redondearA(movimiento.inicioOriginal + minutosMovidos, PASO_MINUTOS), minutoInicioDia(), ultimoPosible);

  if (nuevoInicio !== tarea.inicio) {
    tarea.inicio = nuevoInicio;
    bloque.style.top = `${minutoAPixel(nuevoInicio)}px`;
    bloque.querySelector('.bloque-hora').textContent = textoRango(tarea.inicio, tarea.duracion);
  }

  // Cerca del borde de la pantalla, la página se desplaza sola
  if (evento.clientY > window.innerHeight - 140) window.scrollBy(0, 10);
  else if (evento.clientY < 100) window.scrollBy(0, -10);
}

function soltarBloque() {
  if (!movimiento) return;
  const { activo, tarea, inicioOriginal } = movimiento;
  terminarMovimiento();
  if (!activo) return; // fue un toque normal: lo gestiona el evento «click»

  ignorarSiguienteClic = true;
  setTimeout(() => { ignorarSiguienteClic = false; }, 0);
  guardar();
  pintarTodo();
  if (tarea.inicio !== inicioOriginal) mostrarAviso(`🕘 Movida a las ${minutosAHora(tarea.inicio)}`);
}

function cancelarMovimiento() {
  if (!movimiento) return;
  const { activo, tarea, inicioOriginal } = movimiento;
  terminarMovimiento();
  if (activo) {
    tarea.inicio = inicioOriginal;
    pintarTodo();
  }
}

function terminarMovimiento() {
  clearTimeout(movimiento.temporizador);
  window.removeEventListener('pointermove', moverBloque);
  window.removeEventListener('pointerup', soltarBloque);
  window.removeEventListener('pointercancel', cancelarMovimiento);
  movimiento.bloque.classList.remove('levantado');
  document.body.classList.remove('moviendo');
  movimiento = null;
}

/* ---------------------------------------------------------------------
   Hoja «¿Qué haces a las 10:00?» al tocar un hueco vacío
   --------------------------------------------------------------------- */
function abrirHojaHueco(minuto) {
  // Marcamos el hueco tocado mientras la hoja está abierta
  const marca = crearElemento('div', 'hueco-seleccionado');
  marca.style.top = `${minutoAPixel(minuto)}px`;
  marca.style.height = `${PASO_MINUTOS * PX_POR_MINUTO * 2 - 2}px`;
  $('#horario-rejilla').append(marca);

  const contenido = crearElemento('div');
  contenido.append(
    crearElemento('h3', 'hoja-titulo', `¿Qué haces a las ${minutosAHora(minuto)}?`),
    crearElemento('p', 'hoja-texto', 'Elige una tarea de tu cajón'),
  );

  const pendientes = estado.tareas.filter(tarea => tarea.inicio === null && !tarea.hecha);
  pendientes.forEach(tarea => {
    const opcion = crearElemento('button', `opcion-tarea prioridad-${tarea.prioridad}`);
    opcion.type = 'button';
    opcion.append(
      crearElemento('span', 'opcion-punto'),
      crearElemento('span', 'opcion-texto', tarea.texto),
      crearElemento('span', 'opcion-duracion', formatearDuracion(tarea.duracion)),
    );
    opcion.addEventListener('click', () => {
      tarea.inicio = limitar(minuto, minutoInicioDia(), Math.max(minutoInicioDia(), minutoFinDia() - tarea.duracion));
      guardar();
      cerrarHoja();
      pintarTodo();
      comprobarDiaCompleto();
      mostrarAviso(`📅 A las ${minutosAHora(tarea.inicio)}: ${tarea.texto}`);
    });
    contenido.append(opcion);
  });

  if (!pendientes.length) {
    const vacio = crearElemento('div', 'vacio');
    vacio.innerHTML = '<div class="vacio-emoji">🧺</div><p>No tienes tareas pendientes en el cajón.</p>';
    const boton = crearElemento('button', 'boton-rojo grande', '✏️ Apuntar una tarea');
    boton.addEventListener('click', () => {
      cerrarHoja();
      irAPestana('cajon');
      $('#input-tarea').focus();
    });
    contenido.append(vacio, boton);
  }

  abrirHoja(contenido, () => marca.remove());
}

/* ---------------------------------------------------------------------
   Ajustes: a qué hora empieza y termina el horario
   --------------------------------------------------------------------- */
function abrirAjustesHorario() {
  const contenido = crearElemento('div');
  contenido.innerHTML = `
    <h3 class="hoja-titulo">Horas del horario</h3>
    <p class="hoja-texto">Elige entre qué horas quieres planificar tu día.</p>
    <label class="ajuste-select">Empieza a las <select id="hora-inicio"></select></label>
    <label class="ajuste-select">Termina a las <select id="hora-fin"></select></label>
    <button class="boton-rojo grande" style="margin-top: 22px">Listo</button>`;

  const selectInicio = contenido.querySelector('#hora-inicio');
  const selectFin = contenido.querySelector('#hora-fin');
  for (let hora = 0; hora <= 12; hora++) selectInicio.add(new Option(`${dosCifras(hora)}:00`, hora));
  for (let hora = 13; hora <= 24; hora++) selectFin.add(new Option(`${dosCifras(hora)}:00`, hora));
  selectInicio.value = estado.ajustes.horaInicio;
  selectFin.value = estado.ajustes.horaFin;

  const aplicar = () => cambiarHorasDelHorario(Number(selectInicio.value), Number(selectFin.value));
  selectInicio.addEventListener('change', aplicar);
  selectFin.addEventListener('change', aplicar);
  contenido.querySelector('button').addEventListener('click', cerrarHoja);

  abrirHoja(contenido);
}

function cambiarHorasDelHorario(horaInicio, horaFin) {
  estado.ajustes.horaInicio = horaInicio;
  estado.ajustes.horaFin = horaFin;

  // Las tareas que se quedan fuera del nuevo horario vuelven al cajón
  let devueltas = 0;
  estado.tareas.forEach(tarea => {
    const fuera = tarea.inicio !== null && (tarea.inicio < minutoInicioDia() || tarea.inicio + tarea.duracion > minutoFinDia());
    if (fuera) { tarea.inicio = null; devueltas++; }
  });

  guardar();
  pintarTodo();
  if (devueltas) mostrarAviso(`${devueltas} tarea${devueltas === 1 ? '' : 's'} ha${devueltas === 1 ? '' : 'n'} vuelto al cajón`);
}

/* ---------------------------------------------------------------------
   Línea roja de la hora actual
   --------------------------------------------------------------------- */
function actualizarLineaAhora() {
  const linea = $('#linea-ahora');
  const zonaPasada = $('#zona-pasada');
  if (!linea) return;

  const ahora = minutosDeAhora();
  const posicion = limitar(minutoAPixel(ahora), 0, altoRejilla());
  linea.hidden = ahora < minutoInicioDia() || ahora > minutoFinDia();
  linea.style.top = `${posicion}px`;
  linea.dataset.hora = minutosAHora(ahora);
  zonaPasada.style.height = `${posicion}px`;
}

// Al abrir la pestaña, la página baja sola hasta la hora actual
function desplazarHorarioAAhora() {
  const rejilla = $('#horario-rejilla');
  const ahora = limitar(minutosDeAhora(), minutoInicioDia(), minutoFinDia());
  const destino = rejilla.getBoundingClientRect().top + window.scrollY + minutoAPixel(ahora) - window.innerHeight / 3;
  window.scrollTo(0, Math.max(0, destino));
}
