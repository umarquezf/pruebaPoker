/**
 * Scrum Poker - Aplicación completa
 */

// Constantes
const VALORES_CARTAS = ["1", "2", "3", "5", "8", "13", "21", "?", "☕"];
const INTERVALO_ACTUALIZACION = 2000; // 2 segundos

// Variables globales
let salaActual = null;
let usuarioActual = '';
let cartaSeleccionada = null;
let intervalId = null;
let toastBootstrap = null;
const bootstrap = window.bootstrap; // Declare bootstrap

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  inicializarApp();
});

/**
 * Inicializa la aplicación
 */
function inicializarApp() {
  // Inicializar toast de Bootstrap
  const toastLiveExample = document.getElementById('liveToast');
  toastBootstrap = new bootstrap.Toast(toastLiveExample);
  
  // Configurar eventos para navegación
  document.getElementById('btn-crear-sala').addEventListener('click', () => mostrarVista('vista-crear-sala'));
  document.getElementById('btn-unirse-sala').addEventListener('click', () => mostrarVista('vista-unirse-sala'));
  document.querySelectorAll('.btn-volver').forEach(btn => {
    btn.addEventListener('click', () => mostrarVista('vista-inicio'));
  });
  document.getElementById('btn-salir-sala').addEventListener('click', salirDeSala);
  
  // Configurar eventos para formularios
  document.getElementById('crear-sala-form').addEventListener('submit', crearSala);
  document.getElementById('unirse-sala-form').addEventListener('submit', unirseSala);
  
  // Configurar eventos para la sala
  document.getElementById('toggle-votos').addEventListener('click', toggleMostrarVotos);
  document.getElementById('reiniciar-votos').addEventListener('click', reiniciarVotos);
  document.getElementById('actualizar-tarea').addEventListener('click', actualizarTarea);
  
  // Verificar si hay una sala activa en sessionStorage
  const salaGuardada = sessionStorage.getItem('sala_activa');
  const usuarioGuardado = sessionStorage.getItem('usuario_actual');
  
  if (salaGuardada && usuarioGuardado) {
    const codigoSala = salaGuardada;
    usuarioActual = usuarioGuardado;
    
    // Intentar cargar la sala
    const sala = obtenerSala(codigoSala);
    if (sala) {
      salaActual = sala;
      inicializarSala(codigoSala);
      mostrarVista('vista-sala');
    } else {
      // Si no se encuentra la sala, limpiar sessionStorage
      sessionStorage.removeItem('sala_activa');
      sessionStorage.removeItem('usuario_actual');
      mostrarVista('vista-inicio');
    }
  } else {
    mostrarVista('vista-inicio');
  }
}

/**
 * Muestra una vista específica y oculta las demás
 * @param {string} vistaId - ID de la vista a mostrar
 */
function mostrarVista(vistaId) {
  // Ocultar todas las vistas
  document.querySelectorAll('.vista').forEach(vista => {
    vista.classList.add('d-none');
  });
  
  // Mostrar la vista solicitada
  document.getElementById(vistaId).classList.remove('d-none');
  
  // Si estamos saliendo de la vista de sala, limpiar el intervalo
  if (vistaId !== 'vista-sala' && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Crea una nueva sala
 * @param {Event} e - Evento del formulario
 */
function crearSala(e) {
  e.preventDefault();
  
  const nombreSala = document.getElementById('nombre-sala').value.trim();
  const nombreUsuario = document.getElementById('nombre-usuario-crear').value.trim();
  
  if (!nombreSala || !nombreUsuario) {
    mostrarNotificacion('Error', 'Debes completar todos los campos', 'danger');
    return;
  }
  
  // Generar un código único para la sala
  const codigoSala = generarCodigoSala();
  
  // Crear la información de la sala
  const salaInfo = {
    nombre: nombreSala,
    codigo: codigoSala,
    creador: nombreUsuario,
    participantes: [{ nombre: nombreUsuario, id: Date.now().toString() }],
    votosVisibles: false,
    votos: {},
    tareaActual: '',
    ultimaActualizacion: Date.now()
  };
  
  // Guardar en localStorage
  guardarSala(codigoSala, salaInfo);
  
  // Guardar usuario actual y sala activa
  usuarioActual = nombreUsuario;
  salaActual = salaInfo;
  
  // Guardar en sessionStorage para persistencia
  sessionStorage.setItem('usuario_actual', nombreUsuario);
  sessionStorage.setItem('sala_activa', codigoSala);
  
  // Inicializar la sala y mostrar la vista
  inicializarSala(codigoSala);
  mostrarVista('vista-sala');
  mostrarNotificacion('Éxito', 'Sala creada correctamente', 'success');
}

/**
 * Unirse a una sala existente
 * @param {Event} e - Evento del formulario
 */
function unirseSala(e) {
  e.preventDefault();
  
  const codigoSala = document.getElementById('codigo-sala').value.trim().toUpperCase();
  const nombreUsuario = document.getElementById('nombre-usuario-unirse').value.trim();
  
  if (!codigoSala || !nombreUsuario) {
    mostrarNotificacion('Error', 'Debes completar todos los campos', 'danger');
    return;
  }
  
  // Verificar si existe la sala
  const sala = obtenerSala(codigoSala);
  
  if (!sala) {
    mostrarNotificacion('Error', 'No se encontró la sala con ese código', 'danger');
    return;
  }
  
  // Verificar si el nombre de usuario ya existe en la sala
  const usuarioExistente = sala.participantes.find(p => p.nombre === nombreUsuario);
  if (usuarioExistente) {
    mostrarNotificacion('Advertencia', 'Ya existe un participante con ese nombre', 'warning');
    return;
  }
  
  // Agregar el nuevo participante
  const nuevoParticipante = {
    nombre: nombreUsuario,
    id: Date.now().toString()
  };
  
  sala.participantes.push(nuevoParticipante);
  sala.ultimaActualizacion = Date.now();
  guardarSala(codigoSala, sala);
  
  // Guardar usuario actual y sala activa
  usuarioActual = nombreUsuario;
  salaActual = sala;
  
  // Guardar en sessionStorage para persistencia
  sessionStorage.setItem('usuario_actual', nombreUsuario);
  sessionStorage.setItem('sala_activa', codigoSala);
  
  // Inicializar la sala y mostrar la vista
  inicializarSala(codigoSala);
  mostrarVista('vista-sala');
  mostrarNotificacion('Éxito', 'Te has unido a la sala', 'success');
}

/**
 * Inicializa la vista de la sala
 * @param {string} codigoSala - Código de la sala
 */
function inicializarSala(codigoSala) {
  if (!salaActual) return;
  
  // Mostrar la información de la sala
  document.getElementById('nombre-sala-header').textContent = salaActual.nombre;
  document.getElementById('codigo-sala-header').textContent = codigoSala;
  document.getElementById('codigo-sala-header').classList.add('codigo-sala');
  
  // Mostrar la tarea actual si existe
  if (salaActual.tareaActual) {
    document.getElementById('tarea-actual-container').classList.remove('d-none');
    document.getElementById('tarea-actual-texto').textContent = salaActual.tareaActual;
  } else {
    document.getElementById('tarea-actual-container').classList.add('d-none');
  }
  
  // Generar las cartas
  generarCartas();
  
  // Actualizar participantes
  actualizarParticipantes();
  
  // Actualizar resultados si son visibles
  if (salaActual.votosVisibles) {
    actualizarResultados();
    document.getElementById('resultados-container').classList.remove('d-none');
    document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye-slash me-1"></i> Ocultar votos';
  } else {
    document.getElementById('resultados-container').classList.add('d-none');
    document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye me-1"></i> Mostrar votos';
  }
  
  // Verificar si ya votó
  if (salaActual.votos && salaActual.votos[usuarioActual]) {
    cartaSeleccionada = salaActual.votos[usuarioActual];
    actualizarSeleccionCarta();
  }
  
  // Verificar si todos votaron
  verificarTodosVotaron();
  
  // Iniciar intervalo de actualización
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(actualizarDatosSala, INTERVALO_ACTUALIZACION);
}

/**
 * Genera las cartas de votación
 */
function generarCartas() {
  const cartasContainer = document.getElementById('cartas-container');
  cartasContainer.innerHTML = '';
  
  VALORES_CARTAS.forEach(valor => {
    const carta = document.createElement('div');
    carta.className = 'col';
    carta.innerHTML = `
      <div class="carta-poker w-100 h-100 d-flex align-items-center justify-content-center" data-valor="${valor}">
        <span class="fs-3 fw-bold">${valor}</span>
      </div>
    `;
    cartasContainer.appendChild(carta);
    
    // Agregar evento de clic
    carta.querySelector('.carta-poker').addEventListener('click', () => votar(valor));
  });
  
  actualizarSeleccionCarta();
}

/**
 * Actualiza la selección visual de la carta
 */
function actualizarSeleccionCarta() {
  document.querySelectorAll('.carta-poker').forEach(carta => {
    if (carta.dataset.valor === cartaSeleccionada) {
      carta.classList.add('carta-seleccionada');
    } else {
      carta.classList.remove('carta-seleccionada');
    }
  });
}

/**
 * Votar con una carta
 * @param {string} valor - Valor de la carta seleccionada
 */
function votar(valor) {
  if (!salaActual) return;
  
  // Actualizar la sala
  salaActual.votos = salaActual.votos || {};
  salaActual.votos[usuarioActual] = valor;
  salaActual.ultimaActualizacion = Date.now();
  
  // Guardar en localStorage
  guardarSala(salaActual.codigo, salaActual);
  
  // Actualizar UI
  cartaSeleccionada = valor;
  actualizarSeleccionCarta();
  actualizarParticipantes();
  verificarTodosVotaron();
}

/**
 * Actualiza la lista de participantes
 */
function actualizarParticipantes() {
  const participantesContainer = document.getElementById('participantes-container');
  participantesContainer.innerHTML = '';
  
  if (!salaActual || !salaActual.participantes) return;
  
  salaActual.participantes.forEach(p => {
    const participante = document.createElement('div');
    participante.className = 'p-2 rounded bg-light d-flex justify-content-between align-items-center';
    
    let estadoVoto = '<span class="text-muted small">Pendiente</span>';
    if (salaActual.votos && salaActual.votos[p.nombre]) {
      estadoVoto = salaActual.votosVisibles 
        ? `<span class="fw-bold">${salaActual.votos[p.nombre]}</span>`
        : '<span class="text-success small">Votó</span>';
    }
    
    participante.innerHTML = `
      <span>${p.nombre === usuarioActual ? `${p.nombre} (tú)` : p.nombre}</span>
      ${estadoVoto}
    `;
    
    participantesContainer.appendChild(participante);
  });
}

/**
 * Verificar si todos los participantes han votado
 */
function verificarTodosVotaron() {
  if (!salaActual || !salaActual.participantes || !salaActual.votos) return;
  
  const todosVotaron = salaActual.participantes.every(p => 
    Object.keys(salaActual.votos).includes(p.nombre)
  );
  
  const todosVotaronElement = document.getElementById('todos-votaron');
  
  if (todosVotaron && !salaActual.votosVisibles) {
    todosVotaronElement.classList.remove('d-none');
  } else {
    todosVotaronElement.classList.add('d-none');
  }
}

/**
 * Calcular y mostrar resultados
 */
function actualizarResultados() {
  if (!salaActual || !salaActual.votos) return;
  
  const votos = Object.values(salaActual.votos);
  const votosNumericos = votos.filter(v => !isNaN(Number(v))).map(v => Number(v));
  
  if (votosNumericos.length === 0) {
    document.getElementById('promedio').textContent = 'N/A';
    document.getElementById('mediana').textContent = 'N/A';
    return;
  }
  
  // Calcular promedio
  const suma = votosNumericos.reduce((a, b) => a + b, 0);
  const promedio = (suma / votosNumericos.length).toFixed(1);
  document.getElementById('promedio').textContent = promedio;
  
  // Calcular mediana
  const ordenados = [...votosNumericos].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  const mediana = ordenados.length % 2 === 0
    ? ((ordenados[medio - 1] + ordenados[medio]) / 2).toString()
    : ordenados[medio].toString();
  document.getElementById('mediana').textContent = mediana;
}

/**
 * Actualizar datos de la sala (simular tiempo real)
 */
function actualizarDatosSala() {
  if (!salaActual) return;
  
  const salaActualizada = obtenerSala(salaActual.codigo);
  
  if (!salaActualizada) return;
  
  // Verificar si hay cambios comparando la última actualización
  if (salaActualizada.ultimaActualizacion > salaActual.ultimaActualizacion) {
    // Guardar el voto actual antes de actualizar
    const votoActual = salaActual.votos && salaActual.votos[usuarioActual];
    
    // Actualizar la sala local
    salaActual = salaActualizada;
    
    // Mantener el voto del usuario actual si no ha cambiado en la sala actualizada
    if (votoActual && (!salaActual.votos || !salaActual.votos[usuarioActual])) {
      salaActual.votos = salaActual.votos || {};
      salaActual.votos[usuarioActual] = votoActual;
      guardarSala(salaActual.codigo, salaActual);
    }
    
    // Actualizar UI
    actualizarParticipantes();
    verificarTodosVotaron();
    
    if (salaActual.votosVisibles) {
      actualizarResultados();
      document.getElementById('resultados-container').classList.remove('d-none');
      document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye-slash me-1"></i> Ocultar votos';
    } else {
      document.getElementById('resultados-container').classList.add('d-none');
      document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye me-1"></i> Mostrar votos';
    }
    
    // Actualizar tarea actual
    if (salaActual.tareaActual) {
      document.getElementById('tarea-actual-container').classList.remove('d-none');
      document.getElementById('tarea-actual-texto').textContent = salaActual.tareaActual;
    } else {
      document.getElementById('tarea-actual-container').classList.add('d-none');
    }
    
    // Verificar si ya votó
    if (salaActual.votos && salaActual.votos[usuarioActual]) {
      cartaSeleccionada = salaActual.votos[usuarioActual];
      actualizarSeleccionCarta();
    } else {
      cartaSeleccionada = null;
      actualizarSeleccionCarta();
    }
  }
}

/**
 * Mostrar/ocultar votos
 */
function toggleMostrarVotos() {
  if (!salaActual) return;
  
  salaActual.votosVisibles = !salaActual.votosVisibles;
  salaActual.ultimaActualizacion = Date.now();
  guardarSala(salaActual.codigo, salaActual);
  
  if (salaActual.votosVisibles) {
    actualizarResultados();
    document.getElementById('resultados-container').classList.remove('d-none');
    document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye-slash me-1"></i> Ocultar votos';
  } else {
    document.getElementById('resultados-container').classList.add('d-none');
    document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye me-1"></i> Mostrar votos';
  }
  
  actualizarParticipantes();
  verificarTodosVotaron();
}

/**
 * Reiniciar votos
 */
function reiniciarVotos() {
  if (!salaActual) return;
  
  salaActual.votos = {};
  salaActual.votosVisibles = false;
  salaActual.ultimaActualizacion = Date.now();
  guardarSala(salaActual.codigo, salaActual);
  
  cartaSeleccionada = null;
  
  actualizarSeleccionCarta();
  actualizarParticipantes();
  document.getElementById('resultados-container').classList.add('d-none');
  document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye me-1"></i> Mostrar votos';
  document.getElementById('todos-votaron').classList.add('d-none');
  
  mostrarNotificacion('Información', 'Se han reiniciado los votos', 'info');
}

/**
 * Actualizar tarea
 */
function actualizarTarea() {
  if (!salaActual) return;
  
  const tareaInput = document.getElementById('tarea');
  const tareaTexto = tareaInput.value.trim();
  
  if (!tareaTexto) {
    mostrarNotificacion('Error', 'Debes ingresar una descripción de la tarea', 'danger');
    return;
  }
  
  salaActual.tareaActual = tareaTexto;
  salaActual.votos = {};
  salaActual.votosVisibles = false;
  salaActual.ultimaActualizacion = Date.now();
  guardarSala(salaActual.codigo, salaActual);
  
  cartaSeleccionada = null;
  
  document.getElementById('tarea-actual-container').classList.remove('d-none');
  document.getElementById('tarea-actual-texto').textContent = tareaTexto;
  
  actualizarSeleccionCarta();
  actualizarParticipantes();
  document.getElementById('resultados-container').classList.add('d-none');
  document.getElementById('toggle-votos').innerHTML = '<i class="bi bi-eye me-1"></i> Mostrar votos';
  document.getElementById('todos-votaron').classList.add('d-none');
  
  mostrarNotificacion('Éxito', 'Tarea actualizada correctamente', 'success');
}

/**
 * Salir de la sala
 */
function salirDeSala() {
  // Limpiar intervalo
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  // Eliminar al usuario de la sala si no es el creador
  if (salaActual && salaActual.creador !== usuarioActual) {
    const participanteIndex = salaActual.participantes.findIndex(p => p.nombre === usuarioActual);
    if (participanteIndex !== -1) {
      salaActual.participantes.splice(participanteIndex, 1);
      
      // Eliminar el voto del usuario
      if (salaActual.votos && salaActual.votos[usuarioActual]) {
        delete salaActual.votos[usuarioActual];
      }
      
      salaActual.ultimaActualizacion = Date.now();
      guardarSala(salaActual.codigo, salaActual);
    }
  }
  
  // Limpiar datos de sesión
  sessionStorage.removeItem('sala_activa');
  sessionStorage.removeItem('usuario_actual');
  
  // Limpiar variables
  salaActual = null;
  usuarioActual = '';
  cartaSeleccionada = null;
  
  // Volver a la vista de inicio
  mostrarVista('vista-inicio');
}

/**
 * Genera un código único para una sala
 * @returns {string} - Código de sala (6 caracteres alfanuméricos)
 */
function generarCodigoSala() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Obtiene una sala por su código
 * @param {string} codigo - Código de la sala
 * @returns {Object|null} - Datos de la sala o null si no existe
 */
function obtenerSala(codigo) {
  const salaData = localStorage.getItem(`sala_${codigo}`);
  return salaData ? JSON.parse(salaData) : null;
}

/**
 * Guarda una sala en localStorage
 * @param {string} codigo - Código de la sala
 * @param {Object} sala - Datos de la sala
 */
function guardarSala(codigo, sala) {
  localStorage.setItem(`sala_${codigo}`, JSON.stringify(sala));
}

/**
 * Muestra una notificación
 * @param {string} titulo - Título de la notificación
 * @param {string} mensaje - Mensaje de la notificación
 * @param {string} tipo - Tipo de notificación (success, danger, warning, info)
 */
function mostrarNotificacion(titulo, mensaje, tipo = 'info') {
  const toastTitle = document.getElementById('toast-title');
  const toastBody = document.getElementById('toast-body');
  const toastElement = document.getElementById('liveToast');
  
  // Establecer el contenido
  toastTitle.textContent = titulo;
  toastBody.textContent = mensaje;
  
  // Establecer el color según el tipo
  toastElement.className = 'toast';
  toastElement.classList.add(`text-bg-${tipo}`);
  
  // Mostrar el toast
  toastBootstrap.show();
}

// Limpiar el intervalo al cerrar la ventana
window.addEventListener('beforeunload', () => {
  if (intervalId) clearInterval(intervalId);
});