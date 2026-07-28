/* =============================================
   MRUV - Calculadora y Simulador
   JavaScript puro, sin dependencias externas
   ============================================= */

// ============================================================
// 1. VARIABLES GLOBALES Y ESTADO
// ============================================================

/** Objeto que almacena los valores actuales de las variables cinemáticas */
let state = {
    x0: null,   // Posición inicial (m)
    x:  null,   // Posición final (m)
    dx: null,   // Desplazamiento (m)
    v0: null,   // Velocidad inicial (m/s)
    v:  null,   // Velocidad final (m/s)
    a:  null,   // Aceleración (m/s²)
    t:  null    // Tiempo (s)
};

/** Referencias a los elementos del DOM */
const inputs = {
    x0: document.getElementById('x0'),
    x:  document.getElementById('x'),
    dx: document.getElementById('dx'),
    v0: document.getElementById('v0'),
    v:  document.getElementById('v'),
    a:  document.getElementById('a'),
    t:  document.getElementById('t')
};

const resultEls = {
    x0: document.getElementById('res-x0'),
    x:  document.getElementById('res-x'),
    dx: document.getElementById('res-dx'),
    v0: document.getElementById('res-v0'),
    v:  document.getElementById('res-v'),
    a:  document.getElementById('res-a'),
    t:  document.getElementById('res-t')
};

const msgError = document.getElementById('mensajeError');
const msgInfo  = document.getElementById('mensajeInfo');
const sectionResults = document.getElementById('resultados');
const sectionProc    = document.getElementById('procedimiento');
const procContent    = document.getElementById('procContent');

// Canvas de simulación
const simCanvas = document.getElementById('simCanvas');
const simCtx    = simCanvas.getContext('2d');

// Canvas de gráficas
const graphPosCanvas = document.getElementById('graphPos');
const graphVelCanvas = document.getElementById('graphVel');
const graphAccCanvas = document.getElementById('graphAcc');
const graphPosCtx = graphPosCanvas.getContext('2d');
const graphVelCtx = graphVelCanvas.getContext('2d');
const graphAccCtx = graphAccCanvas.getContext('2d');

// Variables de simulación
let simAnimationId = null;
let simTime = 0;
let simSpeed = 1;
let simRunning = false;

// ============================================================
// 2. UTILIDADES MATEMÁTICAS
// ============================================================

function round(num, dec = 3) {
    if (num === null || num === undefined || isNaN(num)) return null;
    return parseFloat(num.toFixed(dec));
}

function fmt(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    const r = round(num, 3);
    return parseFloat(r.toString()).toString();
}

function isValid(val) {
    return val !== null && val !== undefined && !isNaN(val) && isFinite(val);
}

function readInput(input) {
    const raw = input.value.trim();
    if (raw === '') return null;
    const num = parseFloat(raw);
    return isNaN(num) ? null : num;
}

function approxEqual(a, b, tol = 1e-6) {
    if (!isValid(a) || !isValid(b)) return false;
    return Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b), 1);
}

// ============================================================
// 3. LECTURA Y ESCRITURA DE ESTADO
// ============================================================

function readStateFromInputs() {
    state.x0 = readInput(inputs.x0);
    state.x  = readInput(inputs.x);
    state.dx = readInput(inputs.dx);
    state.v0 = readInput(inputs.v0);
    state.v  = readInput(inputs.v);
    state.a  = readInput(inputs.a);
    state.t  = readInput(inputs.t);
}

function writeResults() {
    resultEls.x0.textContent = fmt(state.x0);
    resultEls.x.textContent  = fmt(state.x);
    resultEls.dx.textContent = fmt(state.dx);
    resultEls.v0.textContent = fmt(state.v0);
    resultEls.v.textContent  = fmt(state.v);
    resultEls.a.textContent  = fmt(state.a);
    resultEls.t.textContent  = fmt(state.t);
}

function showResults(show) {
    sectionResults.classList.toggle('hidden', !show);
}

function showProcedure(show) {
    sectionProc.classList.toggle('hidden', !show);
}

function showError(msg) {
    msgError.textContent = msg;
    msgError.classList.add('visible');
    msgInfo.classList.remove('visible');
}

function showInfo(msg) {
    msgInfo.textContent = msg;
    msgInfo.classList.add('visible');
    msgError.classList.remove('visible');
}

function clearMessages() {
    msgError.classList.remove('visible');
    msgInfo.classList.remove('visible');
}

// ============================================================
// 4. CÁLCULO INTELIGENTE DE MRUV
// ============================================================

function calcularRelacionDx() {
    let cambio = false;
    if (isValid(state.x0) && isValid(state.x) && !isValid(state.dx)) {
        state.dx = state.x - state.x0;
        cambio = true;
    } else if (isValid(state.x0) && isValid(state.dx) && !isValid(state.x)) {
        state.x = state.x0 + state.dx;
        cambio = true;
    } else if (isValid(state.x) && isValid(state.dx) && !isValid(state.x0)) {
        state.x0 = state.x - state.dx;
        cambio = true;
    }
    return cambio;
}

function calcularEcuacion1() {
    let cambio = false;
    const s = state;
    if (isValid(s.v0) && isValid(s.a) && isValid(s.t) && !isValid(s.v)) {
        s.v = s.v0 + s.a * s.t;
        cambio = true;
    } else if (isValid(s.v) && isValid(s.a) && isValid(s.t) && !isValid(s.v0)) {
        s.v0 = s.v - s.a * s.t;
        cambio = true;
    } else if (isValid(s.v) && isValid(s.v0) && isValid(s.t) && !isValid(s.a)) {
        s.a = (s.v - s.v0) / s.t;
        cambio = true;
    } else if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && !isValid(s.t)) {
        if (s.a !== 0) {
            s.t = (s.v - s.v0) / s.a;
            cambio = true;
        }
    }
    return cambio;
}

function calcularEcuacion2() {
    let cambio = false;
    const s = state;
    if (isValid(s.x0) && isValid(s.v0) && isValid(s.a) && isValid(s.t) && !isValid(s.x)) {
        s.x = s.x0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t;
        cambio = true;
    } else if (isValid(s.x) && isValid(s.x0) && isValid(s.v0) && isValid(s.t) && !isValid(s.a)) {
        if (s.t !== 0) {
            s.a = 2 * (s.x - s.x0 - s.v0 * s.t) / (s.t * s.t);
            cambio = true;
        }
    } else if (isValid(s.x) && isValid(s.x0) && isValid(s.a) && isValid(s.t) && !isValid(s.v0)) {
        if (s.t !== 0) {
            s.v0 = (s.x - s.x0 - 0.5 * s.a * s.t * s.t) / s.t;
            cambio = true;
        }
    } else if (isValid(s.x) && isValid(s.x0) && isValid(s.v0) && isValid(s.a) && !isValid(s.t)) {
        const A = 0.5 * s.a;
        const B = s.v0;
        const C = s.x0 - s.x;
        if (A === 0) {
            if (B !== 0) {
                s.t = -C / B;
                cambio = true;
            }
        } else {
            const disc = B * B - 4 * A * C;
            if (disc >= 0) {
                const t1 = (-B + Math.sqrt(disc)) / (2 * A);
                const t2 = (-B - Math.sqrt(disc)) / (2 * A);
                if (t1 >= 0 && t2 >= 0) {
                    s.t = Math.min(t1, t2);
                } else if (t1 >= 0) {
                    s.t = t1;
                } else if (t2 >= 0) {
                    s.t = t2;
                } else {
                    s.t = null;
                }
                cambio = true;
            }
        }
    }
    return cambio;
}

function calcularEcuacion3() {
    let cambio = false;
    const s = state;
    if (isValid(s.v0) && isValid(s.a) && isValid(s.dx) && !isValid(s.v)) {
        const val = s.v0 * s.v0 + 2 * s.a * s.dx;
        if (val >= 0) {
            s.v = Math.sqrt(val);
            if (s.v0 < 0 && s.a * s.dx < 0) s.v = -s.v;
            cambio = true;
        }
    } else if (isValid(s.v) && isValid(s.a) && isValid(s.dx) && !isValid(s.v0)) {
        const val = s.v * s.v - 2 * s.a * s.dx;
        if (val >= 0) {
            s.v0 = Math.sqrt(val);
            if (s.v < 0 && s.a * s.dx > 0) s.v0 = -s.v0;
            cambio = true;
        }
    } else if (isValid(s.v) && isValid(s.v0) && isValid(s.dx) && !isValid(s.a)) {
        if (s.dx !== 0) {
            s.a = (s.v * s.v - s.v0 * s.v0) / (2 * s.dx);
            cambio = true;
        }
    } else if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && !isValid(s.dx)) {
        if (s.a !== 0) {
            s.dx = (s.v * s.v - s.v0 * s.v0) / (2 * s.a);
            cambio = true;
        }
    }
    return cambio;
}

function resolverIterativo() {
    let iter = 0;
    const MAX_ITER = 20;
    while (iter < MAX_ITER) {
        let cambio = false;
        cambio = calcularRelacionDx() || cambio;
        cambio = calcularEcuacion1() || cambio;
        cambio = calcularEcuacion2() || cambio;
        cambio = calcularEcuacion3() || cambio;
        if (!cambio) break;
        iter++;
    }
    return iter;
}

function verificarConsistencia() {
    const s = state;
    if (isValid(s.x0) && isValid(s.x) && isValid(s.dx)) {
        if (!approxEqual(s.dx, s.x - s.x0)) {
            return `Inconsistencia: Δx (${fmt(s.dx)}) ≠ x - x₀ (${fmt(s.x)} - ${fmt(s.x0)} = ${fmt(s.x - s.x0)}). Verifica los datos.`;
        }
    }
    if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && isValid(s.t)) {
        const vCalc = s.v0 + s.a * s.t;
        if (!approxEqual(s.v, vCalc)) {
            return `Inconsistencia: v (${fmt(s.v)}) ≠ v₀ + a·t (${fmt(s.v0)} + ${fmt(s.a)}·${fmt(s.t)} = ${fmt(vCalc)}). Datos incompatibles.`;
        }
    }
    if (isValid(s.x) && isValid(s.x0) && isValid(s.v0) && isValid(s.a) && isValid(s.t)) {
        const xCalc = s.x0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t;
        if (!approxEqual(s.x, xCalc)) {
            return `Inconsistencia: x (${fmt(s.x)}) ≠ x₀ + v₀·t + ½·a·t². Datos incompatibles.`;
        }
    }
    if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && isValid(s.dx)) {
        const lhs = s.v * s.v;
        const rhs = s.v0 * s.v0 + 2 * s.a * s.dx;
        if (!approxEqual(lhs, rhs)) {
            return `Inconsistencia: v² (${fmt(lhs)}) ≠ v₀² + 2·a·Δx (${fmt(rhs)}). Datos incompatibles.`;
        }
    }
    return null;
}

function variablesFaltantes() {
    const s = state;
    const conocidas = [];
    if (isValid(s.x0)) conocidas.push('x₀');
    if (isValid(s.x))  conocidas.push('x');
    if (isValid(s.dx)) conocidas.push('Δx');
    if (isValid(s.v0)) conocidas.push('v₀');
    if (isValid(s.v))  conocidas.push('v');
    if (isValid(s.a))  conocidas.push('a');
    if (isValid(s.t))  conocidas.push('t');

    if (conocidas.length < 3) {
        return ['Se necesitan al menos 3 variables conocidas para resolver un problema de MRUV.'];
    }

    const sCopy = { ...s };
    resolverIterativoConEstado(sCopy);

    const vars = ['x0','x','dx','v0','v','a','t'];
    const nombres = {'x0':'x₀','x':'x','dx':'Δx','v0':'v₀','v':'v','a':'a','t':'t'};
    const faltan = [];
    for (const v of vars) {
        if (!isValid(sCopy[v])) {
            faltan.push(nombres[v]);
        }
    }
    return faltan;
}

function resolverIterativoConEstado(st) {
    let iter = 0;
    const MAX_ITER = 20;
    const originalState = state;
    state = st;
    while (iter < MAX_ITER) {
        let cambio = false;
        cambio = calcularRelacionDx() || cambio;
        cambio = calcularEcuacion1() || cambio;
        cambio = calcularEcuacion2() || cambio;
        cambio = calcularEcuacion3() || cambio;
        if (!cambio) break;
        iter++;
    }
    state = originalState;
    return iter;
}

// ============================================================
// 5. PROCEDIMIENTO MATEMÁTICO
// ============================================================

function generarProcedimiento() {
    const s = state;
    let html = '';
    let paso = 1;

    if (isValid(s.x0) && isValid(s.x) && isValid(s.dx)) {
        html += pasoHTML(paso, 'Relación entre posiciones', 'Δx = x - x₀',
            `Δx = ${fmt(s.x)} - ${fmt(s.x0)}`, `Δx = ${fmt(s.dx)} m`);
        paso++;
    }

    if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && isValid(s.t)) {
        if (s.v === round(s.v0 + s.a * s.t, 3)) {
            html += pasoHTML(paso, 'Ecuación de velocidad', 'v = v₀ + a·t',
                `v = ${fmt(s.v0)} + (${fmt(s.a)})·(${fmt(s.t)})`, `v = ${fmt(s.v)} m/s`);
            paso++;
        }
    }

    if (isValid(s.x) && isValid(s.x0) && isValid(s.v0) && isValid(s.a) && isValid(s.t)) {
        if (s.x === round(s.x0 + s.v0 * s.t + 0.5 * s.a * s.t * s.t, 3)) {
            html += pasoHTML(paso, 'Ecuación de posición', 'x = x₀ + v₀·t + ½·a·t²',
                `x = ${fmt(s.x0)} + (${fmt(s.v0)})·(${fmt(s.t)}) + ½·(${fmt(s.a)})·(${fmt(s.t)})²`,
                `x = ${fmt(s.x)} m`);
            paso++;
        }
    }

    if (isValid(s.v) && isValid(s.v0) && isValid(s.a) && isValid(s.dx)) {
        if (approxEqual(s.v * s.v, s.v0 * s.v0 + 2 * s.a * s.dx)) {
            html += pasoHTML(paso, 'Ecuación independiente del tiempo', 'v² = v₀² + 2·a·Δx',
                `(${fmt(s.v)})² = (${fmt(s.v0)})² + 2·(${fmt(s.a)})·(${fmt(s.dx)})`,
                `v² = ${fmt(s.v * s.v)} → v = ${fmt(s.v)} m/s`);
            paso++;
        }
    }

    if (paso === 1) {
        html += `<p class="eq-sub">Los valores fueron calculados mediante resolución iterativa de las ecuaciones cinemáticas del MRUV.</p>`;
    }
    return html;
}

function pasoHTML(n, nombre, formula, sustitucion, resultado) {
    return `
        <div class="proc-step">
            <div class="eq-name">Paso ${n}: ${nombre}</div>
            <div class="eq-formula">${formula}</div>
            <div class="eq-sub">Sustitución: ${sustitucion}</div>
            <div class="eq-res">Resultado: ${resultado}</div>
        </div>`;
}

// ============================================================
// 6. SIMULACIÓN VISUAL
// ============================================================

function dibujarFondoSim(ctx, width, height) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const roadY = height * 0.55;
    const roadH = height * 0.35;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, roadY, width, roadH);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, roadY);
    ctx.lineTo(width, roadY);
    ctx.moveTo(0, roadY + roadH);
    ctx.lineTo(width, roadY + roadH);
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + roadH / 2);
    ctx.lineTo(width, roadY + roadH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const escala = width / 300;
    for (let m = 0; m <= 300; m += 50) {
        const px = m * escala;
        ctx.fillRect(px - 1, roadY + roadH, 2, 8);
        ctx.fillText(m + ' m', px, roadY + roadH + 22);
    }
}

function dibujarVehiculo(ctx, xPixel, roadY, roadH, v) {
    const carW = 50;
    const carH = 22;
    const carY = roadY + roadH / 2 - carH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(xPixel + 4, carY + carH + 2, carW, 4);

    ctx.fillStyle = v >= 0 ? '#3b82f6' : '#ef4444';
    roundRect(ctx, xPixel, carY, carW, carH, 5);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    roundRect(ctx, xPixel + 28, carY + 3, 18, 10, 3);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(xPixel + 10, carY + carH, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xPixel + carW - 10, carY + carH, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.abs(round(v, 1)) + ' m/s', xPixel + carW / 2, carY - 6);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function iniciarSimulacion() {
    if (simAnimationId) cancelAnimationFrame(simAnimationId);

    const s = state;
    if (!isValid(s.x0) || !isValid(s.v0) || !isValid(s.a)) {
        showError('Para la simulación se requieren al menos x₀, v₀ y a.');
        return;
    }

    simRunning = true;
    simTime = 0;
    simSpeed = parseFloat(document.getElementById('simSpeed').value) || 1;

    let tTotal = isValid(s.t) && s.t > 0 ? s.t : 10;
    if (tTotal <= 0) tTotal = 10;

    const width = simCanvas.width;
    const height = simCanvas.height;
    const escalaX = width / 300;
    const startTime = performance.now();

    function frame(now) {
        if (!simRunning) return;
        const elapsedReal = (now - startTime) / 1000;
        simTime = elapsedReal * simSpeed;
        if (simTime > tTotal) {
            simTime = tTotal;
            simRunning = false;
        }
        const vSim = s.v0 + s.a * simTime;
        const xSim = s.x0 + s.v0 * simTime + 0.5 * s.a * simTime * simTime;
        dibujarFondoSim(simCtx, width, height);
        const xPixel = (xSim - s.x0) * escalaX + 30;
        const roadY = height * 0.55;
        const roadH = height * 0.35;
        dibujarVehiculo(simCtx, xPixel, roadY, roadH, vSim);
        document.getElementById('sim-t').textContent = round(simTime, 2).toString();
        document.getElementById('sim-x').textContent = round(xSim, 2).toString();
        document.getElementById('sim-v').textContent = round(vSim, 2).toString();
        document.getElementById('sim-a').textContent = round(s.a, 2).toString();
        if (simRunning) {
            simAnimationId = requestAnimationFrame(frame);
        }
    }
    simAnimationId = requestAnimationFrame(frame);
}

function reiniciarSimulacion() {
    simRunning = false;
    if (simAnimationId) cancelAnimationFrame(simAnimationId);
    simTime = 0;
    const width = simCanvas.width;
    const height = simCanvas.height;
    dibujarFondoSim(simCtx, width, height);
    const s = state;
    const xPixel = isValid(s.x0) ? 30 : 30;
    const roadY = height * 0.55;
    const roadH = height * 0.35;
    dibujarVehiculo(simCtx, xPixel, roadY, roadH, isValid(s.v0) ? s.v0 : 0);
    document.getElementById('sim-t').textContent = '0.00';
    document.getElementById('sim-x').textContent = fmt(s.x0);
    document.getElementById('sim-v').textContent = fmt(s.v0);
    document.getElementById('sim-a').textContent = fmt(s.a);
}

// ============================================================
// 7. GRÁFICAS
// ============================================================

function dibujarGrafica(ctx, w, h, xs, ys, colorLinea, labelX, labelY, titulo) {
    ctx.clearRect(0, 0, w, h);
    const padL = 50, padR = 20, padT = 30, padB = 40;
    const gw = w - padL - padR;
    const gh = h - padT - padB;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeY = maxY - minY || 1;
    const y0 = minY - rangeY * 0.1;
    const y1 = maxY + rangeY * 0.1;
    const x0 = minX;
    const x1 = maxX;

    const sx = (x) => padL + ((x - x0) / (x1 - x0)) * gw;
    const sy = (y) => padT + gh - ((y - y0) / (y1 - y0)) * gh;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
        const x = padL + (gw / 5) * i;
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + gh);
    }
    for (let i = 0; i <= 5; i++) {
        const y = padT + (gh / 5) * i;
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + gw, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + gh);
    ctx.lineTo(padL + gw, padT + gh);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labelX, padL + gw / 2, h - 6);
    ctx.save();
    ctx.translate(12, padT + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(labelY, 0, 0);
    ctx.restore();

    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const val = x0 + ((x1 - x0) / 5) * i;
        ctx.fillText(round(val, 2).toString(), padL + (gw / 5) * i, padT + gh + 14);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const val = y0 + ((y1 - y0) / 5) * i;
        ctx.fillText(round(val, 2).toString(), padL - 6, padT + gh - (gh / 5) * i + 4);
    }

    if (xs.length > 1) {
        ctx.strokeStyle = colorLinea;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx(xs[0]), sy(ys[0]));
        for (let i = 1; i < xs.length; i++) {
            ctx.lineTo(sx(xs[i]), sy(ys[i]));
        }
        ctx.stroke();
        ctx.fillStyle = colorLinea;
        for (let i = 0; i < xs.length; i += Math.max(1, Math.floor(xs.length / 20))) {
            ctx.beginPath();
            ctx.arc(sx(xs[i]), sy(ys[i]), 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function generarGraficas() {
    const s = state;
    if (!isValid(s.x0) || !isValid(s.v0) || !isValid(s.a)) {
        dibujarGraficaVacia(graphPosCtx, graphPosCanvas.width, graphPosCanvas.height, 'Posición vs Tiempo', 't (s)', 'x (m)');
        dibujarGraficaVacia(graphVelCtx, graphVelCanvas.width, graphVelCanvas.height, 'Velocidad vs Tiempo', 't (s)', 'v (m/s)');
        dibujarGraficaVacia(graphAccCtx, graphAccCanvas.width, graphAccCanvas.height, 'Aceleración vs Tiempo', 't (s)', 'a (m/s²)');
        return;
    }
    const tTotal = isValid(s.t) && s.t > 0 ? s.t : 10;
    const nPoints = 100;
    const ts = [], xs = [], vs = [], as = [];
    for (let i = 0; i <= nPoints; i++) {
        const t = (tTotal / nPoints) * i;
        ts.push(t);
        xs.push(s.x0 + s.v0 * t + 0.5 * s.a * t * t);
        vs.push(s.v0 + s.a * t);
        as.push(s.a);
    }
    dibujarGrafica(graphPosCtx, graphPosCanvas.width, graphPosCanvas.height, ts, xs, '#1a56db', 't (s)', 'x (m)', 'Posición vs Tiempo');
    dibujarGrafica(graphVelCtx, graphVelCanvas.width, graphVelCanvas.height, ts, vs, '#047857', 't (s)', 'v (m/s)', 'Velocidad vs Tiempo');
    dibujarGrafica(graphAccCtx, graphAccCanvas.width, graphAccCanvas.height, ts, as, '#dc2626', 't (s)', 'a (m/s²)', 'Aceleración vs Tiempo');
}

function dibujarGraficaVacia(ctx, w, h, titulo, lx, ly) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ingrese x₀, v₀ y a para generar la gráfica', w / 2, h / 2);
}

// ============================================================
// 8. GENERADOR DE EJEMPLOS ALEATORIOS
// ============================================================

function generarEjemploAleatorio() {
    resetearTodo();
    const x0 = 0;
    const v0 = round(Math.random() * 15 + 2, 1);
    const a  = round((Math.random() > 0.3 ? 1 : -1) * (Math.random() * 4 + 0.5), 2);
    const t  = round(Math.random() * 8 + 3, 1);
    const v  = round(v0 + a * t, 2);
    const x  = round(x0 + v0 * t + 0.5 * a * t * t, 2);
    const dx = round(x - x0, 2);

    const vars = ['x0','x','dx','v0','v','a','t'];
    const valores = { x0, x, dx, v0, v, a, t };
    const numMostrar = Math.floor(Math.random() * 3) + 3;
    const shuffled = vars.sort(() => Math.random() - 0.5);
    const mostrar = shuffled.slice(0, numMostrar);

    for (const v of mostrar) {
        inputs[v].value = valores[v];
    }
    showInfo('Ejemplo aleatorio generado. Calcula las variables faltantes y presiona "Calcular".');
}

// ============================================================
// 9. EVENTOS Y CONTROLADORES
// ============================================================

function handleCalcular() {
    clearMessages();
    readStateFromInputs();

    const conocidas = Object.values(state).filter(v => isValid(v)).length;
    if (conocidas < 3) {
        showError('Se necesitan al menos 3 variables conocidas para resolver el MRUV. Ingresa más datos.');
        showResults(false);
        showProcedure(false);
        return;
    }

    const inconsistencia = verificarConsistencia();
    if (inconsistencia) {
        showError(inconsistencia);
        showResults(false);
        showProcedure(false);
        return;
    }

    resolverIterativo();

    const faltan = variablesFaltantes();
    if (faltan.length > 0 && typeof faltan[0] === 'string' && faltan[0].startsWith('Se necesitan')) {
        showError(faltan[0]);
        showResults(false);
        showProcedure(false);
        return;
    }

    const postInconsistencia = verificarConsistencia();
    if (postInconsistencia) {
        showError(postInconsistencia);
        showResults(false);
        showProcedure(false);
        return;
    }

    writeResults();
    showResults(true);
    procContent.innerHTML = generarProcedimiento();
    showProcedure(true);
    generarGraficas();
    reiniciarSimulacion();

    if (faltan.length > 0) {
        showInfo(`Cálculo completado. No fue posible determinar: ${faltan.join(', ')} con los datos proporcionados.`);
    } else {
        showInfo('¡Cálculo completado! Todas las variables fueron determinadas.');
    }
}

function resetearTodo() {
    for (const key in inputs) {
        inputs[key].value = '';
    }
    state = { x0: null, x: null, dx: null, v0: null, v: null, a: null, t: null };
    showResults(false);
    showProcedure(false);
    clearMessages();
    reiniciarSimulacion();
    generarGraficas();
}

// ============================================================
// 10. INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnCalcular').addEventListener('click', handleCalcular);
    document.getElementById('btnReset').addEventListener('click', resetearTodo);
    document.getElementById('btnEjemplo').addEventListener('click', generarEjemploAleatorio);
    document.getElementById('btnSimPlay').addEventListener('click', iniciarSimulacion);
    document.getElementById('btnSimReset').addEventListener('click', reiniciarSimulacion);

    dibujarFondoSim(simCtx, simCanvas.width, simCanvas.height);
    dibujarVehiculo(simCtx, 30, simCanvas.height * 0.55, simCanvas.height * 0.35, 0);
    generarGraficas();
});
