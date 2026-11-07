/* =====================================================================
   tareas.js — Cajón desastre y ficha de cada tarea (versión móvil)
   ---------------------------------------------------------------------
   En el móvil no arrastramos del cajón al horario (están en pestañas
   distintas). En su lugar: tocas una tarea → se abre su ficha → eliges
   la hora → «Poner a las 09:00».

   Una tarea está «en el cajón» cuando su inicio es null, y «en el
   horario» cuando inicio tiene los minutos desde las 00:00 (540 = 09:00).
   ===================================================================== */

const DURACION_POR_DEFECTO = 30; // minutos
const NOMBRES_PRIORIDAD = {
  1: 'Prioridad 1 · urgente',
  2: 'Prioridad 2 · alta',
  3: 'Prioridad 3 · media',
  4: 'Prioridad 4 · normal',
};
const TAREAS_DE_EJEMPLO = [
  'Preparar la clase de Claude Code p1 1h30',
  'Responder correos importantes p2 30m',
  'Revisar el presupuesto del mes p2 1h',
  'Salir a caminar p3 45m',
  'Llamar al dentista 15m',
];

// Prioridad y duración elegidas con los chips al escribir una tarea nueva
let opcionesNuevaTarea = { prioridad: 4, duracion: DURACION_POR_DEFECTO };

function iniciarCajon() {
  const formulario = $('#form-tarea');
  const campo = $('#input-tarea');
  const boton = $('#btn-anadir');

  // Los chips aparecen cuando empiezas a escribir
  campo.addEventListener('input', () => {
    const hayTexto = Boolean(campo.value.trim());
    boton.disabled = !hayTexto;
    formulario.classList.toggle('con-texto', hayTexto);
  });

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    if (!campo.value.trim()) return;
    anadirTarea(campo.value, opcionesNuevaTarea);
    campo.value = '';
    boton.disabled = true;
    formulario.classList.remove('con-texto');
    opcionesNuevaTarea = { prioridad: 4, duracion: DURACION_POR_DEFECTO };
    pintarChipsNuevaTarea();
    campo.focus(); // el teclado sigue abierto para apuntar otra
  });

  pintarChipsNuevaTarea();
}

function pintarChipsNuevaTarea() {
  const prioridad = $('#chips-prioridad-nueva');
  const duracion = $('#chips-duracion-nueva');
  prioridad.innerHTML = '';
  duracion.innerHTML = '';
  prioridad.append(crearChipsPrioridad(opcionesNuevaTarea.prioridad, valor => { opcionesNuevaTarea.prioridad = valor; }));
  duracion.append(crearChipsDuracion(opcionesNuevaTarea.duracion, valor => { opcionesNuevaTarea.duracion = valor; }));
}

/* ---------------------------------------------------------------------
   Atajos dentro del texto (como en Todoist):
     «p1» … «p4» → prioridad · «45m», «1h», «1h30» → duración
   Si escribes un atajo, gana al chip elegido.
   --------------------------------------------------------------------- */
function interpretarTextoTarea(textoEscrito) {
  let texto = ` ${textoEscrito} `;
  let prioridad = null;
  let duracion = null;

  texto = texto.replace(/\s[pP]([1-4])(?=\s)/, (_, numero) => {
    prioridad = Number(numero);
    return ' ';
  });

  texto = texto.replace(/\s(\d{1,2})\s?h(?:\s?(\d{1,2})\s?(?:m|min)?)?(?=\s)/i, (_, horas, minutos) => {
    duracion = Number(horas) * 60 + Number(minutos || 0);
    return ' ';
  });

  if (duracion === null) {
    texto = texto.replace(/\s(\d{1,3})\s?(?:m|min|mins|minutos)(?=\s)/i, (_, minutos) => {
      duracion = Number(minutos);
      return ' ';
    });
  }

  if (duracion !== null) duracion = limitar(redondearA(duracion, 15), 15, 8 * 60);

  texto = texto.replace(/\s+/g, ' ').trim();
  return { texto: texto || textoEscrito.trim(), prioridad, duracion };
}

function anadirTarea(textoEscrito, opciones = {}) {
  const datos = interpretarTextoTarea(textoEscrito);
  if (!datos.texto) return null;

  const tarea = {
    id: crearId(),
    texto: datos.texto,
    prioridad: datos.prioridad ?? opciones.prioridad ?? 4,
    duracion: datos.duracion ?? opciones.duracion ?? DURACION_POR_DEFECTO,
    inicio: null,
    hecha: false,
  };
  estado.tareas.push(tarea);
  guardar();
  pintarTodo();
  return tarea;
}

function cargarTareasDeEjemplo() {
  TAREAS_DE_EJEMPLO.forEach(texto => anadirTarea(texto));
  mostrarAviso('✨ Toca una tarea para ponerle hora');
}

function buscarTarea(id) {
  return estado.tareas.find(tarea => tarea.id === id);
}

/* ---------------------------------------------------------------------
   Acciones (las usan el cajón, el horario y la pantalla Hoy)
   --------------------------------------------------------------------- */
function alternarTareaHecha(id) {
  const tarea = buscarTarea(id);
  if (!tarea) return;
  tarea.hecha = !tarea.hecha;
  if (tarea.hecha) sonarCompletado();
  guardar();
  pintarTodo();
  comprobarDiaCompleto();
}

function borrarTarea(id) {
  const posicion = estado.tareas.findIndex(tarea => tarea.id === id);
  if (posicion === -1) return;

  const [borrada] = estado.tareas.splice(posicion, 1);
  guardar();
  pintarTodo();
  comprobarDiaCompleto(false);

  mostrarAviso('Tarea borrada', {
    texto: 'Deshacer',
    alPulsar: () => {
      estado.tareas.splice(posicion, 0, borrada);
      guardar();
      pintarTodo();
      comprobarDiaCompleto(false);
    },
  });
}

// En el móvil usamos la ventanita nativa del iPhone para cambiar el nombre
function renombrarTarea(id) {
  const tarea = buscarTarea(id);
  if (!tarea) return;
  const nuevo = prompt('Nombre de la tarea', tarea.texto);
  if (nuevo === null) return;
  const datos = interpretarTextoTarea(nuevo);
  if (!datos.texto) return;
  tarea.texto = datos.texto;
  if (datos.prioridad) tarea.prioridad = datos.prioridad;
  if (datos.duracion) tarea.duracion = datos.duracion;
  guardar();
  pintarTodo();
}

/* ---------------------------------------------------------------------
   Pintar el cajón
   --------------------------------------------------------------------- */
function pintarCajon() {
  const lista = $('#lista-cajon');
  lista.innerHTML = '';

  const enCajon = estado.tareas.filter(tarea => tarea.inicio === null);
  const pendientes = enCajon.filter(tarea => !tarea.hecha);
  const hechas = enCajon.filter(tarea => tarea.hecha);

  if (!enCajon.length) lista.append(crearCajonVacio());
  [...pendientes, ...hechas].forEach(tarea => lista.append(crearFilaTarea(tarea)));

  // Numerito rojo en la pestaña «Cajón»
  const insignia = $('#insignia-cajon');
  insignia.hidden = !pendientes.length;
  insignia.textContent = pendientes.length;
}

function crearCajonVacio() {
  const vacio = crearElemento('li', 'vacio');
  vacio.innerHTML = `
    <div class="vacio-emoji">🧺</div>
    <p><strong>Tu cajón está vacío</strong></p>
    <p>Apunta arriba todo lo que tengas que hacer.</p>
    <button class="boton-enlace">✨ Cargar tareas de ejemplo</button>`;
  vacio.querySelector('button').addEventListener('click', cargarTareasDeEjemplo);
  return vacio;
}

function crearFilaTarea(tarea) {
  const fila = crearElemento('li', `tarea prioridad-${tarea.prioridad}`);
  fila.classList.toggle('hecha', tarea.hecha);

  fila.innerHTML = `
    <button class="check" aria-label="Completar">${ICONOS.check}</button>
    <div class="tarea-cuerpo">
      <div class="tarea-texto"></div>
      <div class="tarea-meta"><span>${ICONOS.reloj}<span class="meta-duracion"></span></span></div>
    </div>
    <span class="tarea-flecha">${ICONOS.flecha}</span>`;

  // Los textos escritos por el usuario siempre con textContent (es lo seguro)
  fila.querySelector('.tarea-texto').textContent = tarea.texto;
  fila.querySelector('.meta-duracion').textContent = formatearDuracion(tarea.duracion);
  if (tarea.prioridad < 4) {
    const etiqueta = crearElemento('span', 'meta-prioridad');
    etiqueta.innerHTML = `${ICONOS.bandera}P${tarea.prioridad}`;
    fila.querySelector('.tarea-meta').append(etiqueta);
  }

  fila.querySelector('.check').addEventListener('click', evento => {
    evento.stopPropagation();
    alternarTareaHecha(tarea.id);
  });
  fila.addEventListener('click', () => abrirFichaTarea(tarea.id));
  return fila;
}

/* ---------------------------------------------------------------------
   Ficha de una tarea (hoja que sube desde abajo)
   - Si está en el cajón: eliges hora y pulsas «Poner a las…»
   - Si ya está en el horario: los cambios se aplican al momento
   --------------------------------------------------------------------- */
function abrirFichaTarea(id) {
  const tarea = buscarTarea(id);
  if (!tarea) return;

  const enHorario = tarea.inicio !== null;
  let hora = enHorario ? tarea.inicio : sugerirHueco(tarea.duracion);

  const ficha = crearElemento('div', 'ficha');
  ficha.innerHTML = `
    <div class="ficha-cabecera">
      <button class="check" aria-label="Completar">${ICONOS.check}</button>
      <div><h3 class="ficha-titulo"></h3><p class="ficha-subtitulo"></p></div>
    </div>
    <div class="ficha-seccion">
      <h4>¿A qué hora?</h4>
      <div class="selector-hora">
        <button type="button" data-mover="-15" aria-label="15 minutos antes">${ICONOS.menos}</button>
        <b class="hora-elegida"></b>
        <button type="button" data-mover="15" aria-label="15 minutos después">${ICONOS.mas}</button>
      </div>
      <div class="zona-horas"></div>
    </div>
    <div class="ficha-seccion"><h4>¿Cuánto dura?</h4><div class="zona-duracion"></div></div>
    <div class="ficha-seccion"><h4>Prioridad</h4><div class="zona-prioridad"></div></div>
    <button class="boton-rojo grande boton-principal"></button>
    <div class="ficha-acciones"></div>`;

  // Ajusta la hora para que la tarea no se salga del horario
  const horaValida = minutos => limitar(minutos, minutoInicioDia(), Math.max(minutoInicioDia(), minutoFinDia() - tarea.duracion));

  // Vuelve a escribir los textos de la ficha con los datos actuales
  const refrescar = () => {
    const cabecera = ficha.querySelector('.ficha-cabecera');
    cabecera.className = `ficha-cabecera prioridad-${tarea.prioridad}${tarea.hecha ? ' hecha' : ''}`;
    ficha.querySelector('.ficha-titulo').textContent = tarea.texto;
    ficha.querySelector('.ficha-subtitulo').textContent = tarea.inicio !== null
      ? `En tu horario · ${textoRango(tarea.inicio, tarea.duracion)}`
      : `En el cajón · ${formatearDuracion(tarea.duracion)}`;
    ficha.querySelector('.hora-elegida').textContent = minutosAHora(hora);
    ficha.querySelectorAll('.zona-horas .chip').forEach(chip => {
      chip.classList.toggle('activo', Number(chip.dataset.valor) === hora);
    });
    ficha.querySelector('.boton-principal').textContent = tarea.inicio !== null ? 'Listo' : `📅 Poner a las ${minutosAHora(hora)}`;
  };

  // Cambiar la hora (si ya está en el horario, se mueve al momento)
  const cambiarHora = minutos => {
    hora = horaValida(minutos);
    if (tarea.inicio !== null) {
      tarea.inicio = hora;
      guardar();
      pintarTodo();
    }
    refrescar();
  };

  ficha.querySelectorAll('[data-mover]').forEach(boton => {
    boton.addEventListener('click', () => cambiarHora(hora + Number(boton.dataset.mover)));
  });

  // Chips con las horas en punto (07:00, 08:00…)
  const horas = [];
  for (let h = estado.ajustes.horaInicio; h < estado.ajustes.horaFin; h++) horas.push({ valor: h * 60, texto: `${dosCifras(h)}:00` });
  const filaHoras = crearFilaChips(horas, hora, cambiarHora);
  ficha.querySelector('.zona-horas').append(filaHoras);

  ficha.querySelector('.zona-duracion').append(crearChipsDuracion(tarea.duracion, minutos => {
    tarea.duracion = minutos;
    hora = horaValida(hora);
    if (tarea.inicio !== null) tarea.inicio = hora;
    guardar();
    pintarTodo();
    refrescar();
  }));

  ficha.querySelector('.zona-prioridad').append(crearChipsPrioridad(tarea.prioridad, numero => {
    tarea.prioridad = numero;
    guardar();
    pintarTodo();
    refrescar();
  }));

  ficha.querySelector('.ficha-cabecera .check').addEventListener('click', () => {
    alternarTareaHecha(tarea.id);
    refrescar();
  });

  ficha.querySelector('.boton-principal').addEventListener('click', () => {
    if (tarea.inicio === null) {
      tarea.inicio = horaValida(hora);
      guardar();
      pintarTodo();
      comprobarDiaCompleto();
      mostrarAviso(`📅 A las ${minutosAHora(tarea.inicio)}: ${tarea.texto}`);
    }
    cerrarHoja();
  });

  // Botones de abajo: devolver al cajón, renombrar, borrar
  const acciones = ficha.querySelector('.ficha-acciones');
  if (enHorario) {
    acciones.append(crearBotonAccion('volver', 'Al cajón', () => { cerrarHoja(); devolverAlCajon(tarea.id); }));
  }
  acciones.append(crearBotonAccion('lapiz', 'Renombrar', () => { renombrarTarea(tarea.id); refrescar(); }));
  const botonBorrar = crearBotonAccion('papelera', 'Borrar', () => { cerrarHoja(); borrarTarea(tarea.id); });
  botonBorrar.classList.add('boton-peligro');
  acciones.append(botonBorrar);

  refrescar();
  abrirHoja(ficha);

  // Deja visible en la fila de chips la hora en punto más cercana
  const horaEnPunto = Math.floor(hora / 60) * 60;
  const chipCercano = filaHoras.querySelector(`.chip[data-valor="${horaEnPunto}"]`);
  if (chipCercano) filaHoras.scrollLeft = chipCercano.offsetLeft - filaHoras.clientWidth / 2;
}

function crearBotonAccion(icono, texto, alPulsar) {
  const boton = crearElemento('button', 'boton-fantasma');
  boton.type = 'button';
  boton.innerHTML = ICONOS[icono];
  boton.append(texto);
  boton.addEventListener('click', alPulsar);
  return boton;
}
