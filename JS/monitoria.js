// ==== FILTROS FUNCIONALES ====
document.addEventListener("DOMContentLoaded", () => {
  const filtroCurso = document.getElementById("filtroCurso");
  const filtroSemestre = document.getElementById("filtroSemestre");
  const busqueda = document.getElementById("busqueda");
  const convocatorias = document.querySelectorAll(".convocatoria");

  function filtrar() {
    const cursoSeleccionado = filtroCurso.value.toLowerCase();
    const semestreSeleccionado = filtroSemestre.value.toLowerCase();
    const textoBusqueda = busqueda.value.toLowerCase();

    convocatorias.forEach(card => {
      const curso = card.getAttribute("data-curso").toLowerCase();
      const contenido = card.innerText.toLowerCase();

      const coincideCurso = !cursoSeleccionado || curso.includes(cursoSeleccionado);
      const coincideSemestre = !semestreSeleccionado || contenido.includes(semestreSeleccionado);
      const coincideTexto = !textoBusqueda || contenido.includes(textoBusqueda);

      if (coincideCurso && coincideSemestre && coincideTexto) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  }

  filtroCurso.addEventListener("change", filtrar);
  filtroSemestre.addEventListener("change", filtrar);
  busqueda.addEventListener("keyup", filtrar);
});
