document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 monitores-activos.js cargado");
  
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const listaMonitores = document.getElementById("lista-monitores");
  
  // ============================
  // 📥 OBTENER CORREO DEL PROFESOR
  // ============================
  const profesorCorreo = localStorage.getItem('userEmail') || 'profesor@soydocente.com';
  console.log(`👤 Profesor actual: ${profesorCorreo}`);
  
  // ============================
  // 📋 CARGAR MONITORES ACTIVOS
  // ============================
  async function cargarMonitoresActivos() {
    try {
      console.log("📡 Obteniendo monitores activos...");
      
      const res = await fetch(`http://localhost:3001/monitores-activos/${encodeURIComponent(profesorCorreo)}`);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const monitores = await res.json();
      
      console.log(`✅ Monitores encontrados: ${monitores.length}`);
      
      // Ocultar loading
      loadingState.style.display = "none";
      
      if (monitores.length === 0) {
        // Mostrar estado vacío
        emptyState.style.display = "block";
        listaMonitores.style.display = "none";
      } else {
        // Mostrar lista de monitores
        emptyState.style.display = "none";
        listaMonitores.style.display = "flex";
        
        // Generar tarjetas
        mostrarMonitores(monitores);
      }
      
    } catch (error) {
      console.error("❌ Error al cargar monitores:", error);
      loadingState.style.display = "none";
      emptyState.style.display = "block";
      emptyState.innerHTML = `
        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 4rem;"></i>
        <h5 class="text-danger mt-3">Error al cargar monitores</h5>
        <p class="text-muted">No se pudo conectar con el servidor.</p>
        <button class="btn btn-danger mt-3" onclick="location.reload()">
          <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
        </button>
      `;
    }
  }
  
  // ============================
  // 🎨 MOSTRAR TARJETAS DE MONITORES
  // ============================
  function mostrarMonitores(monitores) {
    listaMonitores.innerHTML = "";
    
    monitores.forEach((monitor, index) => {
      const puntajeFinal = monitor.puntaje_manual || monitor.puntaje_ia || 0;
      const puntajeTexto = puntajeFinal > 0 ? `${puntajeFinal.toFixed(1)}%` : 'N/A';
      
      // Determinar color según puntaje
      let colorBadge = 'bg-secondary';
      if (puntajeFinal >= 80) colorBadge = 'bg-success';
      else if (puntajeFinal >= 60) colorBadge = 'bg-info';
      else if (puntajeFinal >= 40) colorBadge = 'bg-warning';
      else if (puntajeFinal > 0) colorBadge = 'bg-danger';
      
      // Fecha formateada
      const fechaInicio = new Date(monitor.fecha_inicio).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const card = `
        <div class="col-md-6 col-lg-4">
          <div class="card shadow-sm border-0 h-100 monitor-card" style="border-radius: 12px; transition: transform 0.2s;">
            <div class="card-body p-4">
              
              <!-- Header con avatar -->
              <div class="d-flex align-items-center mb-3">
                <div class="avatar-circle me-3">
                  <i class="bi bi-person-fill text-white"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="fw-bold mb-0">${monitor.nombre}</h6>
                  <small class="text-muted">${monitor.correo}</small>
                </div>
                <span class="badge ${colorBadge}">${puntajeTexto}</span>
              </div>
              
              <!-- Información -->
              <div class="monitor-info">
                <div class="info-item mb-2">
                  <i class="bi bi-book text-danger me-2"></i>
                  <span class="text-muted small">Materia:</span>
                  <span class="fw-semibold small">${monitor.materia || 'No especificada'}</span>
                </div>
                
                <div class="info-item mb-2">
                  <i class="bi bi-clock text-danger me-2"></i>
                  <span class="text-muted small">Horario:</span>
                  <span class="fw-semibold small">${monitor.horario || 'Por definir'}</span>
                </div>
                
                <div class="info-item mb-2">
                  <i class="bi bi-calendar-check text-danger me-2"></i>
                  <span class="text-muted small">Semestre:</span>
                  <span class="fw-semibold small">${monitor.semestre || 'Actual'}</span>
                </div>
                
                <div class="info-item">
                  <i class="bi bi-calendar3 text-danger me-2"></i>
                  <span class="text-muted small">Inicio:</span>
                  <span class="fw-semibold small">${fechaInicio}</span>
                </div>
              </div>
              
              <!-- Botones -->
              <div class="d-flex gap-2 mt-3">
                <button class="btn btn-sm btn-outline-danger flex-grow-1 btn-ver-detalles" 
                        data-monitor='${JSON.stringify(monitor).replace(/'/g, "&apos;")}'>
                  <i class="bi bi-info-circle me-1"></i>Ver detalles
                </button>
              </div>
              
            </div>
          </div>
        </div>
      `;
      
      listaMonitores.innerHTML += card;
    });
    
    // Agregar event listeners a los botones
    agregarEventListeners();
    
    // Efecto hover en las tarjetas
    document.querySelectorAll('.monitor-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });
    });
  }
  
  // ============================
  // 🎯 EVENT LISTENERS
  // ============================
  function agregarEventListeners() {
    // Botón "Ver detalles"
    document.querySelectorAll('.btn-ver-detalles').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const monitorData = JSON.parse(e.target.closest('.btn-ver-detalles').getAttribute('data-monitor'));
        mostrarModalDetalles(monitorData);
      });
    });
  }
  
  // ============================
  // 📋 MODAL DE DETALLES
  // ============================
  function mostrarModalDetalles(monitor) {
    const modalBody = document.getElementById('modal-body-content');
    const puntajeFinal = monitor.puntaje_manual || monitor.puntaje_ia || 0;
    
    modalBody.innerHTML = `
      <div class="container-fluid">
        
        <!-- Información personal -->
        <div class="row mb-4">
          <div class="col-12">
            <h6 class="fw-bold text-danger mb-3">
              <i class="bi bi-person-circle me-2"></i>Información Personal
            </h6>
            <table class="table table-borderless table-sm">
              <tr>
                <td class="text-muted" style="width: 40%;">Nombre completo:</td>
                <td class="fw-semibold">${monitor.nombre}</td>
              </tr>
              <tr>
                <td class="text-muted">Correo electrónico:</td>
                <td class="fw-semibold">${monitor.correo}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Información académica -->
        <div class="row mb-4">
          <div class="col-12">
            <h6 class="fw-bold text-danger mb-3">
              <i class="bi bi-book me-2"></i>Información Académica
            </h6>
            <table class="table table-borderless table-sm">
              <tr>
                <td class="text-muted" style="width: 40%;">Materia asignada:</td>
                <td class="fw-semibold">${monitor.materia || 'No especificada'}</td>
              </tr>
              <tr>
                <td class="text-muted">Horario:</td>
                <td class="fw-semibold">${monitor.horario || 'Por definir'}</td>
              </tr>
              <tr>
                <td class="text-muted">Semestre:</td>
                <td class="fw-semibold">${monitor.semestre || 'Actual'}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Evaluación -->
        <div class="row mb-4">
          <div class="col-12">
            <h6 class="fw-bold text-danger mb-3">
              <i class="bi bi-star me-2"></i>Evaluación
            </h6>
            <div class="mb-3">
              <label class="text-muted small">Puntaje final:</label>
              <div class="progress" style="height: 25px;">
                <div class="progress-bar ${puntajeFinal >= 70 ? 'bg-success' : 'bg-warning'}" 
                     style="width: ${puntajeFinal}%;" role="progressbar">
                  <span class="fw-bold">${puntajeFinal.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            ${monitor.seguimiento ? `
              <div class="alert alert-light border">
                <label class="text-muted small fw-semibold">Comentarios del profesor:</label>
                <p class="mb-0 mt-2">${monitor.seguimiento}</p>
              </div>
            ` : `
              <p class="text-muted small"><i class="bi bi-info-circle me-1"></i>No hay comentarios registrados</p>
            `}
          </div>
        </div>
        
        <!-- Fechas -->
        <div class="row">
          <div class="col-12">
            <h6 class="fw-bold text-danger mb-3">
              <i class="bi bi-calendar-event me-2"></i>Fechas Importantes
            </h6>
            <table class="table table-borderless table-sm">
              <tr>
                <td class="text-muted" style="width: 40%;">Fecha de inicio:</td>
                <td class="fw-semibold">${new Date(monitor.fecha_inicio).toLocaleString('es-CO')}</td>
              </tr>
              <tr>
                <td class="text-muted">Estado:</td>
                <td><span class="badge bg-success">Activo</span></td>
              </tr>
            </table>
          </div>
        </div>
        
      </div>
    `;
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalDetallesMonitor'));
    modal.show();
  }
  
  // ============================
  // 🚀 INICIAR CARGA
  // ============================
  await cargarMonitoresActivos();
  
  console.log("✅ Sistema de monitores activos listo");
});

// ============================
// 🎨 ESTILOS DINÁMICOS (CSS inline)
// ============================
const style = document.createElement('style');
style.textContent = `
  .avatar-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .monitor-card {
    transition: all 0.3s ease;
  }
  
  .monitor-card:hover {
    box-shadow: 0 8px 20px rgba(0,0,0,0.12) !important;
  }
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .info-item i {
    font-size: 0.9rem;
  }
`;
document.head.appendChild(style);