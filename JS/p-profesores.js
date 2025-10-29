document.addEventListener("DOMContentLoaded", async () => {
  const tablaBody = document.querySelector("#tabla-candidatos tbody");
  const btnIA = document.getElementById("btn-ia");
  const totalCandidatos = document.getElementById("total-candidatos");

  // =============================
  // 📥 Cargar hojas de vida sin IA (solo base de datos)
  // =============================
  async function cargarCandidatos() {
    try {
      const res = await fetch("http://localhost:3001/hojas-de-vida");
      const data = await res.json();

      tablaBody.innerHTML = "";

      if (data.length === 0) {
        tablaBody.innerHTML = `
          <tr><td colspan="5" class="text-center text-muted">No hay hojas de vida cargadas aún.</td></tr>
        `;
      } else {
        data.forEach((cv) => {
          // 🔧 Limpiar nombre de espacios extra
          const nombreLimpio = cv.nombre.trim().replace(/\s+/g, ' ');
          
          tablaBody.innerHTML += `
            <tr data-nombre="${nombreLimpio.toLowerCase()}" data-correo="${cv.correo}">
              <td><strong>${nombreLimpio}</strong></td>
              <td>${cv.correo}</td>
              <td class="col-puntaje">N/A</td>
              <td><span class="badge bg-light text-dark border">Pendiente</span></td>
              <td class="text-center">
                <button class="btn btn-sm btn-evaluar me-1">Evaluar</button>
                <button class="btn btn-sm btn-outline-secondary me-1">Asignar</button>
                <button class="btn btn-sm btn-outline-dark">Seguimiento</button>
              </td>
            </tr>`;
        });
      }

      totalCandidatos.textContent = `Total candidatos: ${data.length}`;
    } catch (error) {
      console.error("❌ Error al cargar candidatos:", error);
    }
  }

  // =============================
  // 🔄 REORDENAR TABLA SEGÚN PUNTAJES DE IA
  // =============================
  function reordenarYActualizarTabla(resultados) {
    console.log("🎯 Reordenando tabla según análisis de IA...");
    console.log("📊 Resultados recibidos:", resultados);
    
    // Obtener todas las filas actuales
    const filasArray = Array.from(tablaBody.querySelectorAll("tr"));
    console.log(`📋 Total filas en tabla: ${filasArray.length}`);
    
    // 🔧 FUNCIÓN PARA NORMALIZAR NOMBRES (quita acentos, espacios extra, minúsculas)
    function normalizarNombre(nombre) {
      return nombre
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }
    
    // Crear un mapa de resultados por nombre (normalizado)
    const mapaResultados = new Map();
    resultados.forEach(resultado => {
      const nombreNormalizado = normalizarNombre(resultado.nombre);
      
      // 🔥 Manejar puntajes que pueden venir como decimal (0.5102) o porcentaje (51.02)
      let puntajePorcentaje = resultado.puntaje;
      if (puntajePorcentaje <= 1) {
        puntajePorcentaje = puntajePorcentaje * 100;
      }
      
      mapaResultados.set(nombreNormalizado, {
        nombre: resultado.nombre,
        puntaje: puntajePorcentaje
      });
      console.log(`🔍 IA encontró: "${resultado.nombre}" → ${puntajePorcentaje.toFixed(2)}%`);
    });
    
    // Asignar puntajes a cada fila
    filasArray.forEach(fila => {
      const nombreFila = fila.getAttribute("data-nombre");
      const nombreFilaNormalizado = normalizarNombre(nombreFila);
      
      let resultadoMatch = null;
      
      // Buscar coincidencia exacta
      if (mapaResultados.has(nombreFilaNormalizado)) {
        resultadoMatch = mapaResultados.get(nombreFilaNormalizado);
        console.log(`✅ Match exacto: "${nombreFila}" ↔ "${resultadoMatch.nombre}" (${resultadoMatch.puntaje}%)`);
      } else {
        // Buscar coincidencia parcial
        for (const [nombreIA, data] of mapaResultados) {
          if (nombreFilaNormalizado.includes(nombreIA) || nombreIA.includes(nombreFilaNormalizado)) {
            resultadoMatch = data;
            console.log(`✅ Match parcial: "${nombreFila}" ↔ "${data.nombre}" (${data.puntaje}%)`);
            break;
          }
        }
        
        if (!resultadoMatch) {
          console.log(`⚠️ No match para: "${nombreFila}" (normalizado: "${nombreFilaNormalizado}")`);
        }
      }
      
      // Guardar el puntaje en un atributo data para ordenar después
      if (resultadoMatch) {
        fila.setAttribute("data-puntaje", resultadoMatch.puntaje);
      } else {
        fila.setAttribute("data-puntaje", "-1");
      }
    });
    
    // 🔥 ORDENAR filas de MAYOR a MENOR puntaje
    filasArray.sort((a, b) => {
      const puntajeA = parseFloat(a.getAttribute("data-puntaje"));
      const puntajeB = parseFloat(b.getAttribute("data-puntaje"));
      return puntajeB - puntajeA;
    });
    
    console.log("📊 Orden final después de IA:");
    filasArray.forEach((fila, idx) => {
      const nombre = fila.querySelector("strong").textContent;
      const puntaje = fila.getAttribute("data-puntaje");
      console.log(`  ${idx + 1}. ${nombre} - ${puntaje}%`);
    });
    
    // Limpiar tabla y reinsertar filas ordenadas
    tablaBody.innerHTML = "";
    filasArray.forEach(fila => {
      const puntaje = parseFloat(fila.getAttribute("data-puntaje"));
      const colPuntaje = fila.querySelector(".col-puntaje");
      
      // Actualizar visualización del puntaje
      if (puntaje >= 0 && colPuntaje) {
        colPuntaje.innerHTML = `
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-success" style="width: ${Math.min(puntaje, 100)}%;"></div>
          </div>
          <small class="text-muted"><strong>${puntaje.toFixed(1)}%</strong></small>
        `;
      } else if (colPuntaje) {
        colPuntaje.innerHTML = `<small class="text-muted">Sin resultado</small>`;
      }
      
      // 🔒 GARANTIZAR que el estado siempre sea "Pendiente"
      const colEstado = fila.querySelector("td:nth-child(4)");
      if (colEstado) {
        colEstado.innerHTML = `<span class="badge bg-light text-dark border">Pendiente</span>`;
      }
      
      // 🔒 GARANTIZAR que los botones estén correctos
      const colAcciones = fila.querySelector("td:nth-child(5)");
      if (colAcciones) {
        const tieneBotonEvaluar = colAcciones.querySelector(".btn-evaluar");
        
        if (!tieneBotonEvaluar) {
          colAcciones.innerHTML = `
            <button class="btn btn-sm btn-evaluar me-1">Evaluar</button>
            <button class="btn btn-sm btn-outline-secondary me-1">Asignar</button>
            <button class="btn btn-sm btn-outline-dark">Seguimiento</button>
          `;
        }
      }
      
      // Reinsertar fila en la tabla
      tablaBody.appendChild(fila);
    });
    
    console.log("✅ Tabla reordenada correctamente");
  }

  // =============================
  // 🤖 Analizar CVs con IA al dar click (SOLO UNA VEZ)
  // =============================
  let analisisRealizado = false;  // 🔒 Variable para controlar análisis único
  
  if (btnIA) {
    btnIA.addEventListener("click", async () => {
      // 🔒 Si ya se analizó, no permitir otro análisis
      if (analisisRealizado) {
        alert("⚠️ El análisis ya fue realizado. Recarga la página para analizar nuevamente.");
        return;
      }
      
      btnIA.disabled = true;
      const originalText = btnIA.innerHTML;
      btnIA.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Analizando...`;

      // Mostrar spinner en puntajes mientras analiza
      const filas = tablaBody.querySelectorAll("tr");
      filas.forEach((fila) => {
        const colPuntaje = fila.querySelector(".col-puntaje");
        if (colPuntaje) {
          colPuntaje.innerHTML = `<div class="spinner-border text-danger spinner-border-sm"></div>`;
        }
      });

      try {
        const res = await fetch("http://localhost:3001/analizar-cvs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            perfil: `Buscamos estudiante para monitoría de Análisis de Datos con:
            - Dominio de Python (Pandas, NumPy, Matplotlib)
            - Conocimientos en estadística y análisis de datos
            - Experiencia previa en enseñanza, tutorías o monitorías
            - Excelente comunicación y paciencia
            - Promedio superior a 4.0
            - Capacidad para explicar conceptos complejos claramente`
          }),
        });

        if (!res.ok) throw new Error("Error al conectar con la IA.");
        const resultados = await res.json();

        console.log("🤖 Análisis de IA completado");
        console.log("📊 Resultados recibidos:", resultados);

        // ✅ REORDENAR tabla según puntajes de la IA
        reordenarYActualizarTabla(resultados);
        
        totalCandidatos.textContent = `Total analizados: ${resultados.length}`;
        
      } catch (error) {
        console.error("❌ Error al analizar:", error);
        alert("❌ Error al analizar las hojas de vida con la IA.");
        
        // Restaurar "N/A" en caso de error
        const filas = tablaBody.querySelectorAll("tr");
        filas.forEach((fila) => {
          const colPuntaje = fila.querySelector(".col-puntaje");
          if (colPuntaje) colPuntaje.innerHTML = `<small class="text-muted">N/A</small>`;
        });
        
      } finally {
        btnIA.disabled = false;
        btnIA.innerHTML = originalText;
      }
    });
  }

  // =============================
  // 🚀 Al cargar la página: SOLO mostrar datos originales
  // =============================
  console.log("🔄 Cargando candidatos en orden original (sin IA)...");
  await cargarCandidatos();
  console.log("✅ Tabla cargada en orden original - lista para análisis");
});