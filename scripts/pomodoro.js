/* =====================================================================
   pomodoro.js — Reloj pomodoro (versión móvil)
   ---------------------------------------------------------------------
   Bloques de foco (25 min) separados por descansos cortos (5 min) y,
   cada 4 pomodoros, un descanso largo (15 min).

   Truco: guardamos la HORA EXACTA en la que termina (finEn). En el
   iPhone, cuando la app pasa a segundo plano el reloj se «duerme», pero
   al volver calcula el tiempo que queda y sigue perfecto.
   ===================================================================== */

const MODOS_POMODORO = {
  foco:          { nombre: 'Foco',           ajuste: 'foco',          alTerminar: '¡Pomodoro completado! 🍅 Tómate un descanso.' },
  descanso:      { nombre: 'Descanso',       ajuste: 'descanso',      alTerminar: 'Se acabó el descanso. ¡A por el siguiente! 💪' },
  descansoLargo: { nombre: 'Descanso largo', ajuste: 'descansoLargo', alTerminar: 'Descanso largo terminado. ¡Con energía renovada! ⚡' },
};

// Mínimo, máximo, de cuánto en cuánto suben los botones − / + y cómo se muestran
const AJUSTES_POMODORO = {
  foco:          { minimo: 1, maximo: 120, salto: 5, unidad: 'min' },
  descanso:      { minimo: 1, maximo: 60,  salto: 1, unidad: 'min' },
  descansoLargo: { minimo: 1, maximo: 60,  salto: 5, unidad: 'min' },
  cadaCuantos:   { minimo: 2, maximo: 10,  salto: 1, unidad: '🍅' },
};

const PERIMETRO_RELOJ = 2 * Math.PI * 90; // el círculo del SVG tiene radio 90
const TITULO_PAGINA = document.title;
let bloqueoPantalla = null;               // para que la pantalla no se apague durante el foco

function duracionDelModo(modo) {
  return estado.ajustes[MODOS_POMODORO[modo].ajuste] * 60 * 1000;
}

function tiempoRestante() {
  const pomodoro = estado.pomodoro;
  return pomodoro.enMarcha ? Math.max(0, pomodoro.finEn - Date.now()) : pomodoro.restanteMs;
}

function iniciarPomodoro() {
  $('#pomo-play').addEventListener('click', alternarPomodoro);
  $('#pomo-reiniciar').addEventListener('click', reiniciarPomodoro);
  $('#pomo-saltar').addEventListener('click', () => terminarPeriodo(false));

  document.querySelectorAll('.modo').forEach(boton => {
    boton.addEventListener('click', () => cambiarModoPomodoro(boton.dataset.modo));
  });

  // Botones − / + de los ajustes
  document.querySelectorAll('.ajuste-fila').forEach(fila => {
    const clave = fila.dataset.ajuste;
    fila.querySelectorAll('[data-paso]').forEach(boton => {
      boton.addEventListener('click', () => {
        const paso = Number(boton.dataset.paso);
        cambiarAjustePomodoro(clave, siguienteValor(estado.ajustes[clave], paso, AJUSTES_POMODORO[clave].salto));
      });
    });
  });

  document.querySelectorAll('[data-preset]').forEach(boton => {
    boton.addEventListener('click', () => {
      const [foco, descanso] = boton.dataset.preset.split('/');
      cambiarAjustePomodoro('foco', foco);
      cambiarAjustePomodoro('descanso', descanso);
      mostrarAviso(`⏱️ Pomodoro de ${foco} min con descanso de ${descanso} min`);
    });
  });

  // Al volver a la app (desde otra app o con la pantalla desbloqueada)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    tictacPomodoro();
    mantenerPantallaEncendida(estado.pomodoro.enMarcha);
  });

  $('#reloj-progreso').style.strokeDasharray = PERIMETRO_RELOJ;
  setInterval(tictacPomodoro, 250);
  pintarPomodoro();
}

// Con salto 5: 25 → 30 → 35… y bajando 5 → 1 (nunca menos que el mínimo)
function siguienteValor(valor, paso, salto) {
  if (salto === 1) return valor + paso;
  return paso > 0
    ? Math.floor(valor / salto) * salto + salto
    : Math.ceil(valor / salto) * salto - salto;
}

// Empezar / pausar
function alternarPomodoro() {
  const pomodoro = estado.pomodoro;
  if (pomodoro.enMarcha) {
    pomodoro.restanteMs = tiempoRestante();
    pomodoro.enMarcha = false;
    pomodoro.finEn = null;
  } else {
    prepararAudio(); // así la campanita podrá sonar al terminar
    pomodoro.finEn = Date.now() + pomodoro.restanteMs;
    pomodoro.enMarcha = true;
  }
  guardar();
  pintarPomodoro();
}

function reiniciarPomodoro() {
  const pomodoro = estado.pomodoro;
  pomodoro.enMarcha = false;
  pomodoro.finEn = null;
  pomodoro.restanteMs = duracionDelModo(pomodoro.modo);
  guardar();
  pintarPomodoro();
}

function cambiarModoPomodoro(modo) {
  estado.pomodoro.modo = modo;
  reiniciarPomodoro();
}

function cambiarAjustePomodoro(clave, valor) {
  const { minimo, maximo } = AJUSTES_POMODORO[clave];
  estado.ajustes[clave] = limitar(parseInt(valor, 10) || minimo, minimo, maximo);
  if (!estado.pomodoro.enMarcha) estado.pomodoro.restanteMs = duracionDelModo(estado.pomodoro.modo);
  guardar();
  pintarPomodoro();
}

// Se ejecuta 4 veces por segundo
function tictacPomodoro() {
  if (!estado.pomodoro.enMarcha) return;
  if (tiempoRestante() <= 0) terminarPeriodo(true);
  else pintarReloj();
}

// completado = true si el tiempo llegó a cero; false si se pulsó «Saltar»
function terminarPeriodo(completado) {
  const pomodoro = estado.pomodoro;
  const modoAnterior = pomodoro.modo;
  let siguiente = 'foco';

  if (modoAnterior === 'foco') {
    if (completado) {
      pomodoro.completadosHoy += 1;
      pomodoro.minutosFocoHoy += estado.ajustes.foco;
    }
    const tocaLargo = completado && pomodoro.completadosHoy % estado.ajustes.cadaCuantos === 0;
    siguiente = tocaLargo ? 'descansoLargo' : 'descanso';
  }

  pomodoro.modo = siguiente;
  pomodoro.enMarcha = false;
  pomodoro.finEn = null;
  pomodoro.restanteMs = duracionDelModo(siguiente);
  guardar();
  pintarPomodoro();
  actualizarResumen();

  if (completado) {
    sonarCampana();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // en los móviles que lo permiten
    mostrarAviso(MODOS_POMODORO[modoAnterior].alTerminar);
    if (modoAnterior === 'foco' && !$('#pantalla-foco').hidden) confetiDesde($('.reloj'), 30);
  }
}

// Pide al móvil que no apague la pantalla mientras el pomodoro está en marcha
async function mantenerPantallaEncendida(activar) {
  try {
    if (activar && !bloqueoPantalla && 'wakeLock' in navigator) {
      bloqueoPantalla = await navigator.wakeLock.request('screen');
      bloqueoPantalla.addEventListener('release', () => { bloqueoPantalla = null; });
    } else if (!activar && bloqueoPantalla) {
      await bloqueoPantalla.release();
      bloqueoPantalla = null;
    }
  } catch (error) {
    bloqueoPantalla = null; // no pasa nada: simplemente la pantalla se apagará como siempre
  }
}

function pintarPomodoro() {
  const pomodoro = estado.pomodoro;
  const tarjeta = $('#pomodoro');
  tarjeta.dataset.modo = pomodoro.modo;
  tarjeta.classList.toggle('en-marcha', pomodoro.enMarcha);

  document.querySelectorAll('.modo').forEach(boton => {
    boton.classList.toggle('activo', boton.dataset.modo === pomodoro.modo);
  });

  $('#pomo-play').innerHTML = pomodoro.enMarcha ? ICONOS.pausa : ICONOS.play;

  const total = pomodoro.completadosHoy;
  $('#tomates').textContent = total
    ? '🍅'.repeat(Math.min(total, 8)) + (total > 8 ? ` +${total - 8}` : '')
    : 'Aún no hay pomodoros hoy';

  document.querySelectorAll('.ajuste-fila').forEach(fila => {
    const clave = fila.dataset.ajuste;
    fila.querySelector('b').textContent = `${estado.ajustes[clave]} ${AJUSTES_POMODORO[clave].unidad}`;
  });

  mantenerPantallaEncendida(pomodoro.enMarcha);
  pintarReloj();
}

// Dibuja los números, el anillo, la pestaña «Foco» y el título
function pintarReloj() {
  const pomodoro = estado.pomodoro;
  const restante = tiempoRestante();
  const total = duracionDelModo(pomodoro.modo);
  const segundos = Math.ceil(restante / 1000);
  const texto = `${dosCifras(Math.floor(segundos / 60))}:${dosCifras(segundos % 60)}`;

  $('#reloj-tiempo').textContent = texto;
  $('#reloj-etiqueta').textContent = MODOS_POMODORO[pomodoro.modo].nombre;

  const fraccion = total ? Math.min(1, restante / total) : 0;
  $('#reloj-progreso').style.strokeDashoffset = PERIMETRO_RELOJ * (1 - fraccion);

  // En la barra de abajo, la pestaña «Foco» muestra la cuenta atrás
  $('#pestana-foco-texto').textContent = pomodoro.enMarcha ? texto : 'Foco';
  document.querySelector('[data-pestana="foco"]').classList.toggle('en-marcha', pomodoro.enMarcha);

  document.title = pomodoro.enMarcha
    ? `${texto} · ${MODOS_POMODORO[pomodoro.modo].nombre} — ${TITULO_PAGINA}`
    : TITULO_PAGINA;
}
