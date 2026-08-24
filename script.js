let modoActual = 'facil';
let incrementoElegido = 1;
let tiempoLimite = 7;
let tiempoRestante = 7;
let temporizadorInterval = null;
let preguntaActual = 0;
let totalPreguntas = 10;
let puntos = 0;
let correctas = 0;
let incorrectas = 0;
let sinResponder = 0;
let numeroMostrado = 0;
let respuestaCorrecta = 0;
let opcionesActuales = [];
let posicionCorrecta = 0;
let puedeResponder = false;
let juegoActivo = false;
let audioContext = null;

// Circunferencia del círculo SVG
const CIRCUNFERENCIA = 283;

// ============================================
// INICIALIZACIÓN DE AUDIO
// ============================================

function inicializarAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// ============================================
// SONIDOS CON WEB AUDIO API
// ============================================

function reproducirAcierto() {
    inicializarAudio();
    const ctx = audioContext;
    const ahora = ctx.currentTime;

    // Tono ascendente agradable (Do -> Mi -> Sol)
    const notas = [523.25, 659.25, 783.99];
    const duracion = 0.15;

    notas.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.3, ahora + i * duracion);
        gain.gain.exponentialRampToValueAtTime(0.01, ahora + i * duracion + duracion);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ahora + i * duracion);
        osc.stop(ahora + i * duracion + duracion);
    });
}

function reproducirError() {
    inicializarAudio();
    const ctx = audioContext;
    const ahora = ctx.currentTime;

    // Tono descendente suave
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, ahora);
    osc.frequency.exponentialRampToValueAtTime(150, ahora + 0.4);

    gain.gain.setValueAtTime(0.25, ahora);
    gain.gain.exponentialRampToValueAtTime(0.01, ahora + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ahora);
    osc.stop(ahora + 0.4);
}

// ============================================
// VOZ - SPEECH SYNTHESIS
// ============================================

function hablarNumero(numero) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(numero.toString());
    utterance.lang = 'es-ES';
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

// ============================================
// UTILIDADES
// ============================================

function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mezclar(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = aleatorio(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

// ============================================
// NAVEGACIÓN
// ============================================

function mostrarAprender() {
    generarGridNumeros();
    mostrarPantalla('pantalla-aprender');
}

function mostrarModos() {
    mostrarPantalla('pantalla-modos');
}

function volverInicio() {
    detenerTemporizador();
    juegoActivo = false;
    mostrarPantalla('pantalla-inicio');
}

function volverAModos() {
    mostrarPantalla('pantalla-modos');
}

function confirmarSalir() {
    detenerTemporizador();
    juegoActivo = false;
    mostrarPantalla('pantalla-modos');
}

// ============================================
// SECCIÓN: APRENDER LOS NÚMEROS
// ============================================

function generarGridNumeros() {
    const grid = document.getElementById('grid-numeros');
    grid.innerHTML = '';

    for (let i = 1; i <= 100; i++) {
        const celda = document.createElement('div');
        celda.className = 'celda-numero';
        celda.textContent = i;
        celda.setAttribute('role', 'button');
        celda.setAttribute('aria-label', 'Número ' + i);

        celda.addEventListener('click', () => seleccionarNumero(i, celda));
        celda.addEventListener('touchstart', (e) => {
            e.preventDefault();
            seleccionarNumero(i, celda);
        });

        grid.appendChild(celda);
    }
}

function seleccionarNumero(numero, elemento) {
    document.querySelectorAll('.celda-numero').forEach(c => c.classList.remove('seleccionado'));

    elemento.classList.add('seleccionado');

    const destacado = document.querySelector('.numero-grande');
    const textoToca = document.querySelector('.texto-toca');

    destacado.textContent = numero;
    textoToca.textContent = '¡Número ' + numero + '!';

    // Hablar el número
    hablarNumero(numero);

    // Vibración táctil
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// ============================================
// SECCIÓN: SELECCIÓN DE INCREMENTO
// ============================================

function mostrarIncremento(modo) {
    modoActual = modo;
    tiempoLimite = modo === 'facil' ? 7 : 3;

    const grid = document.getElementById('grid-incremento');
    grid.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-incremento';
        btn.textContent = i;
        btn.setAttribute('aria-label', 'Sumar ' + i);

        btn.addEventListener('click', () => {
            inicializarAudio();
            hablarNumero(i);
            setTimeout(() => {
                iniciarJuego(i);
            }, 600);
        });

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            inicializarAudio();
            hablarNumero(i);
            setTimeout(() => {
                iniciarJuego(i);
            }, 600);
        });

        grid.appendChild(btn);
    }

    mostrarPantalla('pantalla-incremento');
}

// ============================================
// SECCIÓN: JUEGO
// ============================================

function iniciarJuego(incremento) {
    incrementoElegido = incremento;

    // Reiniciar estadísticas
    preguntaActual = 0;
    puntos = 0;
    correctas = 0;
    incorrectas = 0;
    sinResponder = 0;
    juegoActivo = true;

    // Actualizar UI del incremento
    document.getElementById('info-incremento').textContent = '+' + incremento;
    document.getElementById('texto-incremento').textContent = '+' + incremento;

    actualizarBarraSuperior();
    mostrarPantalla('pantalla-juego');

    setTimeout(() => {
        siguientePregunta();
    }, 500);
}

function siguientePregunta() {
    if (preguntaActual >= totalPreguntas) {
        mostrarPantallaFinal();
        return;
    }

    preguntaActual++;
    puedeResponder = true;

    // Generar número aleatorio entre 1 y (100 - incremento)
    const maxNumero = 100 - incrementoElegido;
    numeroMostrado = aleatorio(1, maxNumero);
    respuestaCorrecta = numeroMostrado + incrementoElegido;

    // Generar opciones incorrectas
    opcionesActuales = generarOpciones(respuestaCorrecta);

    // Mezclar opciones y recordar posición correcta
    const opcionesMezcladas = mezclar(opcionesActuales);
    posicionCorrecta = opcionesMezcladas.indexOf(respuestaCorrecta);

    // Renderizar pregunta
    renderizarPregunta(numeroMostrado, opcionesMezcladas);

    // Actualizar barra superior
    actualizarBarraSuperior();

    // Iniciar temporizador
    iniciarTemporizador();
}

function generarOpciones(correcta) {
    let opciones = [correcta];

    // Generar dos opciones incorrectas distintas
    while (opciones.length < 3) {
        let incorrecta;

        // Variar entre -5 y +5 de la respuesta correcta, evitando la correcta
        const offset = aleatorio(-5, 5);
        incorrecta = correcta + offset;

        // Asegurar rango 1-100
        if (incorrecta < 1) incorrecta = aleatorio(1, correcta - 1);
        if (incorrecta > 100) incorrecta = aleatorio(correcta + 1, 100);
        if (incorrecta === correcta) incorrecta = correcta + aleatorio(2, 5);
        if (incorrecta > 100) incorrecta = correcta - aleatorio(2, 5);
        if (incorrecta < 1) incorrecta = 1;

        // Verificar que no esté repetida
        if (!opciones.includes(incorrecta)) {
            opciones.push(incorrecta);
        }
    }

    return opciones;
}

function renderizarPregunta(numero, opciones) {
    const numeroEl = document.getElementById('numero-pregunta');
    numeroEl.textContent = numero;

    // Animación de entrada
    numeroEl.style.animation = 'none';
    numeroEl.offsetHeight;
    numeroEl.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    // Renderizar opciones
    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById('opcion-' + i);
        const burbuja = btn.querySelector('.burbuja-numero');

        burbuja.textContent = opciones[i];
        btn.disabled = false;
        btn.classList.remove('correcto', 'incorrecto', 'revelado');
        btn.style.opacity = '1';
    }

    // Ocultar feedback
    document.getElementById('feedback').classList.add('oculto');
}

// ============================================
// TEMPORIZADOR
// ============================================

function iniciarTemporizador() {
    detenerTemporizador();

    tiempoRestante = tiempoLimite;
    actualizarCirculoTemporizador(1);

    const textoTiempo = document.getElementById('tiempo-restante');
    textoTiempo.textContent = tiempoRestante;

    const circulo = document.getElementById('circulo-progreso');
    circulo.classList.remove('urgente');

    temporizadorInterval = setInterval(() => {
        tiempoRestante -= 0.1;

        textoTiempo.textContent = Math.ceil(tiempoRestante);

        const progreso = tiempoRestante / tiempoLimite;
        actualizarCirculoTemporizador(progreso);

        if (tiempoRestante <= 2) {
            circulo.classList.add('urgente');
        }

        if (tiempoRestante <= 0) {
            detenerTemporizador();
            tiempoAgotado();
        }
    }, 100);
}

function detenerTemporizador() {
    if (temporizadorInterval) {
        clearInterval(temporizadorInterval);
        temporizadorInterval = null;
    }
}

function actualizarCirculoTemporizador(progreso) {
    const circulo = document.getElementById('circulo-progreso');
    const offset = CIRCUNFERENCIA * (1 - progreso);
    circulo.style.strokeDashoffset = offset;
}

// ============================================
// RESPUESTAS
// ============================================

function responder(indice) {
    if (!puedeResponder || !juegoActivo) return;

    puedeResponder = false;
    detenerTemporizador();

    const esCorrecta = indice === posicionCorrecta;

    if (esCorrecta) {
        correctas++;
        puntos += (modoActual === 'dificil' ? 2 : 1);
        reproducirAcierto();
        mostrarFeedbackCorrecto();
        resaltarBoton(indice, 'correcto');
        lanzarConfeti();
    } else {
        incorrectas++;
        reproducirError();
        mostrarFeedbackIncorrecto();
        resaltarBoton(indice, 'incorrecto');
        resaltarBoton(posicionCorrecta, 'revelado');
    }

    actualizarBarraSuperior();

    setTimeout(() => {
        siguientePregunta();
    }, 2500);
}

function tiempoAgotado() {
    if (!juegoActivo) return;

    puedeResponder = false;
    sinResponder++;

    reproducirError();
    mostrarFeedbackTiempoAgotado();
    resaltarBoton(posicionCorrecta, 'revelado');

    actualizarBarraSuperior();

    setTimeout(() => {
        siguientePregunta();
    }, 2500);
}

function resaltarBoton(indice, clase) {
    const btn = document.getElementById('opcion-' + indice);
    btn.classList.add(clase);
    btn.disabled = true;
}

// ============================================
// FEEDBACK
// ============================================

function mostrarFeedbackCorrecto() {
    const feedback = document.getElementById('feedback');
    const icono = document.getElementById('feedback-icono');
    const texto = document.getElementById('feedback-texto');
    const secuencia = document.getElementById('secuencia-visual');

    const mensajes = [
        '¡Correcto! ¡Muy bien!',
        '¡Excelente! ¡Lo lograste!',
        '¡Bravo! ¡Eres genial!',
        '¡Perfecto! ¡Sigue así!',
        '¡Increíble! ¡Eres muy listo!'
    ];

    icono.textContent = '🎉';
    texto.textContent = mensajes[aleatorio(0, mensajes.length - 1)];
    texto.style.color = '#44A08D';
    secuencia.classList.add('oculto');

    feedback.classList.remove('oculto');
}

function mostrarFeedbackIncorrecto() {
    const feedback = document.getElementById('feedback');
    const icono = document.getElementById('feedback-icono');
    const texto = document.getElementById('feedback-texto');
    const secuencia = document.getElementById('secuencia-visual');
    const secAntes = document.getElementById('sec-antes');
    const secIncremento = document.getElementById('sec-incremento');
    const secDespues = document.getElementById('sec-despues');
    const secSigno = document.getElementById('sec-signo');

    icono.textContent = '🐺';
    texto.textContent = '¡Casi! La respuesta era ' + respuestaCorrecta;
    texto.style.color = '#9B9BCC';

    // Mostrar operación completa
    secAntes.textContent = numeroMostrado;
    secSigno.textContent = '+';
    secIncremento.textContent = incrementoElegido;
    secDespues.textContent = respuestaCorrecta;
    secuencia.classList.remove('oculto');

    feedback.classList.remove('oculto');
}

function mostrarFeedbackTiempoAgotado() {
    const feedback = document.getElementById('feedback');
    const icono = document.getElementById('feedback-icono');
    const texto = document.getElementById('feedback-texto');
    const secuencia = document.getElementById('secuencia-visual');
    const secAntes = document.getElementById('sec-antes');
    const secIncremento = document.getElementById('sec-incremento');
    const secDespues = document.getElementById('sec-despues');
    const secSigno = document.getElementById('sec-signo');

    icono.textContent = '⏰';
    texto.textContent = '¡Se acabó el tiempo! Era el ' + respuestaCorrecta;
    texto.style.color = '#9B9BCC';

    secAntes.textContent = numeroMostrado;
    secSigno.textContent = '+';
    secIncremento.textContent = incrementoElegido;
    secDespues.textContent = respuestaCorrecta;
    secuencia.classList.remove('oculto');

    feedback.classList.remove('oculto');
}

// ============================================
// BARRA SUPERIOR
// ============================================

function actualizarBarraSuperior() {
    document.getElementById('puntos').textContent = puntos;
    document.getElementById('num-pregunta').textContent = preguntaActual;
}

// ============================================
// PANTALLA FINAL
// ============================================

function mostrarPantallaFinal() {
    juegoActivo = false;

    const totalRespondidas = correctas + incorrectas;
    const porcentaje = totalRespondidas > 0 
        ? Math.round((correctas / totalRespondidas) * 100) 
        : 0;

    // Estadísticas
    document.getElementById('stat-correctas').textContent = correctas;
    document.getElementById('stat-incorrectas').textContent = incorrectas;
    document.getElementById('stat-sin-responder').textContent = sinResponder;
    document.getElementById('stat-porcentaje').textContent = porcentaje + '%';

    // Mensaje según rendimiento
    const tituloFinal = document.getElementById('titulo-final');
    const mensajeFinal = document.getElementById('mensaje-final');
    const trofeo = document.getElementById('trofeo');

    if (porcentaje >= 90) {
        tituloFinal.textContent = '¡Excelente!';
        mensajeFinal.textContent = '¡Ya conoces muy bien los números!';
        trofeo.textContent = '🏆';
        lanzarConfeti();
        reproducirAcierto();
    } else if (porcentaje >= 70) {
        tituloFinal.textContent = '¡Muy bien!';
        mensajeFinal.textContent = 'Estás aprendiendo muchísimo.';
        trofeo.textContent = '🥇';
        reproducirAcierto();
    } else if (porcentaje >= 50) {
        tituloFinal.textContent = '¡Buen trabajo!';
        mensajeFinal.textContent = 'Sigue practicando, ¡lo estás haciendo genial!';
        trofeo.textContent = '🥈';
    } else {
        tituloFinal.textContent = '¡No te preocupes!';
        mensajeFinal.textContent = 'Practiquemos un poquito más. ¡Tú puedes!';
        trofeo.textContent = '🌟';
    }

    mostrarPantalla('pantalla-final');
}

// ============================================
// CONFETI
// ============================================

function lanzarConfeti() {
    const colores = ['#5B8DEF', '#4ECDC4', '#7B68EE', '#A8D8EA', '#AA96DA', '#98D8C8', '#B8B8D1'];
    const container = document.getElementById('confeti-container');

    for (let i = 0; i < 40; i++) {
        const confeti = document.createElement('div');
        confeti.className = 'confeti';
        confeti.style.left = aleatorio(0, 100) + '%';
        confeti.style.backgroundColor = colores[aleatorio(0, colores.length - 1)];
        confeti.style.animationDelay = (aleatorio(0, 500) / 1000) + 's';
        confeti.style.animationDuration = (aleatorio(15, 25) / 10) + 's';

        const forma = aleatorio(0, 2);
        if (forma === 0) {
            confeti.style.borderRadius = '50%';
        } else if (forma === 1) {
            confeti.style.borderRadius = '0';
            confeti.style.transform = 'rotate(45deg)';
        }

        container.appendChild(confeti);

        setTimeout(() => {
            if (confeti.parentNode) {
                confeti.parentNode.removeChild(confeti);
            }
        }, 3000);
    }
}

// ============================================
// HUSKY - ANIMACIÓN INTERACTIVA
// ============================================

function animarHusky() {
    const husky = document.getElementById('mascota-husky');
    if (!husky) return;

    // Cada 8 segundos, el husky hace un "ladrido" visual (escala)
    setInterval(() => {
        husky.style.animation = 'none';
        husky.offsetHeight;
        husky.style.animation = 'bounce 0.5s ease, huskyBlink 0.5s ease';

        setTimeout(() => {
            husky.style.animation = 'bounce 2s infinite, huskyBlink 4s infinite';
        }, 500);
    }, 8000);
}

// ============================================
// INICIALIZACIÓN
// ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    mostrarPantalla('pantalla-inicio');
    animarHusky();

    // Prevenir zoom en doble tap en móviles
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Inicializar audio en primer toque (requerido por algunos navegadores)
    document.body.addEventListener('click', inicializarAudio, { once: true });
    document.body.addEventListener('touchstart', inicializarAudio, { once: true });
});
