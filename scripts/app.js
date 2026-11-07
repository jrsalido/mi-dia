/* =====================================================================
   app.js — Arranque de la versión móvil y piezas generales
   ---------------------------------------------------------------------
   Pestañas de abajo, pantalla «Hoy», resumen, celebración, nuevo día y
   el modo sin conexión (service worker). Es el último script que se carga.
   ===================================================================== */

let diaCompletoAntes = false; // para celebrar solo cuando se pasa de «no completo» a «completo»
let pestanaActual = 'hoy';

// Vuelve a dibujar todo lo que depende de las tareas
function pintarTodo() {
  pintarCajon();
  pintarHorario();
  actualizarResumen();
  pintarTarjetaAhora();
}

/* ---------------------------------------------------------------------
   Pestañas: Hoy · Cajón · Horario · Foco
   --------------------------------------------------------------------- */
function irAPestana(nombre) {
  pestanaActual = nombre;
  document.querySelectorAll('.pantalla').forEach(pantalla => {
    pantalla.hidden = pantalla.id !== `pantalla-${nombre}`;
  });
  document.querySelectorAll('.pestana').forEach(boton => {
    boton.classList.toggle('activa', boton.dataset.pestana === nombre);
  });
  $('#btn-flotante').hidden = nombre === 'foco';

  if (nombre === 'horario') desplazarHorarioAAhora();
  else window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------------
   Pantalla «Hoy»
   --------------------------------------------------------------------- */
function pintarCabecera() {
  const ahora = new Date();
  $('#fecha-hoy').textContent = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const hora = ahora.getHours();
  let saludo = 'Buenas noches 🌙';
  if (hora >= 6 && hora < 14) saludo = 'Buenos días ☀️';
  else if (hora >= 14 && hora < 21) saludo = 'Buenas tardes 🌤️';
  $('#saludo').textContent = saludo;
}

function actualizarResumen() {
  const programadas = estado.tareas.filter(tarea => tarea.inicio !== null);
  const programadasHechas = programadas.filter(tarea => tarea.hecha).length;
  const rocasEscritas = estado.rocas.filter(roca => roca.texto.trim());
  const rocasHechas = rocasEscritas.filter(roca => roca.hecha).length;

  $('#resumen-tareas').textContent = `${programadasHechas}/${programadas.length}`;
  $('#resumen-rocas').textContent = `${rocasHechas}/${rocasEscritas.length}`;
  $('#resumen-pomodoros').textContent = estado.pomodoro.completadosHoy;
  $('#resumen-foco').textContent = formatearDuracion(estado.pomodoro.minutosFocoHoy);

  const total = programadas.length + rocasEscritas.length;
  const conseguido = programadasHechas + rocasHechas;
  const porcentaje = total ? Math.round((conseguido / total) * 100) : 0;

  $('#progreso-relleno').style.width = `${porcentaje}%`;
  $('#progreso-relleno').classList.toggle('completo', total > 0 && porcentaje === 100);
  $('#progreso-porcentaje').textContent = `${porcentaje} %`;
  $('#progreso-texto').textContent = total
    ? `${conseguido} de ${total} completadas`
    : 'Escribe tus rocas y planifica tu día';
}

// Tarjeta con la tarea de ahora (o la siguiente) y botones rápidos
function pintarTarjetaAhora() {
  const contenedor = $('#tarjeta-ahora');
  contenedor.innerHTML = '';
  const tarjeta = crearElemento('div', 'tarjeta tarjeta-ahora');
  contenedor.append(tarjeta);

  const ahora = minutosDeAhora();
  const programadas = estado.tareas
    .filter(tarea => tarea.inicio !== null)
    .sort((a, b) => a.inicio - b.inicio);
  const pendientes = programadas.filter(tarea => !tarea.hecha);

  if (!programadas.length) {
    tarjeta.innerHTML = '<p class="ahora-vacio">Aún no has puesto nada en tu horario. Apunta tareas en el cajón y dales una hora.</p>';
    const boton = crearElemento('button', 'boton-fantasma ancho-total', '🗓️ Planificar mi día');
    boton.style.width = '100%';
    boton.addEventListener('click', () => irAPestana(estado.tareas.some(t => t.inicio === null) ? 'cajon' : 'horario'));
    tarjeta.append(boton);
    return;
  }

  if (!pendientes.length) {
    tarjeta.classList.add('prioridad-4');
    tarjeta.innerHTML = '<p class="ahora-etiqueta">Todo hecho</p><p class="ahora-titulo">🎉 ¡Has completado todo tu horario!</p>';
    return;
  }

  const actual = pendientes.find(tarea => tarea.inicio <= ahora && ahora < tarea.inicio + tarea.duracion);
  const siguiente = pendientes.find(tarea => tarea.inicio > ahora);
  const tarea = actual || siguiente || pendientes[0];

  let etiqueta = `Pendiente · era a las ${minutosAHora(tarea.inicio)}`;
  if (tarea === actual) etiqueta = `Ahora · hasta las ${minutosAHora(tarea.inicio + tarea.duracion)}`;
  else if (tarea === siguiente) etiqueta = `Siguiente · a las ${minutosAHora(tarea.inicio)} (en ${formatearDuracion(tarea.inicio - ahora)})`;

  tarjeta.classList.add(`prioridad-${tarea.prioridad}`);
  tarjeta.append(
    crearElemento('p', 'ahora-etiqueta', etiqueta),
    crearElemento('p', 'ahora-titulo', tarea.texto),
  );
  tarjeta.querySelector('.ahora-titulo').addEventListener('click', () => abrirFichaTarea(tarea.id));

  const botones = crearElemento('div', 'ahora-botones');
  const botonFoco = crearElemento('button', 'boton-rojo', '🍅 Pomodoro');
  botonFoco.addEventListener('click', () => {
    irAPestana('foco');
    if (estado.pomodoro.modo !== 'foco') cambiarModoPomodoro('foco');
    if (!estado.pomodoro.enMarcha) alternarPomodoro();
  });
  const botonHecha = crearElemento('button', 'boton-fantasma', '✓ Hecha');
  botonHecha.addEventListener('click', () => alternarTareaHecha(tarea.id));
  botones.append(botonFoco, botonHecha);
  tarjeta.append(botones);
}

/* ---------------------------------------------------------------------
   Celebración: todas las tareas del horario están hechas
   --------------------------------------------------------------------- */
function calcularDiaCompleto() {
  const programadas = estado.tareas.filter(tarea => tarea.inicio !== null);
  return programadas.length > 0 && programadas.every(tarea => tarea.hecha);
}

// celebrarSiToca = false cuando el cambio no es un logro (por ejemplo, al borrar una tarea)
function comprobarDiaCompleto(celebrarSiToca = true) {
  const completoAhora = calcularDiaCompleto();
  if (celebrarSiToca && completoAhora && !diaCompletoAntes) celebrarDiaCompleto();
  diaCompletoAntes = completoAhora;
}

function celebrarDiaCompleto() {
  const programadas = estado.tareas.filter(tarea => tarea.inicio !== null);
  const rocasEscritas = estado.rocas.filter(roca => roca.texto.trim());
  const rocasHechas = rocasEscritas.filter(roca => roca.hecha).length;

  let detalle = programadas.length === 1
    ? 'Has completado la tarea de tu horario.'
    : `Has completado las ${programadas.length} tareas de tu horario.`;
  if (rocasEscritas.length) detalle += ` Rocas: ${rocasHechas}/${rocasEscritas.length}.`;
  if (estado.pomodoro.completadosHoy) detalle += ` Pomodoros: ${estado.pomodoro.completadosHoy} 🍅`;

  cerrarHoja();
  $('#celebracion-detalle').textContent = detalle;
  $('#celebracion').hidden = false;
  celebracionGrande();
  if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 160]);
}

function cerrarCelebracion() {
  $('#celebracion').hidden = true;
}

/* ---------------------------------------------------------------------
   Nuevo día
   --------------------------------------------------------------------- */
function nuevoDiaManual() {
  const confirmado = confirm(
    '¿Empezar un nuevo día?\n\n' +
    '• Las tareas sin completar vuelven al cajón.\n' +
    '• Las completadas se archivan.\n' +
    '• Las rocas y los pomodoros se ponen a cero.'
  );
  if (!confirmado) return;
  empezarNuevoDia();
  repintarTodo();
  mostrarAviso('🌅 ¡Nuevo día! Tus pendientes están en el cajón.');
}

function repintarTodo() {
  pintarCabecera();
  pintarRocas();
  pintarPomodoro();
  pintarTodo();
  diaCompletoAntes = calcularDiaCompleto();
}

// Cada 30 segundos (y al volver a la app): hora actual y cambio de día
function revisarHora() {
  pintarCabecera();
  actualizarLineaAhora();
  pintarTarjetaAhora();
  if (comprobarCambioDeDia()) {
    repintarTodo();
    mostrarAviso('🌅 ¡Nuevo día! Tus pendientes están en el cajón.');
  }
}

/* ---------------------------------------------------------------------
   Instalación en el iPhone y modo sin conexión
   --------------------------------------------------------------------- */
function mostrarAvisoInstalar() {
  const esIphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const yaInstalada = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  let cerrado = false;
  try { cerrado = localStorage.getItem('mi-dia-movil-aviso-instalar') === 'cerrado'; } catch (error) { /* sin almacenamiento */ }

  $('#aviso-instalar').hidden = !esIphone || yaInstalada || cerrado;
  $('#btn-cerrar-instalar').addEventListener('click', () => {
    $('#aviso-instalar').hidden = true;
    try { localStorage.setItem('mi-dia-movil-aviso-instalar', 'cerrado'); } catch (error) { /* sin almacenamiento */ }
  });
}

// El service worker guarda una copia de la app para que funcione sin internet.
// Solo funciona en https:// o en localhost (no al abrir el archivo con doble clic).
function registrarModoSinConexion() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(error => console.warn('Sin modo offline:', error));
  }
}

/* ---------------------------------------------------------------------
   ¡Arrancamos!
   --------------------------------------------------------------------- */
function iniciarApp() {
  pintarIconos();
  comprobarCambioDeDia();

  iniciarHojas();
  pintarCabecera();
  pintarRocas();
  iniciarPomodoro();
  iniciarCajon();
  iniciarHorario();
  pintarTodo();
  diaCompletoAntes = calcularDiaCompleto();

  document.querySelectorAll('.pestana').forEach(boton => {
    boton.addEventListener('click', () => irAPestana(boton.dataset.pestana));
  });
  irAPestana('hoy');

  // Botón rojo «+»: lleva al cajón con el teclado listo para escribir
  $('#btn-flotante').addEventListener('click', () => {
    irAPestana('cajon');
    $('#input-tarea').focus();
  });

  $('#btn-nuevo-dia').addEventListener('click', nuevoDiaManual);
  $('#btn-cerrar-celebracion').addEventListener('click', cerrarCelebracion);
  $('#btn-mas-confeti').addEventListener('click', celebracionGrande);
  $('#celebracion').addEventListener('click', evento => {
    if (evento.target.id === 'celebracion') cerrarCelebracion();
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') { cerrarHoja(); cerrarCelebracion(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revisarHora();
  });

  mostrarAvisoInstalar();
  registrarModoSinConexion();
  setInterval(revisarHora, 30 * 1000);
}

iniciarApp();
