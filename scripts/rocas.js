/* =====================================================================
   rocas.js — Las 3 rocas del día (versión móvil)
   ---------------------------------------------------------------------
   Las «rocas» son lo verdaderamente importante del día: una personal,
   una profesional y una social. Puedes escribir entre 1 y 3.
   ===================================================================== */

const TIPOS_DE_ROCA = {
  personal:    { nombre: 'Roca personal',    emoji: '🏡', ejemplo: 'Ej.: salir a correr' },
  profesional: { nombre: 'Roca profesional', emoji: '💼', ejemplo: 'Ej.: terminar la propuesta' },
  social:      { nombre: 'Roca social',      emoji: '🤝', ejemplo: 'Ej.: llamar a mi madre' },
};

function pintarRocas() {
  const contenedor = $('#rocas');
  contenedor.innerHTML = '';
  estado.rocas.forEach(roca => contenedor.append(crearTarjetaRoca(roca)));
}

function crearTarjetaRoca(roca) {
  const tipo = TIPOS_DE_ROCA[roca.tipo];
  const tarjeta = crearElemento('article', 'roca');
  tarjeta.classList.toggle('hecha', roca.hecha);

  tarjeta.innerHTML = `
    <span class="roca-emoji">${tipo.emoji}</span>
    <div class="roca-cuerpo">
      <div class="roca-tipo">${tipo.nombre}</div>
      <input class="roca-texto" type="text" maxlength="80" enterkeyhint="done">
    </div>
    <button class="check" aria-label="Marcar como conseguida">${ICONOS.check}</button>`;

  // El texto lo ponemos con .value (nunca dentro del HTML) para que sea seguro
  const campo = tarjeta.querySelector('.roca-texto');
  campo.value = roca.texto;
  campo.placeholder = tipo.ejemplo;
  campo.readOnly = roca.hecha;

  campo.addEventListener('input', () => {
    roca.texto = campo.value;
    guardar();
    actualizarResumen();
  });
  campo.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') campo.blur(); // «OK» en el teclado del iPhone
  });

  tarjeta.querySelector('.check').addEventListener('click', evento => alternarRoca(roca, evento.currentTarget, campo));
  return tarjeta;
}

function alternarRoca(roca, botonCheck, campo) {
  if (!roca.texto.trim()) {
    mostrarAviso('✍️ Escribe primero tu roca');
    campo.focus();
    return;
  }

  roca.hecha = !roca.hecha;
  guardar();

  if (roca.hecha) {
    confetiDesde(botonCheck);   // mini‑confeti desde el check
    sonarCompletado();
  }

  pintarRocas();
  actualizarResumen();

  const rocasEscritas = estado.rocas.filter(r => r.texto.trim());
  if (roca.hecha && rocasEscritas.every(r => r.hecha)) {
    mostrarAviso('🪨 ¡Todas tus rocas del día conseguidas!');
  }
}
