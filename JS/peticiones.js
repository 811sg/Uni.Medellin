document.addEventListener("DOMContentLoaded", () => {
  const modalElement = document.getElementById("modalEvaluacion");
  const modalTitle = document.getElementById("modalEvaluacionLabel");
  const puntajeInput = document.getElementById("puntajeInput");
  const comentariosInput = document.getElementById("comentariosInput");
  const recomendacionSelect = document.getElementById("recomendacionSelect");
  const guardarBtn = document.getElementById("guardarEvaluacionBtn");

  const modalEvaluacion = new bootstrap.Modal(modalElement);

  // Abrir modal al hacer clic en "Evaluar"
  document.querySelectorAll(".btn-evaluar").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const fila = e.target.closest("tr");
      const nombreCandidato = fila.querySelector("strong").textContent.trim();

      modalTitle.textContent = `Evaluación de Candidato: ${nombreCandidato}`;
      
      // Limpia los campos cada vez que se abre
      puntajeInput.value = "";
      comentariosInput.value = "";
      recomendacionSelect.selectedIndex = 0;

      modalEvaluacion.show();
    });
  });

  // Al hacer clic en "Guardar Evaluación"
  guardarBtn.addEventListener("click", () => {
    // Aquí podrías guardar los datos si luego conectas con backend
    modalEvaluacion.hide();

    // Limpia el formulario al cerrar
    puntajeInput.value = "";
    comentariosInput.value = "";
    recomendacionSelect.selectedIndex = 0;
  });
});
