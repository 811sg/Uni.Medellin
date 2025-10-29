document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 p-profesores.js iniciando...");
  
  const tablaBody = document.querySelector("#tabla-candidatos tbody");
  const btnIA = document.getElementById("btn-ia");
  const totalCandidatos = document.getElementById("total-candidatos");
  
  let candidatosData = []; // Guardar datos completos de candidatos
  let yaHayAsignado = false; // Control para saber si ya hay alguien asignado

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
  // 📥 Cargar hojas de vida desde BD
  // =============================
  async function cargarCandidatos() {
    try {
      const res = await fetch("http://localhost:3001/hojas-de-vida");
      const data = await res.json();
      
      candidatosData = data; // Guardar datos completos

      // Verificar si ya hay alguien asignado
      yaHayAsignado = data.some(cv => cv.estado === 'Asignado');
      console.log(`📊 Ya hay asignado: ${yaHayAsignado}`);

      tablaBody.innerHTML = "";

      if (data.length === 0) {
        tablaBody.innerHTML = `
          <tr><td colspan="5" class="text-center text-muted">No hay hojas de vida cargadas aún.</td></tr>
        `;
      } else {
        data.forEach((cv) => {
          const nombreLimpio = cv.nombre.trim().replace(/\s+/g, ' ');
          const estado = cv.estado || 'Pendiente';
          const puntaje = cv.puntaje_ia ? `${cv.puntaje_ia.toFixed(1)}%` : 'N/A';
          
          // Determinar color del badge según estado
          let badgeClass = 'bg-light text-dark border';
          if (estado === 'Evaluado') badgeClass = 'bg-info text-white';
          if (estado === 'Asignado') badgeClass = 'bg-success text-white';
          
          // Si ya hay alguien asignado y este NO es el asignado, deshabilitar botón Asignar
          const deshabilitarAsignar = yaHayAsignado && estado !== 'Asignado';
          
          tablaBody.innerHTML += `
            <tr data-id="${cv.id}" data-nombre="${nombreLimpio.toLowerCase()}" data-correo="${cv.correo}">
              <td><strong>${nombreLimpio}</strong></td>
              <td>${cv.correo}</td>
              <td class="col-puntaje">${puntaje}</td>
              <td><span class="badge ${badgeClass}">${estado}</span></td>
              <td class="text-center">
                <button class="btn btn-sm btn-evaluar me-1" data-id="${cv.id}" data-nombre="${nombreLimpio}">
                  Evaluar
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1 btn-asignar" 
                        data-id="${cv.id}" 
                        data-nombre="${nombreLimpio}"
                        ${deshabilitarAsignar ? 'disabled' : ''}
                        ${estado === 'Asignado' ? 'disabled' : ''}>
                  ${estado === 'Asignado' ? 'Asignado ✓' : 'Asignar'}
                </button>
                <button class="btn btn-sm btn-outline-dark btn-seguimiento" data-id="${cv.id}" data-nombre="${nombreLimpio}">
                  Seguimiento
                </button>
              </td>
            </tr>`;
        });
        
        // Agregar event listeners a los botones
        agregarEventListeners();
      }

      totalCandidatos.textContent = `Total candidatos: ${data.length}`;
    } catch (error) {
      console.error("❌ Error al cargar candidatos:", error);
    }
  }

  // =============================
  // 🎯 EVENT LISTENERS PARA BOTONES
  // =============================
  function agregarEventListeners() {
    // 🔍 BOTÓN EVALUAR
    document.querySelectorAll('.btn-evaluar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const candidatoId = btn.getAttribute('data-id');
        const candidatoNombre = btn.getAttribute('data-nombre');
        
        console.log(`🔍 Evaluando candidato ID: ${candidatoId}`);
        
        // Buscar el candidato en los datos guardados
        const candidato = candidatosData.find(c => c.id == candidatoId);
        
        if (!candidato) {
          alert('❌ No se encontró información del candidato');
          return;
        }
        
        // 📄 Abrir PDF en nueva pestaña
        const urlPDF = `http://localhost:3001/download-cv/${candidatoId}`;
        window.open(urlPDF, '_blank');
        
        // 💾 Actualizar estado a "Evaluado" en BD
        try {
          const res = await fetch(`http://localhost:3001/evaluar-candidato/${candidatoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (res.ok) {
            console.log(`✅ Candidato ${candidatoNombre} marcado como Evaluado`);
            
            // Actualizar visualmente el estado en la tabla
            const fila = btn.closest('tr');
            const celdaEstado = fila.querySelector('td:nth-child(4)');
            if (celdaEstado) {
              celdaEstado.innerHTML = `<span class="badge bg-info text-white">Evaluado</span>`;
            }
          } else {
            alert('❌ Error al actualizar el estado');
          }
        } catch (error) {
          console.error('❌ Error al evaluar:', error);
          alert('❌ Error al conectar con el servidor');
        }
      });
    });
    
    // ⭐ BOTÓN ASIGNAR
    document.querySelectorAll('.btn-asignar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const candidatoId = btn.getAttribute('data-id');
        const candidatoNombre = btn.getAttribute('data-nombre');
        
        // Confirmar asignación
        const confirmar = confirm(
          `¿Estás seguro de asignar a ${candidatoNombre} como monitor?\n\n` +
          `⚠️ Solo puedes asignar UN monitor. Esta acción bloqueará a los demás candidatos.`
        );
        
        if (!confirmar) return;
        
        console.log(`⭐ Asignando candidato ID: ${candidatoId}`);
        
        // Obtener correo del profesor (guardado en sessionStorage o localStorage)
        const profesorCorreo = localStorage.getItem('userEmail') || 'profesor@soydocente.com';
        
        try {
          const res = await fetch(`http://localhost:3001/asignar-monitor/${candidatoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profesorCorreo })
          });
          
          const data = await res.json();
          
          if (res.ok) {
            console.log(`✅ Monitor asignado: ${candidatoNombre}`);
            alert(`✅ ${candidatoNombre} ha sido asignado como monitor exitosamente.`);
            
            yaHayAsignado = true;
            
            // Actualizar toda la tabla
            const filas = tablaBody.querySelectorAll('tr');
            filas.forEach(fila => {
              const filaId = fila.getAttribute('data-id');
              const celdaEstado = fila.querySelector('td:nth-child(4)');
              const btnAsignar = fila.querySelector('.btn-asignar');
              
              if (filaId == candidatoId) {
                // Este es el asignado
                if (celdaEstado) {
                  celdaEstado.innerHTML = `<span class="badge bg-success text-white">Asignado</span>`;
                }
                if (btnAsignar) {
                  btnAsignar.textContent = 'Asignado ✓';
                  btnAsignar.disabled = true;
                }
              } else {
                // Los demás se deshabilitan
                if (btnAsignar) {
                  btnAsignar.disabled = true;
                  btnAsignar.classList.add('text-muted');
                }
              }
            });
            
          } else {
            alert(`❌ ${data.error || 'Error al asignar monitor'}`);
          }
          
        } catch (error) {
          console.error('❌ Error al asignar:', error);
          alert('❌ Error al conectar con el servidor');
        }
      });
    });
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
      
      tablaBody.appendChild(fila);
    });
    
    // Re-agregar event listeners después de reordenar
    agregarEventListeners();
    
    console.log("✅ Tabla reordenada correctamente");
  }

  // =============================
  // 🤖 Analizar CVs con IA
  // =============================
  if (btnIA) {
    btnIA.setAttribute("type", "button");
    
    const nuevoBoton = btnIA.cloneNode(true);
    btnIA.parentNode.replaceChild(nuevoBoton, btnIA);
    const btnIALimpio = document.getElementById("btn-ia");
    
    btnIALimpio.addEventListener("click", async (e) => {
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

        // 💾 Guardar puntajes en BD
        await fetch("http://localhost:3001/guardar-puntajes-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultados })
        });

        // ✅ REORDENAR tabla según puntajes de la IA
        reordenarYActualizarTabla(resultados);
        
        totalCandidatos.textContent = `Total analizados: ${resultados.length}`;
        
        console.log("✅ ANÁLISIS COMPLETADO - TABLA ACTUALIZADA");
        
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
  // 🚀 INICIAR CARGA
  // =============================
  console.log("📄 Cargando candidatos...");
  await cargarCandidatos();
  console.log("✅ Sistema listo");
  
  // =============================
  // 🔄 BOTONES DE TESTING
  // =============================
  
  // Botón: Resetear todos los estados
  const btnResetEstados = document.getElementById("btn-reset-estados");
  if (btnResetEstados) {
    btnResetEstados.addEventListener("click", async () => {
      const confirmar = confirm(
        "⚠️ ¿Estás seguro?\n\n" +
        "Esto reseteará TODOS los candidatos a estado 'Pendiente'.\n" +
        "Se perderán las evaluaciones y asignaciones."
      );
      
      if (!confirmar) return;
      
      btnResetEstados.disabled = true;
      btnResetEstados.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Reseteando...';
      
      try {
        const res = await fetch("http://localhost:3001/reset-estados", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
          alert("✅ Estados reseteados correctamente. Recargando página...");
          location.reload();
        } else {
          alert("❌ Error al resetear estados");
        }
      } catch (error) {
        console.error("❌ Error:", error);
        alert("❌ Error al conectar con el servidor");
      } finally {
        btnResetEstados.disabled = false;
        btnResetEstados.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i> Resetear Estados';
      }
    });
  }
  
  // Botón: Quitar asignación (mantener evaluaciones)
  const btnQuitarAsignacion = document.getElementById("btn-quitar-asignacion");
  if (btnQuitarAsignacion) {
    btnQuitarAsignacion.addEventListener("click", async () => {
      const confirmar = confirm(
        "¿Quitar la asignación actual?\n\n" +
        "Esto permitirá asignar a otro candidato.\n" +
        "Las evaluaciones se mantendrán."
      );
      
      if (!confirmar) return;
      
      btnQuitarAsignacion.disabled = true;
      btnQuitarAsignacion.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Quitando...';
      
      try {
        const res = await fetch("http://localhost:3001/quitar-asignacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        
        const data = await res.json();
        
        if (res.ok) {
          alert(`✅ ${data.mensaje}\n\nRecargando página...`);
          location.reload();
        } else {
          alert(`⚠️ ${data.mensaje}`);
        }
      } catch (error) {
        console.error("❌ Error:", error);
        alert("❌ Error al conectar con el servidor");
      } finally {
        btnQuitarAsignacion.disabled = false;
        btnQuitarAsignacion.innerHTML = '<i class="bi bi-x-circle me-1"></i> Quitar Asignación';
      }
    });
  }
});