let tasaCambio = parseFloat(localStorage.getItem('tasaCambio')) || 650;
let marcas = JSON.parse(localStorage.getItem('marcas')) || ['Genérica']; 
let productos = JSON.parse(localStorage.getItem('productos')) || [];
let ventasDiarias = JSON.parse(localStorage.getItem('ventasDiarias')) || [];
let fiados = JSON.parse(localStorage.getItem('fiados')) || [];
let auditoria = JSON.parse(localStorage.getItem('auditoria')) || []; 
let fechaInicioSemana = parseInt(localStorage.getItem('fechaInicioSemana')) || Date.now(); 
let ticketActual = [];

const inputTasa = document.getElementById('tasaDelDia');
const btnActualizarTasa = document.getElementById('btnActualizarTasa');
const selectProducto = document.getElementById('selectProducto');
const inputCantidad = document.getElementById('cantidadProducto');
const inputDolares = document.getElementById('montoDolares');
const inputBolivares = document.getElementById('montoBolivares');
const btnAgregarAlTicket = document.getElementById('btnAgregarAlTicket');
const selectMetodo = document.getElementById('metodoPago');
const campoClienteFiador = document.getElementById('campo-cliente-fiador');
const campoMixto = document.getElementById('campo-mixto');
const inputNombreFiado = document.getElementById('nombreFiado');
const inputMontoAbonadoMixtoDol = document.getElementById('montoAbonadoMixtoDol');
const inputMontoAbonadoMixtoBs = document.getElementById('montoAbonadoMixtoBs');
const selectMetodoAbonoMixto = document.getElementById('metodoAbonoMixto');
const btnRegistrarVenta = document.getElementById('btnRegistrarVenta');

// ==========================================
// UTILIDADES DE FECHA
// ==========================================
function esDeHoy(timestamp) {
    const fecha = new Date(timestamp);
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}
function iniciarPrograma() {
    inputTasa.value = tasaCambio;
    productos.forEach(p => { if (p.stockDomingo === undefined) p.stockDomingo = p.stock; });
    actualizarListasMarcas(); actualizarListasProductos(); actualizarResumen();
}
function guardarDatos() {
    localStorage.setItem('tasaCambio', tasaCambio);
    localStorage.setItem('marcas', JSON.stringify(marcas));
    localStorage.setItem('productos', JSON.stringify(productos));
    localStorage.setItem('ventasDiarias', JSON.stringify(ventasDiarias));
    localStorage.setItem('fiados', JSON.stringify(fiados));
    localStorage.setItem('auditoria', JSON.stringify(auditoria)); 
    localStorage.setItem('fechaInicioSemana', fechaInicioSemana.toString());
}

// ==========================================
// NAVEGACIÓN
// ==========================================
const botonesNav = {
    'nav-ventas': document.getElementById('pantalla-ventas'), 'nav-inventario': document.getElementById('pantalla-inventario'),
    'nav-resumen': document.getElementById('pantalla-resumen'), 'nav-semanal': document.getElementById('pantalla-semanal'),
    'nav-fiados': document.getElementById('pantalla-fiados'), 'nav-historial': document.getElementById('pantalla-historial'),
    'nav-opciones': document.getElementById('pantalla-opciones')
};
Object.keys(botonesNav).forEach(idBoton => {
    document.getElementById(idBoton).addEventListener('click', () => {
        Object.values(botonesNav).forEach(pantalla => pantalla.style.display = 'none');
        botonesNav[idBoton].style.display = 'block';
        if(idBoton === 'nav-historial') {
            actualizarHistorialCompleto();
            actualizarHistorialAuditoria();
        }
        if(idBoton === 'nav-semanal') actualizarResumenSemanal();
        if(idBoton === 'nav-resumen') actualizarResumen();
        if(idBoton === 'nav-fiados') actualizarPestañaFiados();
    });
});

// ==========================================
// CONVERSIÓN DE MONEDA
// ==========================================
function sincronizarInputsMoneda(inputDol, inputBs) {
    inputDol.addEventListener('input', () => {
        let dolares = parseFloat(inputDol.value) || 0;
        inputBs.value = (dolares * tasaCambio).toFixed(2); inputDol.dataset.precioExacto = dolares; 
    });
    inputBs.addEventListener('input', () => {
        let dolaresCalculados = (parseFloat(inputBs.value) || 0) / tasaCambio;
        inputDol.value = dolaresCalculados.toFixed(4); inputDol.dataset.precioExacto = dolaresCalculados; 
    });
}
sincronizarInputsMoneda(inputDolares, inputBolivares); 
sincronizarInputsMoneda(document.getElementById('nuevoPrecioDolares'), document.getElementById('nuevoPrecioBolivares')); 
sincronizarInputsMoneda(inputMontoAbonadoMixtoDol, inputMontoAbonadoMixtoBs); 

btnActualizarTasa.addEventListener('click', () => {
    tasaCambio = parseFloat(inputTasa.value); guardarDatos(); actualizarListasProductos(); renderizarTicket(); alert('Tasa actualizada a: ' + tasaCambio + ' Bs');
});

// ==========================================
// GESTIÓN DE MARCAS E INVENTARIO
// ==========================================
document.getElementById('btnAgregarMarca').addEventListener('click', () => {
    const nuevaMarca = document.getElementById('nuevaMarcaInput').value.trim();
    if (!nuevaMarca) return;
    if (marcas.some(m => m.toLowerCase() === nuevaMarca.toLowerCase())) { alert("Marca existente."); return; }
    marcas.push(nuevaMarca); guardarDatos(); actualizarListasMarcas(); document.getElementById('nuevaMarcaInput').value = '';
});

document.getElementById('btnEliminarMarca').addEventListener('click', () => {
    const marcaStr = document.getElementById('selectEliminarMarca').value;
    if (!marcaStr) { alert("Selecciona una marca para borrar."); return; }
    if (productos.some(p => p.marca === marcaStr)) { alert("Hay productos en el inventario usando esta marca. No se puede borrar."); return; }
    if (!confirm(`¿Seguro que quieres borrar la marca: ${marcaStr}?`)) return;
    
    marcas = marcas.filter(m => m !== marcaStr); 
    guardarDatos(); 
    actualizarListasMarcas();
});

function actualizarListasMarcas() {
    const selectMarca = document.getElementById('selectMarcaProducto'); 
    const selectEliminar = document.getElementById('selectEliminarMarca');
    selectMarca.innerHTML = '<option value="">-- Sin Marca --</option>'; 
    selectEliminar.innerHTML = '<option value="">-- Selecciona para borrar --</option>';
    
    marcas.forEach(marca => {
        let opt1 = document.createElement('option'); opt1.value = marca; opt1.textContent = marca; selectMarca.appendChild(opt1);
        let opt2 = document.createElement('option'); opt2.value = marca; opt2.textContent = marca; selectEliminar.appendChild(opt2);
    });
}

let idProductoEnEdicion = null; 
document.getElementById('btnGuardarProducto').addEventListener('click', () => {
    const nombre = document.getElementById('nuevoNombreProducto').value.trim();
    let marca = document.getElementById('selectMarcaProducto').value || "Genérica"; 
    let precioDolares = parseFloat(document.getElementById('nuevoPrecioDolares').dataset.precioExacto) || parseFloat(document.getElementById('nuevoPrecioDolares').value);
    const stock = parseInt(document.getElementById('nuevoStockInicial').value);
    if (!nombre || isNaN(precioDolares) || isNaN(stock)) { alert("Campos básicos requeridos."); return; }
    
    if (idProductoEnEdicion) {
        const index = productos.findIndex(p => p.id === idProductoEnEdicion);
        if (index !== -1) {
            if (productos.find(p => p.id !== idProductoEnEdicion && p.nombre.toLowerCase() === nombre.toLowerCase() && p.marca === marca)) { alert(`Duplicado.`); return; }
            productos[index].nombre = nombre; productos[index].marca = marca; productos[index].precio = precioDolares; productos[index].stock = stock;
        }
        idProductoEnEdicion = null; document.getElementById('btnGuardarProducto').textContent = "Guardar Producto"; document.getElementById('btnGuardarProducto').style.backgroundColor = ""; 
    } else {
        if (productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.marca === marca)) { alert(`Duplicado.`); return; }
        productos.push({ id: Date.now(), nombre, marca, precio: precioDolares, stock: stock, stockDomingo: stock });
    }
    guardarDatos(); actualizarListasProductos();
    document.getElementById('nuevoNombreProducto').value = ''; document.getElementById('nuevoPrecioDolares').value = '';
    document.getElementById('nuevoPrecioDolares').dataset.precioExacto = ''; document.getElementById('nuevoPrecioBolivares').value = '';
    document.getElementById('nuevoStockInicial').value = ''; document.getElementById('selectMarcaProducto').value = '';
});

function actualizarListasProductos() {
    selectProducto.innerHTML = '<option value="">-- Manual o Inventario --</option>';
    const listaHTML = document.getElementById('listaDeProductosHtml'); listaHTML.innerHTML = '';
    productos.forEach(prod => {
        let marcaSegura = prod.marca || "Genérica"; 
        let option = document.createElement('option'); option.value = prod.id; option.textContent = `${prod.nombre} (${marcaSegura}) - Disp: ${prod.stock}`;
        selectProducto.appendChild(option);
        
        let li = document.createElement('li');
        li.innerHTML = `${prod.nombre} (${marcaSegura}) | Precio: $${prod.precio.toFixed(3)} (${(prod.precio * tasaCambio).toFixed(2)} Bs) | Stock: ${prod.stock}
            <button onclick="editarProducto(${prod.id})" style="margin-left: 10px; background-color: #f0ad4e; border: none; border-radius: 3px;">Editar</button>
            <button onclick="borrarProducto(${prod.id})" style="background-color: #d9534f; border: none; border-radius: 3px; color:white;">Borrar</button>`;
        listaHTML.appendChild(li);
    });
}

window.borrarProducto = function(idProducto) {
    if (!confirm("¿Borrar producto?")) return;
    productos = productos.filter(p => p.id !== idProducto); guardarDatos(); actualizarListasProductos();
}

window.editarProducto = function(idProducto) {
    const prod = productos.find(p => p.id === idProducto); if (!prod) return;
    document.getElementById('nuevoNombreProducto').value = prod.nombre; document.getElementById('selectMarcaProducto').value = prod.marca || "";
    const inputDol = document.getElementById('nuevoPrecioDolares'); inputDol.value = prod.precio.toFixed(4); inputDol.dataset.precioExacto = prod.precio; 
    document.getElementById('nuevoPrecioBolivares').value = (prod.precio * tasaCambio).toFixed(2); document.getElementById('nuevoStockInicial').value = prod.stock;
    idProductoEnEdicion = idProducto; document.getElementById('btnGuardarProducto').textContent = "Actualizar Producto"; document.getElementById('btnGuardarProducto').style.backgroundColor = "#f0ad4e"; 
}

selectProducto.addEventListener('change', () => {
    const producto = productos.find(p => p.id == selectProducto.value);
    if (producto) { inputDolares.dataset.precioExacto = producto.precio; inputDolares.value = producto.precio.toFixed(4); inputDolares.dispatchEvent(new Event('input')); }
});

// ==========================================
// LÓGICA DEL TICKET (CARRITO)
// ==========================================
btnAgregarAlTicket.addEventListener('click', () => {
    const idProducto = selectProducto.value; const cantidad = parseInt(inputCantidad.value) || 1;
    let precioUnitarioDolares = parseFloat(inputDolares.dataset.precioExacto) || parseFloat(inputDolares.value);
    if (isNaN(precioUnitarioDolares) || precioUnitarioDolares <= 0) { alert("Monto inválido."); return; }
    let nombreItem = "Art. Varios";
    if (idProducto) { const prod = productos.find(p => p.id == idProducto); if (prod) nombreItem = `${prod.nombre} (${prod.marca || 'Genérica'})`; }
    ticketActual.push({ productoId: idProducto, nombre: nombreItem, cantidad: cantidad, precioUnitarioDolares: precioUnitarioDolares, totalDolares: precioUnitarioDolares * cantidad });
    inputDolares.value = ''; inputDolares.dataset.precioExacto = ''; inputBolivares.value = ''; inputCantidad.value = 1; selectProducto.value = ''; renderizarTicket();
});

function renderizarTicket() {
    const lista = document.getElementById('listaTicket'); let totalDolares = 0; lista.innerHTML = '';
    ticketActual.forEach((item, index) => {
        totalDolares += item.totalDolares; let li = document.createElement('li');
        li.innerHTML = `${item.cantidad}x ${item.nombre} = $${item.totalDolares.toFixed(3)} (${(item.totalDolares * tasaCambio).toFixed(2)} Bs) <button onclick="borrarDelTicket(${index})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold; font-size:1.2em;">[X]</button>`;
        lista.appendChild(li);
    });
    document.getElementById('totalTicketDolares').innerText = totalDolares.toFixed(3); document.getElementById('totalTicketBolivares').innerText = (totalDolares * tasaCambio).toFixed(2);
}
window.borrarDelTicket = function(index) { ticketActual.splice(index, 1); renderizarTicket(); }

// ==========================================
// REGISTRAR VENTA (CON LÓGICA MIXTA)
// ==========================================
selectMetodo.addEventListener('change', () => { 
    const val = selectMetodo.value;
    campoClienteFiador.style.display = (val === 'fiado' || val === 'mixto') ? 'block' : 'none'; 
    campoMixto.style.display = (val === 'mixto') ? 'block' : 'none';
});

btnRegistrarVenta.addEventListener('click', () => {
    if (ticketActual.length === 0) { alert("El ticket está vacío."); return; }
    const metodo = selectMetodo.value;
    const nombreFiado = inputNombreFiado.value.trim();
    
    if ((metodo === 'fiado' || metodo === 'mixto') && nombreFiado === '') { alert("Ingresa el nombre del deudor."); return; }
    let totalDolaresVenta = ticketActual.reduce((sum, item) => sum + item.totalDolares, 0);
    let abonadoDol = 0; let abonoMetodo = '';
    
    if (metodo === 'mixto') {
        abonadoDol = parseFloat(inputMontoAbonadoMixtoDol.dataset.precioExacto);
        if (isNaN(abonadoDol)) abonadoDol = parseFloat(inputMontoAbonadoMixtoDol.value);
        abonoMetodo = selectMetodoAbonoMixto.value;
        if (isNaN(abonadoDol) || abonadoDol <= 0 || abonadoDol >= totalDolaresVenta) {
            alert(`El monto abonado debe ser mayor a 0 y menor al total del ticket ($${totalDolaresVenta.toFixed(2)}).`); return;
        }
    }
    
    ticketActual.forEach(item => {
        if (item.productoId) { let prod = productos.find(p => p.id == item.productoId); if (prod) prod.stock -= item.cantidad; }
    });
    
    const idVentaBase = Date.now();
    const detallesTicket = [...ticketActual];
    
    if (metodo === 'fiado') {
        fiados.push({ id: idVentaBase, cliente: nombreFiado, montoDolares: totalDolaresVenta, detalle: detallesTicket.map(i => `${i.cantidad}x ${i.nombre}`).join(", ") });
    } else if (metodo === 'mixto') {
        let deudaDol = totalDolaresVenta - abonadoDol;
        const idFiado = idVentaBase + 1; 
        
        ventasDiarias.push({ 
            id: idVentaBase, fecha: new Date().toLocaleString(), detalles: detallesTicket, 
            dolares: abonadoDol, bolivares: abonadoDol * tasaCambio, 
            metodo: abonoMetodo, esMixto: true, fiadoVinculado: idFiado, totalOriginalDol: totalDolaresVenta
        });
        
        fiados.push({ 
            id: idFiado, cliente: nombreFiado, montoDolares: deudaDol, 
            detalle: `(Resto de $${totalDolaresVenta.toFixed(2)}) ` + detallesTicket.map(i => `${i.cantidad}x ${i.nombre}`).join(", ") 
        });
    } else { 
        ventasDiarias.push({ id: idVentaBase, fecha: new Date().toLocaleString(), detalles: detallesTicket, dolares: totalDolaresVenta, bolivares: totalDolaresVenta * tasaCambio, metodo: metodo }); 
    }
    
    ticketActual = []; guardarDatos(); actualizarListasProductos(); actualizarResumen(); renderizarTicket(); 
    inputNombreFiado.value = ''; inputMontoAbonadoMixtoDol.value = ''; inputMontoAbonadoMixtoDol.dataset.precioExacto = ''; inputMontoAbonadoMixtoBs.value = ''; selectMetodo.value = 'efectivoBs'; 
    campoClienteFiador.style.display = 'none'; campoMixto.style.display = 'none';
    alert("¡Venta completada!");
});

// ==========================================
// RESUMEN DIARIO
// ==========================================
function actualizarResumen() {
    const contenedorResumen = document.getElementById('resumenTotales');
    const contenedorFiados = document.getElementById('listaDeFiadosHoy');
    const contenedorHistorialCorto = document.getElementById('listaHistorialCorto');
    
    let totalEfectivoBs = 0, totalEfectivoDolares = 0, totalPunto = 0, totalPagoMovil = 0;
    const ventasHoy = ventasDiarias.filter(v => esDeHoy(v.id));
    const fiadosHoy = fiados.filter(f => esDeHoy(f.id));
    
    ventasHoy.forEach(venta => {
        if (venta.metodo === 'efectivoBs') totalEfectivoBs += venta.bolivares;
        if (venta.metodo === 'efectivoDolares') totalEfectivoDolares += venta.dolares;
        if (venta.metodo === 'punto') totalPunto += venta.bolivares;
        if (venta.metodo === 'pagoMovil') totalPagoMovil += venta.bolivares;
    });
    
    contenedorResumen.innerHTML = `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; box-shadow: var(--sombra);">
            <p style="margin-top:0;"><strong>Efectivo en Caja (Bs):</strong> ${totalEfectivoBs.toFixed(2)} Bs</p>
            <p><strong>Efectivo en Caja ($):</strong> $${totalEfectivoDolares.toFixed(2)}</p>
            <p><strong>Punto de Venta:</strong> ${totalPunto.toFixed(2)} Bs</p>
            <p style="margin-bottom:0;"><strong>Pago Móvil:</strong> ${totalPagoMovil.toFixed(2)} Bs</p>
        </div>
    `;
    
    contenedorFiados.innerHTML = fiadosHoy.length === 0 ? '<li style="padding: 12px; display:block;">No hay fiados registrados hoy.</li>' : '';
    fiadosHoy.forEach(deuda => {
        let li = document.createElement('li'); 
        li.style.display = "block"; 
        li.style.padding = "12px";
        li.innerHTML = `<span style="font-size: 1.1em; color: #d32f2f;">👤 <strong>${deuda.cliente}</strong></span> se llevó <strong>$${deuda.montoDolares.toFixed(2)} (${(deuda.montoDolares * tasaCambio).toFixed(2)} Bs)</strong> en deuda hoy. <br><div style="font-size:0.85em; color:gray; margin-top:5px; padding-top:5px; border-top:1px dashed #ccc;"><strong>Artículos:</strong> ${deuda.detalle}</div>`; 
        contenedorFiados.appendChild(li);
    });
    
    contenedorHistorialCorto.innerHTML = ventasHoy.length === 0 ? '<li style="padding:12px; display:block;">No hay ventas hoy.</li>' : '';
    const ultimasVentasHoy = [...ventasHoy].reverse().slice(0, 5);
    ultimasVentasHoy.forEach(venta => {
        let li = document.createElement('li');
        li.style.padding = "0"; 
        li.style.overflow = "hidden";
        li.style.display = "block"; 
        
        let desc = venta.detalles ? venta.detalles.map(i => `<b>${i.cantidad}x</b> ${i.nombre}`).join(", ") : "Cobro de Deuda / Otro";
        if (venta.esMixto) desc += ` <span class="badge badge-mixto">Abono Mixto</span>`;
        
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 12px;">
                <div style="flex: 1; padding-right: 10px;">
                    <div style="font-size: 0.85em; color: #666; margin-bottom: 3px;">🕒 ${venta.fecha.split(', ')[1]}</div>
                    <div style="font-size: 0.95em; color: #333; line-height: 1.3;">${desc}</div>
                </div>
                <div style="text-align: right; min-width: 90px; border-left: 1px solid #eee; padding-left: 10px;">
                    <div style="font-weight: bold; color: #2e7d32; font-size: 1.1em;">$${venta.dolares.toFixed(2)}</div>
                    <div style="font-size: 0.85em; color: gray; margin-bottom: 4px;">(${venta.bolivares.toFixed(2)} Bs)</div>
                    <div class="badge badge-metodo" style="display: inline-block;">${venta.metodo}</div>
                </div>
            </div>
        `;
        contenedorHistorialCorto.appendChild(li);
    });
}

// ==========================================
// GESTIÓN GLOBAL DE FIADOS Y COBROS
// ==========================================
function actualizarPestañaFiados() {
    const listaHtml = document.getElementById('listaTodosLosFiados'); const spanTotal = document.getElementById('totalFiadosGlobales');
    listaHtml.innerHTML = ''; let sumaTotal = 0;
    
    if (fiados.length === 0) { 
        listaHtml.innerHTML = '<p style="padding: 15px; background: #e8f5e9; border-radius: 5px; color: #2e7d32; font-weight: bold;">Todo está pagado. No hay deudas pendientes.</p>'; 
        spanTotal.innerText = "0.00 (0.00 Bs)"; 
        return; 
    }
    
    fiados.forEach(f => {
        sumaTotal += f.montoDolares; 
        let li = document.createElement('li');
        li.style.padding = "0"; li.style.border = "none"; li.style.borderLeft = "4px solid #ffc107"; li.style.backgroundColor = "transparent"; li.style.display = "block";
        
        let fechaOriginal = new Date(f.id).toLocaleDateString();
        
        li.innerHTML = `
            <div class="venta-card" style="background: #fff; box-shadow: var(--sombra); border-radius: 6px;">
                <div class="venta-header" style="padding: 10px 12px; border-bottom: 1px solid #ffe082;">
                    <h4 style="margin: 0; font-size: 1.1em; color: #d32f2f;">👤 ${f.cliente}</h4>
                    <span style="font-size: 0.85em; color: gray;">📅 ${fechaOriginal}</span>
                </div>
                <div class="venta-body" style="padding: 10px 12px; font-size: 0.95em; color: #555;">
                    <strong style="color: #333;">Artículos:</strong> ${f.detalle}
                </div>
                <div class="venta-footer" style="background: #fffdf5; flex-direction: column; gap: 10px; border-top: 1px solid #ffe082; padding: 15px;">
                    <div style="text-align: center; width: 100%;">
                        <strong style="font-size: 1.1em;">Deuda PENDIENTE: <span style="color: #d32f2f; font-size: 1.2em;">$${f.montoDolares.toFixed(2)}</span></strong> 
                        <div style="font-size: 0.85em; color: gray; margin-top: 2px;">(Aprox ${(f.montoDolares * tasaCambio).toFixed(2)} Bs)</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; border-top: 1px dashed #ffe082; padding-top: 10px;">
                        <select id="cobro-metodo-${f.id}" style="margin: 0; flex: 1; padding: 8px;">
                            <option value="efectivoBs">Efectivo Bs</option>
                            <option value="efectivoDolares">Efectivo $</option>
                            <option value="punto">Punto</option>
                            <option value="pagoMovil">Pago Móvil</option>
                        </select>
                        <button onclick="cobrarFiado(${f.id})" class="btn-exito" style="padding: 9px 15px; font-weight: bold; flex: 1;">Registrar Pago</button>
                    </div>
                </div>
            </div>`;
        listaHtml.appendChild(li);
    });
    
    // Aquí actualizamos el span para mostrar ambas monedas
    spanTotal.innerText = `${sumaTotal.toFixed(2)} (${(sumaTotal * tasaCambio).toFixed(2)} Bs)`;
}

window.cobrarFiado = function(idFiado) {
    const index = fiados.findIndex(f => f.id === idFiado); if (index === -1) return;
    const fiado = fiados[index]; const metodoSeleccionado = document.getElementById(`cobro-metodo-${idFiado}`).value;
    if(!confirm(`¿Confirmar que ${fiado.cliente} pagó $${fiado.montoDolares.toFixed(2)} mediante ${metodoSeleccionado}? El dinero ingresará a la caja de hoy.`)) return;
    ventasDiarias.push({
        id: Date.now(), fecha: new Date().toLocaleString(),
        detalles: [{ nombre: `Cobro deuda (${fiado.cliente})`, cantidad: 1, precioUnitarioDolares: fiado.montoDolares, totalDolares: fiado.montoDolares }],
        dolares: fiado.montoDolares, bolivares: fiado.montoDolares * tasaCambio, metodo: metodoSeleccionado, esCobroFiado: true
    });
    auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: `💰 Se cobró la deuda de ${fiado.cliente} por $${fiado.montoDolares.toFixed(2)} vía ${metodoSeleccionado}.` });
    fiados.splice(index, 1); guardarDatos(); actualizarPestañaFiados(); actualizarResumen();
    alert(`Deuda saldada y añadida a la caja de hoy.`);
}

// ==========================================
// CIERRE SEMANAL
// ==========================================
function actualizarResumenSemanal() {
    const contenedorTotales = document.getElementById('resumenSemanalTotales'); const tbodyInventario = document.getElementById('tablaInventarioSemanal');
    const ventasSemana = ventasDiarias.filter(v => v.id >= fechaInicioSemana); const fiadosSemana = fiados.filter(f => f.id >= fechaInicioSemana);
    let tEfBs = 0, tEfDol = 0, tPunto = 0, tPagoMovil = 0, tFiadosNuevos = 0; let unidadesVendidas = {};
    ventasSemana.forEach(venta => {
        if (venta.metodo === 'efectivoBs') tEfBs += venta.bolivares; if (venta.metodo === 'efectivoDolares') tEfDol += venta.dolares;
        if (venta.metodo === 'punto') tPunto += venta.bolivares; if (venta.metodo === 'pagoMovil') tPagoMovil += venta.bolivares;
        if (venta.detalles && !venta.esCobroFiado && !venta.esMixto) { 
            venta.detalles.forEach(item => { if(item.productoId) { if(!unidadesVendidas[item.productoId]) unidadesVendidas[item.productoId] = 0; unidadesVendidas[item.productoId] += item.cantidad; } });
        } else if (venta.detalles && venta.esMixto) { 
            venta.detalles.forEach(item => { if(item.productoId) { if(!unidadesVendidas[item.productoId]) unidadesVendidas[item.productoId] = 0; unidadesVendidas[item.productoId] += item.cantidad; } });
        }
    });
    fiadosSemana.forEach(f => tFiadosNuevos += f.montoDolares);
    contenedorTotales.innerHTML = `
        <h3 style="margin-top:0;">Dinero ingresado esta semana</h3>
        <ul style="font-size: 1.1em; line-height: 1.6; background: transparent;">
            <li style="border:none; padding:5px 0;"><strong>Efectivo (Bs):</strong> ${tEfBs.toFixed(2)} Bs</li>
            <li style="border:none; padding:5px 0;"><strong>Efectivo ($):</strong> $${tEfDol.toFixed(2)}</li>
            <li style="border:none; padding:5px 0;"><strong>Punto:</strong> ${tPunto.toFixed(2)} Bs</li>
            <li style="border:none; padding:5px 0;"><strong>Pago Móvil:</strong> ${tPagoMovil.toFixed(2)} Bs</li>
            <li style="border:none; padding:5px 0; color:#d9534f; border-top:1px solid #ccc; margin-top:5px;"><strong>Mercancía Fiada (Sin cobrar):</strong> $${tFiadosNuevos.toFixed(2)} (${(tFiadosNuevos * tasaCambio).toFixed(2)} Bs)</li>
        </ul>
    `;
    tbodyInventario.innerHTML = '';
    productos.forEach(prod => {
        let vendidos = unidadesVendidas[prod.id] || 0; let tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #ddd";
        tr.innerHTML = `<td style="padding: 10px;">${prod.nombre} (${prod.marca || 'Genérica'})</td><td style="padding: 10px; text-align:center;">${prod.stockDomingo}</td><td style="padding: 10px; text-align:center; color: #d9534f;">-${vendidos}</td><td style="padding: 10px; text-align:center; font-weight: bold; font-size:1.1em;">${prod.stockDomingo - vendidos}</td>`;
        tbodyInventario.appendChild(tr);
    });
}
document.getElementById('btnCerrarSemana').addEventListener('click', () => {
    if (!confirm("¿Hacer el Cierre Semanal? Se tomará una 'foto' del stock actual.")) return;
    fechaInicioSemana = Date.now(); productos.forEach(p => { p.stockDomingo = p.stock; });
    auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: "🔄 Se realizó el Cierre Semanal de Inventario." });
    guardarDatos(); actualizarResumenSemanal(); alert("¡Cierre exitoso!");
});

// ==========================================
// HISTORIAL, BÚSQUEDA Y PAGINACIÓN DOBLE
// ==========================================
let paginaActualHistorial = 1;
const ITEMS_POR_PAGINA = 50;
let paginaActualAuditoria = 1;
const ITEMS_POR_PAGINA_AUDITORIA = 50;

document.getElementById('btnFiltrarHistorial').addEventListener('click', () => { paginaActualHistorial = 1; actualizarHistorialCompleto(); });
document.getElementById('btnLimpiarFiltro').addEventListener('click', () => { document.getElementById('filtroDia').value = ''; document.getElementById('filtroMes').value = ''; paginaActualHistorial = 1; actualizarHistorialCompleto(); });
document.getElementById('btnPaginaAnterior').addEventListener('click', () => { if (paginaActualHistorial > 1) { paginaActualHistorial--; actualizarHistorialCompleto(); }});
document.getElementById('btnPaginaSiguiente').addEventListener('click', () => { paginaActualHistorial++; actualizarHistorialCompleto(); });
document.getElementById('btnFiltrarAuditoria').addEventListener('click', () => { paginaActualAuditoria = 1; actualizarHistorialAuditoria(); });
document.getElementById('btnLimpiarFiltroAuditoria').addEventListener('click', () => { document.getElementById('filtroDiaAuditoria').value = ''; document.getElementById('filtroMesAuditoria').value = ''; paginaActualAuditoria = 1; actualizarHistorialAuditoria(); });
document.getElementById('btnPaginaAnteriorAuditoria').addEventListener('click', () => { if (paginaActualAuditoria > 1) { paginaActualAuditoria--; actualizarHistorialAuditoria(); }});
document.getElementById('btnPaginaSiguienteAuditoria').addEventListener('click', () => { paginaActualAuditoria++; actualizarHistorialAuditoria(); });

function actualizarHistorialCompleto() {
    const contenedor = document.getElementById('listaHistorialCompleto'); 
    const mensajeResultados = document.getElementById('mensajeResultados');
    contenedor.innerHTML = ''; 
    let ventasAProcesar = [...ventasDiarias].reverse();
    const filtroDia = document.getElementById('filtroDia').value; 
    const filtroMes = document.getElementById('filtroMes').value; 
    
    if (filtroDia) {
        ventasAProcesar = ventasAProcesar.filter(venta => {
            const f = new Date(venta.id);
            return new Date(f.getTime() - (f.getTimezoneOffset() * 60000)).toISOString().split('T')[0] === filtroDia;
        });
    } else if (filtroMes) {
        ventasAProcesar = ventasAProcesar.filter(venta => {
            const f = new Date(venta.id);
            return new Date(f.getTime() - (f.getTimezoneOffset() * 60000)).toISOString().slice(0, 7) === filtroMes;
        });
    }
    const totalTransacciones = ventasAProcesar.length;
    const totalPaginas = Math.ceil(totalTransacciones / ITEMS_POR_PAGINA);
    if (paginaActualHistorial > totalPaginas && totalPaginas > 0) paginaActualHistorial = totalPaginas;
    const indiceInicio = (paginaActualHistorial - 1) * ITEMS_POR_PAGINA;
    const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
    const ventasPaginaActual = ventasAProcesar.slice(indiceInicio, indiceFin);
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');
    const textoPagina = document.getElementById('textoPaginaActual');
    
    if (totalTransacciones === 0) {
        mensajeResultados.innerText = "No hay resultados.";
        btnAnterior.style.display = 'none'; btnSiguiente.style.display = 'none'; textoPagina.style.display = 'none'; return;
    }
    mensajeResultados.innerText = `Mostrando ${indiceInicio + 1} al ${Math.min(indiceFin, totalTransacciones)} de ${totalTransacciones}`;
    textoPagina.innerText = `Página ${paginaActualHistorial} de ${totalPaginas}`;
    textoPagina.style.display = 'inline-block'; btnAnterior.style.display = 'inline-block'; btnSiguiente.style.display = 'inline-block';
    btnAnterior.style.visibility = (paginaActualHistorial > 1) ? 'visible' : 'hidden';
    btnSiguiente.style.visibility = (paginaActualHistorial < totalPaginas) ? 'visible' : 'hidden';
    
    ventasPaginaActual.forEach(venta => {
        let li = document.createElement('li'); 
        li.style.display = 'block'; 
        li.style.padding = '0';
        li.style.border = 'none';
        li.style.backgroundColor = 'transparent';

        let descripcionTicket = venta.detalles ? venta.detalles.map(i => `<b>${i.cantidad}x</b> ${i.nombre}`).join(", ") : "Varios / Venta Antigua";
        
        let detalleMixtoHTML = "";
        if (venta.esMixto) {
            detalleMixtoHTML = `<div style="margin-top: 8px; font-size: 0.85em; color: #c62828; background: #ffebee; padding: 6px 10px; border-radius: 4px; border: 1px solid #ffcdd2;">
                <strong>Ticket Total Original:</strong> $${venta.totalOriginalDol.toFixed(2)} <br> <strong>Abono a caja (Hoy):</strong> $${venta.dolares.toFixed(2)}
            </div>`;
        }

        let antiguedadMs = Date.now() - venta.id; let botonesHTML = "";
        if (antiguedadMs <= 604800000 && venta.detalles && !venta.esCobroFiado) {
            if (venta.esMixto) {
                botonesHTML = `<button onclick="deshacerVenta(${venta.id})" class="btn-peligro">Anular Venta Mixta</button>`;
            } else {
                botonesHTML = `<button onclick="abrirEditorVenta(${venta.id})" class="btn-alerta">Editar</button> <button onclick="deshacerVenta(${venta.id})" class="btn-peligro">Eliminar</button>`;
            }
        } else if (venta.esCobroFiado) {
            botonesHTML = `<button onclick="deshacerVenta(${venta.id})" class="btn-peligro">Anular Cobro</button>`;
        } else {
            botonesHTML = `<span style="color: gray; font-size: 0.8em; border: 1px solid #ccc; padding: 4px 8px; border-radius: 4px;">Bloqueado (> 7 días)</span>`;
        }

        li.innerHTML = `
            <div class="venta-card" style="background: #fff; box-shadow: var(--sombra); border-radius: 6px;">
                <div class="venta-header" style="padding: 10px 12px; background: #fafafa; border-radius: 6px 6px 0 0;">
                    <span>📅 <strong>${venta.fecha}</strong></span>
                    <div>
                        ${venta.esMixto ? `<span class="badge badge-mixto">Mixto</span>` : ''}
                        ${venta.esCobroFiado ? `<span class="badge badge-fiado">Cobro Deuda</span>` : ''}
                    </div>
                </div>
                <div class="venta-body" style="padding: 12px;">
                    <div style="color: #666; font-size: 0.85em; margin-bottom: 2px;">Artículos:</div>
                    <div>${descripcionTicket}</div>
                    ${detalleMixtoHTML}
                </div>
                <div class="venta-footer">
                    <div>
                        <span style="color: #666; font-size: 0.85em;">Monto Caja:</span><br>
                        <strong style="color: #2e7d32; font-size: 1.1em;">$${venta.dolares.toFixed(2)}</strong> 
                        <span style="font-size: 0.85em; color: gray;">(${venta.bolivares.toFixed(2)} Bs)</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #666; font-size: 0.85em;">Método:</span><br>
                        <span class="badge badge-metodo">${venta.metodo}</span>
                    </div>
                </div>
                <div class="venta-actions" style="padding: 8px 12px; border-top: 1px solid #eee; background: #fff;">
                    ${botonesHTML}
                </div>
            </div>
        `;
        contenedor.appendChild(li);
    });
}

function actualizarHistorialAuditoria() {
    const listAuditoria = document.getElementById('listaAuditoria');
    const mensajeResultadosAuditoria = document.getElementById('mensajeResultadosAuditoria');
    listAuditoria.innerHTML = '';
    let auditoriaAProcesar = [...auditoria].reverse();
    const filtroDia = document.getElementById('filtroDiaAuditoria').value;
    const filtroMes = document.getElementById('filtroMesAuditoria').value;
    
    if (filtroDia || filtroMes) {
        auditoriaAProcesar = auditoriaAProcesar.filter(log => {
            let fechaLocalStr = "";
            if (log.timestamp) {
                const d = new Date(log.timestamp);
                fechaLocalStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
            } else {
                try {
                    let partes = log.fecha.split(',')[0].split('/'); 
                    let dia = partes[0].padStart(2, '0'); let mes = partes[1].padStart(2, '0'); let anio = partes[2];
                    fechaLocalStr = `${anio}-${mes}-${dia}T00:00:00`; 
                } catch (e) { fechaLocalStr = ""; }
            }
            if (!fechaLocalStr) return true; 
            if (filtroDia) return fechaLocalStr.startsWith(filtroDia);
            if (filtroMes) return fechaLocalStr.startsWith(filtroMes);
        });
    }
    const totalTransacciones = auditoriaAProcesar.length;
    const totalPaginas = Math.ceil(totalTransacciones / ITEMS_POR_PAGINA_AUDITORIA);
    if (paginaActualAuditoria > totalPaginas && totalPaginas > 0) paginaActualAuditoria = totalPaginas;
    const indiceInicio = (paginaActualAuditoria - 1) * ITEMS_POR_PAGINA_AUDITORIA;
    const indiceFin = indiceInicio + ITEMS_POR_PAGINA_AUDITORIA;
    const logsPaginaActual = auditoriaAProcesar.slice(indiceInicio, indiceFin);
    const btnAnterior = document.getElementById('btnPaginaAnteriorAuditoria');
    const btnSiguiente = document.getElementById('btnPaginaSiguienteAuditoria');
    const textoPagina = document.getElementById('textoPaginaActualAuditoria');
    
    if (totalTransacciones === 0) {
        mensajeResultadosAuditoria.innerText = "No se encontraron registros.";
        btnAnterior.style.display = 'none'; btnSiguiente.style.display = 'none'; textoPagina.style.display = 'none'; return;
    }
    mensajeResultadosAuditoria.innerText = `Mostrando ${indiceInicio + 1} al ${Math.min(indiceFin, totalTransacciones)} de ${totalTransacciones}`;
    textoPagina.innerText = `Página ${paginaActualAuditoria} de ${totalPaginas}`;
    textoPagina.style.display = 'inline-block'; btnAnterior.style.display = 'inline-block'; btnSiguiente.style.display = 'inline-block';
    btnAnterior.style.visibility = (paginaActualAuditoria > 1) ? 'visible' : 'hidden';
    btnSiguiente.style.visibility = (paginaActualAuditoria < totalPaginas) ? 'visible' : 'hidden';
    
    logsPaginaActual.forEach(log => {
        let li = document.createElement('li'); li.style.marginBottom = "5px"; 
        li.innerHTML = `<strong>${log.fecha}</strong><br><span style="color:#555;">${log.detalle}</span>`; listAuditoria.appendChild(li); 
    });
}

window.abrirEditorVenta = function(idVenta) {
    const venta = ventasDiarias.find(v => v.id === idVenta); if(!venta) return;
    const editor = document.getElementById('editor-venta-container');
    let htmlForm = `<h3>Corrigiendo venta del: ${venta.fecha}</h3><p style="font-size:0.8em; color: gray;">Pon cantidad '0' para quitar artículo.</p>`;
    venta.detalles.forEach((item, index) => { htmlForm += `<div style="margin-bottom: 5px; display:flex; gap:10px; align-items:center;"><label style="flex:1;">${item.nombre} (Cant):</label> <input type="number" id="edit-qty-${index}" value="${item.cantidad}" min="0" style="width: 70px; margin-bottom:0;"></div>`; });
    htmlForm += `<div style="margin-top: 15px;"><label>Corregir Método:</label> <select id="edit-metodo"><option value="efectivoBs" ${venta.metodo === 'efectivoBs' ? 'selected' : ''}>Ef. Bs</option><option value="efectivoDolares" ${venta.metodo === 'efectivoDolares' ? 'selected' : ''}>Ef. $</option><option value="punto" ${venta.metodo === 'punto' ? 'selected' : ''}>Punto</option><option value="pagoMovil" ${venta.metodo === 'pagoMovil' ? 'selected' : ''}>Pago Móvil</option></select></div>`;
    htmlForm += `<div style="margin-top: 15px; display:flex; gap:10px;"><button onclick="guardarEdicionVenta(${venta.id})" class="btn-exito" style="flex:1;">Guardar Corrección</button> <button onclick="document.getElementById('editor-venta-container').style.display='none'" style="flex:1; background: #ccc; border:none; border-radius:4px; font-weight:bold;">Cancelar</button></div>`;
    editor.innerHTML = htmlForm; editor.style.display = 'block'; editor.scrollIntoView({ behavior: "smooth" });
}

window.guardarEdicionVenta = function(idVenta) {
    const indexVenta = ventasDiarias.findIndex(v => v.id === idVenta); if(indexVenta === -1) return;
    let venta = ventasDiarias[indexVenta]; let cambiosRegistrados = []; let nuevoMetodo = document.getElementById('edit-metodo').value;
    if (venta.metodo !== nuevoMetodo) { cambiosRegistrados.push(`Método de ${venta.metodo} a ${nuevoMetodo}`); venta.metodo = nuevoMetodo; }
    let nuevoTotalDolares = 0;
    venta.detalles.forEach((item, index) => {
        let nuevaCant = parseInt(document.getElementById(`edit-qty-${index}`).value) || 0;
        if (nuevaCant !== item.cantidad) {
            cambiosRegistrados.push(`${item.nombre} (Cant. de ${item.cantidad} a ${nuevaCant})`);
            if (item.productoId) { let prod = productos.find(p => p.id == item.productoId); if(prod) prod.stock += (item.cantidad - nuevaCant); }
            item.cantidad = nuevaCant; item.totalDolares = item.cantidad * item.precioUnitarioDolares;
        }
        nuevoTotalDolares += item.totalDolares;
    });
    venta.detalles = venta.detalles.filter(item => item.cantidad > 0);
    if (venta.detalles.length === 0) { alert("Venta sin artículos. Se anulará."); document.getElementById('editor-venta-container').style.display = 'none'; deshacerVenta(idVenta); return; }
    if (cambiosRegistrados.length > 0) {
        let tasaOriginalDeEseDia = venta.bolivares / venta.dolares; venta.dolares = nuevoTotalDolares; venta.bolivares = nuevoTotalDolares * tasaOriginalDeEseDia;
        auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: `✏️ Venta [${venta.fecha}] modificada: ${cambiosRegistrados.join(" | ")}.` });
        guardarDatos(); actualizarResumen(); actualizarListasProductos(); actualizarHistorialCompleto(); actualizarHistorialAuditoria(); alert("Venta corregida.");
    }
    document.getElementById('editor-venta-container').style.display = 'none';
}

window.deshacerVenta = function(idVenta) {
    if (!confirm("¿Seguro que quieres anular/eliminar esta operación?")) return;
    const indice = ventasDiarias.findIndex(v => v.id === idVenta); if (indice === -1) return;
    const ventaAnulada = ventasDiarias[indice];
    
    if (ventaAnulada.fiadoVinculado) {
        fiados = fiados.filter(f => f.id !== ventaAnulada.fiadoVinculado);
        auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: `⚠️ Se eliminó también la deuda pendiente vinculada a esta venta mixta.` });
    }
    if (ventaAnulada.esCobroFiado) {
        auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: `⚠️ Se ANULÓ el cobro de deuda de ${ventaAnulada.detalles[0].nombre}. Regístralo de nuevo manualmente si fue un error.` });
    } else if (ventaAnulada.detalles) {
        ventaAnulada.detalles.forEach(item => { if (item.productoId) { let prod = productos.find(p => p.id == item.productoId); if (prod) prod.stock += item.cantidad; } });
        auditoria.push({ timestamp: Date.now(), fecha: new Date().toLocaleString(), detalle: `🗑️ Se ANULÓ COMPLETAMENTE una venta del [${ventaAnulada.fecha}].` });
    }
    ventasDiarias.splice(indice, 1); guardarDatos(); actualizarListasProductos(); actualizarResumen();
    if(document.getElementById('pantalla-historial').style.display === 'block') { actualizarHistorialCompleto(); actualizarHistorialAuditoria(); }
}

// ==========================================
// EXPORTAR E IMPORTAR DATOS (BACKUP)
// ==========================================
document.getElementById('btnExportarDatos').addEventListener('click', () => {
    const datosCompletos = { tasaCambio: tasaCambio, marcas: marcas, productos: productos, ventasDiarias: ventasDiarias, fiados: fiados, auditoria: auditoria, fechaInicioSemana: fechaInicioSemana };
    const datosTexto = JSON.stringify(datosCompletos, null, 2);
    const blob = new Blob([datosTexto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fechaFormat = new Date().toISOString().split('T')[0]; 
    const a = document.createElement('a'); a.href = url; a.download = `Copia_Local_${fechaFormat}.json`; a.click();
    URL.revokeObjectURL(url); 
});

document.getElementById('btnImportarDatos').addEventListener('click', () => {
    const inputArchivo = document.getElementById('inputImportarArchivo'); const archivo = inputArchivo.files[0];
    if (!archivo) { alert("Por favor, selecciona un archivo primero."); return; }
    if (!confirm("⚠️ ¡PELIGRO! Esto borrará los datos actuales de este teléfono y los reemplazará por los del archivo. ¿Deseas continuar?")) return;
    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            if (!datosImportados.productos || !datosImportados.ventasDiarias) throw new Error("El archivo no tiene el formato correcto.");
            tasaCambio = datosImportados.tasaCambio || 650; marcas = datosImportados.marcas || ['Genérica'];
            productos = datosImportados.productos; ventasDiarias = datosImportados.ventasDiarias;
            fiados = datosImportados.fiados || []; auditoria = datosImportados.auditoria || []; fechaInicioSemana = datosImportados.fechaInicioSemana || Date.now();
            guardarDatos(); alert("✅ Datos cargados correctamente. El sistema se recargará para aplicar los cambios."); location.reload(); 
        } catch (error) { alert("Error al cargar el archivo: " + error.message); }
    };
    lector.readAsText(archivo);
});

iniciarPrograma();