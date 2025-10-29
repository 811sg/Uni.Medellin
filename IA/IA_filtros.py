import pandas as pd
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import PyPDF2
from flask import Flask, request, jsonify
from flask_cors import CORS

# =======================================
# 📋 PERFIL IDEAL POR DEFECTO
# =======================================
perfil_ideal = """
Buscamos estudiante para monitoría de Análisis de Datos con:
- Dominio de Python (Pandas, NumPy, Matplotlib)
- Conocimientos en estadística y análisis de datos
- Experiencia previa en enseñanza, tutorías o monitorías
- Excelente comunicación y paciencia
- Promedio superior a 4.0
- Capacidad para explicar conceptos complejos claramente
"""

# =======================================
# ⚙️ CONFIGURACIONES GENERALES
# =======================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CARPETA_CVS = os.path.join(BASE_DIR, "hojas_de_vida")

STOP_WORDS = set([
    'el', 'la', 'de', 'en', 'y', 'a', 'los', 'del', 'se', 'las',
    'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'es', 'lo',
    'como', 'más', 'o', 'pero', 'sus', 'le', 'ya', 'fue', 'este',
    'ha', 'si', 'porque', 'esta', 'son', 'entre', 'cuando', 'muy',
    'sin', 'sobre', 'también', 'me', 'hasta', 'donde', 'quien', 'desde',
    'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros'
])

# =======================================
# 📄 FUNCIONES DE PROCESAMIENTO
# =======================================
def extraer_texto_pdf(ruta):
    """Extrae el texto de un PDF."""
    try:
        with open(ruta, 'rb') as f:
            lector = PyPDF2.PdfReader(f)
            texto = ''.join(pagina.extract_text() for pagina in lector.pages)
        return texto if len(texto.strip()) > 50 else None
    except Exception as e:
        print(f"   [!] Error en {os.path.basename(ruta)}: {e}")
        return None


def extraer_nombre(texto, archivo):
    """
    Extrae SOLO nombre + primer apellido del candidato.
    Ejemplo: "Camilo Herrera Gómez" → "Camilo Herrera"
    """
    # Buscar patrón "Nombre Completo: Camilo Herrera Gómez"
    match = re.search(
        r'nombre\s*(?:completo)?:\s*([a-záéíóúñ\s]+?)(?:\n|código|correo|teléfono|email)',
        texto.lower()
    )
    
    if match:
        nombre_completo = match.group(1).strip().title()
        nombre_completo = re.sub(r'\s+', ' ', nombre_completo)
        
        # 🔥 IMPORTANTE: Tomar SOLO las primeras 2 palabras (nombre + apellido)
        partes = nombre_completo.split()
        if len(partes) >= 2:
            nombre_corto = f"{partes[0]} {partes[1]}"
            print(f"   📝 Nombre extraído del PDF: '{nombre_completo}' → '{nombre_corto}'")
            return nombre_corto
        
        return nombre_completo
    
    # Si no encuentra el nombre en el texto, usar el nombre del archivo
    # Eliminar timestamp y extensión
    nombre = os.path.splitext(os.path.basename(archivo))[0]
    nombre = re.sub(r'^\d+_', '', nombre)  # Quitar timestamp inicial
    nombre = re.sub(r'^(cv|hoja|vida)_?', '', nombre, flags=re.I)
    nombre = nombre.replace('_', ' ').title()
    
    # También acortar el nombre del archivo
    partes = nombre.split()
    if len(partes) >= 2:
        nombre_corto = f"{partes[0]} {partes[1]}"
        print(f"   📝 Nombre del archivo: '{nombre}' → '{nombre_corto}'")
        return nombre_corto
    
    return nombre


def limpiar_texto(texto):
    """Normaliza y limpia el texto eliminando símbolos y stopwords."""
    texto = texto.lower()
    texto = re.sub(r'[^a-záéíóúñ\s]', ' ', texto)
    palabras = [p for p in texto.split() if len(p) > 2 and p not in STOP_WORDS]
    return ' '.join(palabras)


def analizar_candidatos(perfil, carpeta=CARPETA_CVS):
    """Analiza los CVs de la carpeta según el perfil recibido."""
    print("=" * 85)
    print(" SISTEMA DE SELECCIÓN INTELIGENTE DE MONITORES ".center(85))
    print("=" * 85)
    print()

    if not os.path.exists(carpeta):
        os.makedirs(carpeta)
        print(f"[*] Carpeta '{carpeta}' creada. Coloca los PDFs ahí.\n")
        return None

    pdfs = [f for f in os.listdir(carpeta) if f.endswith('.pdf')]
    if not pdfs:
        print(f"[X] No hay archivos PDF en '{carpeta}'\n")
        return None

    print(f"[*] Carpeta: {carpeta}")
    print(f"[*] PDFs encontrados: {len(pdfs)}\n")
    print("[*] Leyendo archivos...")

    candidatos = []
    for i, pdf in enumerate(pdfs, 1):
        ruta = os.path.join(carpeta, pdf)
        print(f"   {i}. {pdf}...", end=" ")

        texto = extraer_texto_pdf(ruta)
        if texto:
            nombre_extraido = extraer_nombre(texto, pdf)
            texto_limpio = limpiar_texto(texto)
            candidatos.append({
                'Nombre': nombre_extraido,
                'Archivo': pdf,
                'Texto': texto_limpio
            })
            print(f"[OK] - {len(texto_limpio.split())} palabras procesadas")
        else:
            print("[ERROR]")

    if not candidatos:
        print("\n[X] No se pudo procesar ningún PDF\n")
        return None

    print(f"\n[OK] {len(candidatos)} CVs procesados correctamente\n")

    df = pd.DataFrame(candidatos)

    # =======================================
    # 🧠 ANÁLISIS DE SIMILITUD (IA MEJORADA)
    # =======================================
    print("[*] Analizando con IA (TF-IDF + Similitud de Coseno)...")

    perfil_limpio = limpiar_texto(perfil)
    print(f"[*] Palabras clave del perfil: {len(perfil_limpio.split())}")
    
    textos = df['Texto'].tolist() + [perfil_limpio]

    # 🔥 CONFIGURACIÓN MEJORADA DEL VECTORIZADOR
    vectorizer = TfidfVectorizer(
        max_features=1000,        # Más features para mejor precisión
        ngram_range=(1, 3),       # Considera frases de 1-3 palabras
        min_df=1,                 # Incluir términos aunque aparezcan 1 vez
        sublinear_tf=True,        # Escalado logarítmico
        strip_accents='unicode'   # Normalizar acentos
    )
    
    matriz_tfidf = vectorizer.fit_transform(textos)

    # 🔹 Calcular similitud entre perfil y CVs
    similitudes = cosine_similarity(matriz_tfidf[-1], matriz_tfidf[:-1]).flatten()
    df['Score'] = similitudes

    # 🔹 Ordenar candidatos de mayor a menor similitud
    df = df.sort_values('Score', ascending=False).reset_index(drop=True)

    print(f"[OK] Análisis completado\n")
    print("=" * 85)
    print(" RANKING DE CANDIDATOS ".center(85))
    print("=" * 85)
    print()

    for i, row in df.iterrows():
        prefijo = ["[1]", "[2]", "[3]"][i] if i < 3 else f"[{i+1}]"
        barra = "█" * int(row['Score'] * 50)
        print(f"{prefijo} {row['Nombre']}")
        print(f"      Score: {row['Score']:.4f} ({row['Score']*100:.1f}%) [{barra}]")
        print(f"      Archivo: {row['Archivo']}\n")

    print("[*] Resultados guardados en: ranking_monitores.csv\n")
    df[['Nombre', 'Archivo', 'Score']].to_csv('ranking_monitores.csv', index=False)

    return df


# =======================================
# 🌐 SERVIDOR FLASK (Integración con Node.js)
# =======================================
app = Flask(__name__)
CORS(app)

@app.route("/analizar", methods=["POST"])
def analizar():
    try:
        data = request.get_json()
        perfil = data.get("perfil", None)
        if perfil is None or len(perfil.strip()) < 20:
            perfil = perfil_ideal

        print(f"\n[*] 🤖 Análisis recibido desde Node.js")
        print(f"[*] Perfil: {perfil[:80].strip()}...\n")
        
        df = analizar_candidatos(perfil)

        if df is None or df.empty:
            print("[⚠️] No se encontraron CVs válidos.")
            return jsonify({"error": "No se encontraron CVs válidos."}), 400

        # 🔥 Devolver scores sin multiplicar (como decimales)
        resultados = [
            {
                "nombre": row["Nombre"],
                "archivo": row["Archivo"],
                "puntaje": round(float(row["Score"]), 4)
            }
            for _, row in df.iterrows()
        ]

        print(f"[✅] Resultados generados ({len(resultados)} candidatos):")
        for r in resultados:
            print(f"   • {r['nombre']}: {r['puntaje']*100:.2f}%")
        print()
        
        return jsonify(resultados)

    except Exception as e:
        print(f"[❌] Error al analizar: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🌐 SERVIDOR IA ACTIVO — CONECTADO A NODE.JS")
    print(f"📂 Carpeta de análisis: {os.path.abspath(CARPETA_CVS)}")
    print("🔗 Endpoint: http://127.0.0.1:5000/analizar")
    print("=" * 85)
    print()
    app.run(host="127.0.0.1", port=5000, debug=False)