document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ peticiones.js cargado correctamente");

  const botonIA = document.getElementById("btn-ia");
  const tablaBody = document.querySelector("#tabla-candidatos tbody");

  if (!botonIA || !tablaBody) {
    console.error("❌ No se encontró el botón IA o la tabla.");
    return;
  }

  // 🔒 Asegurar que el botón nunca actúe como submit
  botonIA.setAttribute("type", "button");
  botonIA.removeAttribute("form");

  // 🚫 Bloquear cualquier submit global
  document.querySelectorAll("form").forEach(f => {
    f.addEventListener("submit", e => e.preventDefault());
  });

  // 🚫 Evitar recargas del navegador o scripts externos
  window.addEventListener("beforeunload", e => {
    e.stopImmediatePropagation();
    e.preventDefault();
  });

  // ============================
  // ⚙️ FUNCIÓN PARA ACTUALIZAR TABLA CON PUNTAJES
  // ============================
  function actualizarTablaConPuntajes(resultados) {
    const filas = tablaBody.querySelectorAll("tr");
    
    filas.forEach((fila) => {
      const nombreCandidato = fila.querySelector("strong")?.textContent.trim().toLowerCase();
      const resultadoIA = resultados.find((r) =>
        r.nombre.toLowerCase().includes(nombreCandidato) || 
        nombreCandidato.includes(r.nombre.toLowerCase())
      );
      
      // 🎯 SOLO actualizar la columna de PUNTAJE (columna 3)
      const celdaPuntaje = fila.querySelector("td:nth-child(3)");
      
      if (resultadoIA && celdaPuntaje) {
        // 🔥 Python ya envía el puntaje como porcentaje (51.02, 50.37, etc.)
        // NO multiplicar por nada
        const puntajePorcentaje = resultadoIA.puntaje;
        
        celdaPuntaje.innerHTML = `
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-success" style="width: ${Math.min(puntajePorcentaje, 100)}%;"></div>
          </div>
          <small class="text-muted"><strong>${puntajePorcentaje.toFixed(1)}%</strong></small>
        `;
      } else if (celdaPuntaje) {
        celdaPuntaje.innerHTML = `<small class="text-muted">N/A</small>`;
      }

      // 🔒 GARANTIZAR que los botones NUNCA cambien
      const celdaAcciones = fila.querySelector("td:nth-child(5)");
      if (celdaAcciones) {
        const tieneEvaluar = celdaAcciones.querySelector(".btn-evaluar");
        
        if (!tieneEvaluar) {
          celdaAcciones.innerHTML = `
            <button class="btn btn-sm btn-evaluar me-1">Evaluar</button>
            <button class="btn btn-sm btn-outline-secondary me-1">Asignar</button>
            <button class="btn btn-sm btn-outline-dark btn-seguimiento">Seguimiento</button>          `;
        }
      }

      // 🔒 La columna ESTADO siempre debe estar "Pendiente"
      const celdaEstado = fila.querySelector("td:nth-child(4)");
      if (celdaEstado && !celdaEstado.querySelector('.badge')) {
        celdaEstado.innerHTML = `<span class="badge bg-light text-dark border">Pendiente</span>`;
      }
    });
  }

  // ============================
  // 🧠 EVENTO DEL BOTÓN IA
  // ============================
  botonIA.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("🧠 Botón IA presionado — iniciando análisis...");

    window.onbeforeunload = () => false;

    botonIA.disabled = true;
    const originalText = botonIA.innerHTML;
    botonIA.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span> Analizando...
    `;

    tablaBody.querySelectorAll("tr").forEach((fila) => {
      const celdaPuntaje = fila.querySelector("td:nth-child(3)");
      if (celdaPuntaje) {
        celdaPuntaje.innerHTML = `
          <div class="spinner-border text-danger spinner-border-sm" role="status"></div>
        `;
      }
    });

    try {
      const res = await fetch("http://localhost:3001/analizar-cvs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil: "Monitoría en Ingeniería de Sistemas",
        }),
      });

      const data = await res.json();
      console.log("✅ Resultados IA recibidos:", data);

      if (Array.isArray(data) && data.length > 0) {
        actualizarTablaConPuntajes(data);
      } else {
        alert("⚠️ No se encontraron coincidencias con la IA.");
      }
    } catch (error) {
      console.error("❌ Error al analizar con IA:", error);
      alert("❌ Error al analizar las hojas de vida con la IA.");
    } finally {
      window.onbeforeunload = null;
      botonIA.disabled = false;
      botonIA.innerHTML = originalText;
    }
  });

// ============================
// 🪟 MODAL DE SEGUIMIENTO (solo vista)
// ============================
document.body.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-seguimiento")) {
    const fila = e.target.closest("tr");
    const nombre = fila?.querySelector("strong")?.textContent.trim() || "Candidato";

    const titulo = document.getElementById("modalSeguimientoLabel");
    if (titulo) titulo.textContent = `Evaluación de Candidato: ${nombre}`;

    const modalEl = document.getElementById("modalSeguimiento");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // 🔹 Cerrar el modal al hacer clic en Guardar
  if (e.target.id === "guardarEvaluacion") {
    const modalEl = document.getElementById("modalSeguimiento");
    const modal = bootstrap.Modal.getInstance(modalEl); // Obtener la instancia activa
    if (modal) {
      alert("Evaluación guardada correctamente ✅");
      modal.hide(); // 🔸 Cierra solo este modal
    }
  }
});


  // ============================
  // ♻️ NO RESTAURAR RESULTADOS AUTOMÁTICAMENTE
  // ============================
  // La tabla siempre debe iniciar sin análisis previo
  console.log("✅ Sistema listo para análisis manual");
});