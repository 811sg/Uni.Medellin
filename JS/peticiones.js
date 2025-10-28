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
  // ⚙️ FUNCIÓN PARA ACTUALIZAR TABLA CON IA
  // ============================
  function actualizarTablaConPuntajes(resultados) {
    const filas = tablaBody.querySelectorAll("tr");
    filas.forEach((fila) => {
      const nombreCandidato = fila.querySelector("strong")?.textContent.trim().toLowerCase();
      const resultadoIA = resultados.find((r) =>
        r.nombre.toLowerCase().includes(nombreCandidato)
      );
      const celdaPuntaje = fila.querySelector("td:nth-child(3)");
      if (resultadoIA) {
        celdaPuntaje.innerHTML = `
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-success" style="width: ${(resultadoIA.puntaje * 100).toFixed(1)}%;"></div>
          </div>
          <small class="text-muted"><strong>${(resultadoIA.puntaje * 100).toFixed(1)}%</strong></small>
        `;
      } else {
        celdaPuntaje.innerHTML = `<small class="text-muted">Sin resultado</small>`;
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

    // Bloquear recarga manual mientras analiza
    window.onbeforeunload = () => false;

    botonIA.disabled = true;
    const originalText = botonIA.innerHTML;
    botonIA.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span> Analizando...
    `;

    // Mostrar progreso en tabla
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
        localStorage.setItem("resultadosIA", JSON.stringify(data));
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
  // ♻️ RESTAURAR RESULTADOS GUARDADOS
  // ============================
  const prevResults = localStorage.getItem("resultadosIA");
  if (prevResults) {
    try {
      const data = JSON.parse(prevResults);
      actualizarTablaConPuntajes(data);
      console.log("♻️ Resultados IA restaurados.");
    } catch (err) {
      console.warn("⚠️ Error al restaurar resultados IA:", err);
    }
  }
});
