document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 p-profesores.js iniciando...");
  
  const tablaBody = document.querySelector("#tabla-candidatos tbody");
  const btnIA = document.getElementById("btn-ia");
  const totalCandidatos = document.getElementById("total-candidatos");

  // 🔥 BLOQUEAR CUALQUIER RECARGA DE PÁGINA
  window.addEventListener("beforeunload", (e) => {
    e.preventDefault();
    return false;
  });

  // 🔥 PREVENIR SUBMIT DE FORMULARIOS
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      console.log("⛔ Submit bloqueado");
      return false;
    });
  });

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
    
    const filasArray = Array.from(tablaBody.querySelectorAll("tr"));
    console.log(`📋 Total filas en tabla: ${filasArray.length}`);
    
    function normalizarNombre(nombre) {
      return nombre
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }
    
    const mapaResultados = new Map();
    resultados.forEach(resultado => {
      const nombreNormalizado = normalizarNombre(resultado.nombre);
      const puntajePorcentaje = resultado.puntaje;
      
      mapaResultados.set(nombreNormalizado, {
        nombre: resultado.nombre,
        puntaje: puntajePorcentaje
      });
      console.log(`🔍 IA encontró: "${resultado.nombre}" → ${puntajePorcentaje.toFixed(2)}%`);
    });
    
    filasArray.forEach(fila => {
      const nombreFila = fila.getAttribute("data-nombre");
      const nombreFilaNormalizado = normalizarNombre(nombreFila);
      
      let resultadoMatch = null;
      
      if (mapaResultados.has(nombreFilaNormalizado)) {
        resultadoMatch = mapaResultados.get(nombreFilaNormalizado);
        console.log(`✅ Match exacto: "${nombreFila}" ↔ "${resultadoMatch.nombre}" (${resultadoMatch.puntaje}%)`);
      } else {
        for (const [nombreIA, data] of mapaResultados) {
          if (nombreFilaNormalizado.includes(nombreIA) || nombreIA.includes(nombreFilaNormalizado)) {
            resultadoMatch = data;
            console.log(`✅ Match parcial: "${nombreFila}" ↔ "${data.nombre}" (${data.puntaje}%)`);
            break;
          }
        }
        
        if (!resultadoMatch) {
          console.log(`⚠️ No match para: "${nombreFila}"`);
        }
      }
      
      if (resultadoMatch) {
        fila.setAttribute("data-puntaje", resultadoMatch.puntaje);
      } else {
        fila.setAttribute("data-puntaje", "-1");
      }
    });
    
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
    
    tablaBody.innerHTML = "";
    filasArray.forEach(fila => {
      const puntaje = parseFloat(fila.getAttribute("data-puntaje"));
      const colPuntaje = fila.querySelector(".col-puntaje");
      
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
      
      const colEstado = fila.querySelector("td:nth-child(4)");
      if (colEstado) {
        colEstado.innerHTML = `<span class="badge bg-light text-dark border">Pendiente</span>`;
      }
      
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
      
      tablaBody.appendChild(fila);
    });
    
    console.log("✅ Tabla reordenada correctamente");
  }

  // =============================
  // 🤖 Analizar CVs con IA al dar click
  // =============================
  if (btnIA) {
    // 🔥 ASEGURAR QUE EL BOTÓN NUNCA CAUSE SUBMIT
    btnIA.setAttribute("type", "button");
    
    // 🔥 ELIMINAR CUALQUIER EVENTO PREVIO
    const nuevoBoton = btnIA.cloneNode(true);
    btnIA.parentNode.replaceChild(nuevoBoton, btnIA);
    const btnIALimpio = document.getElementById("btn-ia");
    
    btnIALimpio.addEventListener("click", async (e) => {
      // 🔥 BLOQUEAR TODO TIPO DE PROPAGACIÓN
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      console.log("🧠 Botón IA presionado — INICIANDO ANÁLISIS");
      
      btnIALimpio.disabled = true;
      const originalText = btnIALimpio.innerHTML;
      btnIALimpio.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Analizando...`;

      const filas = tablaBody.querySelectorAll("tr");
      filas.forEach((fila) => {
        const colPuntaje = fila.querySelector(".col-puntaje");
        if (colPuntaje) {
          colPuntaje.innerHTML = `<div class="spinner-border text-danger spinner-border-sm"></div>`;
        }
      });

      try {
        console.log("📡 Enviando petición a la IA...");
        
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

        if (!res.ok) {
          throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const resultados = await res.json();

        console.log("🤖 Análisis de IA completado");
        console.log("📊 Resultados recibidos:", resultados);

        // ✅ REORDENAR tabla según puntajes de la IA
        reordenarYActualizarTabla(resultados);
        
        totalCandidatos.textContent = `Total analizados: ${resultados.length}`;
        
        console.log("✅ ANÁLISIS COMPLETADO - TABLA ACTUALIZADA");
        
        // 🔥 FORZAR QUE LA PÁGINA NO SE RECARGUE
        return false;
        
      } catch (error) {
        console.error("❌ Error al analizar:", error);
        alert("❌ Error al analizar las hojas de vida con la IA.");
        
        const filas = tablaBody.querySelectorAll("tr");
        filas.forEach((fila) => {
          const colPuntaje = fila.querySelector(".col-puntaje");
          if (colPuntaje) colPuntaje.innerHTML = `<small class="text-muted">N/A</small>`;
        });
        
      } finally {
        btnIALimpio.disabled = false;
        btnIALimpio.innerHTML = originalText;
        
        console.log("🔄 Botón IA restaurado");
      }
    });
    
    console.log("✅ Botón IA configurado correctamente");
  }

  // =============================
  // 🚀 Al cargar la página: SOLO mostrar datos originales
  // =============================
  console.log("📄 Cargando candidatos en orden original (sin IA)...");
  await cargarCandidatos();
  console.log("✅ Tabla cargada en orden original - lista para análisis");
});