/* =====================================================================
   almacenamiento.js — El «estado» del día y cómo se guarda
   ---------------------------------------------------------------------
   Toda la información de la herramienta vive en un único objeto: estado.
   Cada vez que algo cambia llamamos a guardar() y se queda guardado en
   el navegador (localStorage), así no se pierde al recargar la página.

   Versión móvil: usa el mismo modelo de datos que la versión Mac, pero
   con otra clave de guardado para que nunca se pisen entre ellas.
   ===================================================================== */

const CLAVE_GUARDADO = 'mi-dia-movil-v1';

function crearRocasVacias() {
  return [
    { tipo: 'personal',    texto: '', hecha: false },
    { tipo: 'profesional', texto: '', hecha: false },
    { tipo: 'social',      texto: '', hecha: false },
  ];
}

function crearEstadoInicial() {
  return {
    version: 1,
    fecha: hoyISO(),          // día al que pertenecen los datos
    rocas: crearRocasVacias(),
    // Cada tarea: { id, texto, prioridad (1-4), duracion (min), inicio (min desde 00:00 o null si está en el cajón), hecha }
    tareas: [],
    pomodoro: {
      modo: 'foco',           // 'foco' | 'descanso' | 'descansoLargo'
      enMarcha: false,
      finEn: null,            // momento exacto (ms) en el que termina si está en marcha
      restanteMs: 25 * 60 * 1000,
      completadosHoy: 0,
      minutosFocoHoy: 0,
    },
    ajustes: {
      foco: 25,               // minutos
      descanso: 5,
      descansoLargo: 15,
      cadaCuantos: 4,         // cada cuántos pomodoros toca descanso largo
      horaInicio: 7,          // primera hora del horario
      horaFin: 22,            // última hora del horario
    },
    historial: [],            // resumen de los días anteriores
  };
}

function cargarEstado() {
  const base = crearEstadoInicial();
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_GUARDADO));
    if (!guardado) return base;
    // Mezclamos con el estado inicial por si en una versión nueva hay campos que antes no existían
    return {
      ...base,
      ...guardado,
      ajustes: { ...base.ajustes, ...guardado.ajustes },
      pomodoro: { ...base.pomodoro, ...guardado.pomodoro },
      rocas: Array.isArray(guardado.rocas) && guardado.rocas.length === 3 ? guardado.rocas : base.rocas,
      tareas: Array.isArray(guardado.tareas) ? guardado.tareas : [],
      historial: Array.isArray(guardado.historial) ? guardado.historial : [],
    };
  } catch (error) {
    console.warn('No se pudo leer lo guardado; empiezo de cero.', error);
    return base;
  }
}

// El estado que usan todos los scripts
let estado = cargarEstado();

function guardar() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
  } catch (error) {
    console.warn('No se pudo guardar en este navegador.', error);
  }
}

/* ---------------------------------------------------------------------
   Nuevo día:
   - Se guarda un resumen del día anterior en el historial.
   - Las tareas completadas se archivan (desaparecen de la lista).
   - Las no completadas vuelven al cajón desastre.
   - Las rocas y el contador de pomodoros se ponen a cero.
   --------------------------------------------------------------------- */
function empezarNuevoDia() {
  const hechas = estado.tareas.filter(tarea => tarea.hecha);
  const rocasEscritas = estado.rocas.filter(roca => roca.texto.trim());
  const huboActividad = hechas.length || rocasEscritas.length || estado.pomodoro.completadosHoy;

  if (huboActividad) {
    estado.historial.unshift({
      fecha: estado.fecha,
      tareasHechas: hechas.map(tarea => tarea.texto),
      rocas: rocasEscritas.map(roca => ({ tipo: roca.tipo, texto: roca.texto, hecha: roca.hecha })),
      pomodoros: estado.pomodoro.completadosHoy,
      minutosFoco: estado.pomodoro.minutosFocoHoy,
    });
    estado.historial = estado.historial.slice(0, 60); // guardamos como mucho 60 días
  }

  estado.tareas = estado.tareas
    .filter(tarea => !tarea.hecha)
    .map(tarea => ({ ...tarea, inicio: null }));
  estado.rocas = crearRocasVacias();
  estado.pomodoro.completadosHoy = 0;
  estado.pomodoro.minutosFocoHoy = 0;
  estado.fecha = hoyISO();
  guardar();
}

// Si los datos son de otro día, empieza uno nuevo. Devuelve true si ha cambiado.
function comprobarCambioDeDia() {
  if (estado.fecha === hoyISO()) return false;
  empezarNuevoDia();
  return true;
}
