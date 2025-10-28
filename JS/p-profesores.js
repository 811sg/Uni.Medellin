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
          tablaBody.innerHTML += `
            <tr>
              <td><strong>${cv.nombre}</strong></td>
              <td>${cv.correo}</td>
              <td>-</td>
              <td><span class="badge bg-secondary">Pendiente</span></td>
              <td><button class="btn btn-outline-danger btn-sm">Evaluar</button></td>
            </tr>`;
        });
      }

      totalCandidatos.textContent = `Total candidatos: ${data.length}`;
    } catch (error) {
      console.error("❌ Error al cargar candidatos:", error);
    }
  }

  // =============================
  // 🤖 Analizar CVs con IA al dar click
  // =============================
  btnIA.addEventListener("click", async () => {
    btnIA.disabled = true;
    const originalText = btnIA.innerHTML;
    btnIA.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Analizando...`;

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

      // Reordenar la tabla con resultados
      tablaBody.innerHTML = "";
      resultados.forEach((cv, index) => {
        const badge =
          index === 0
            ? '<span class="badge bg-success">Más compatible</span>'
            : '<span class="badge bg-info">Evaluado</span>';

        tablaBody.innerHTML += `
          <tr>
            <td><strong>${cv.nombre}</strong></td>
            <td>${cv.archivo || "undefined"}</td>
            <td>${cv.puntaje.toFixed(1)}%</td>
            <td>${badge}</td>
            <td><button class="btn btn-success btn-sm" disabled>✔️</button></td>
          </tr>`;
      });

      totalCandidatos.textContent = `Total analizados: ${resultados.length}`;
    } catch (error) {
      console.error("❌ Error al analizar:", error);
      alert("❌ Error al analizar las hojas de vida con la IA.");
    } finally {
      btnIA.disabled = false;
      btnIA.innerHTML = originalText;
    }
  });

  // =============================
  // 🚀 Al cargar la página
  // =============================
  cargarCandidatos();
});
