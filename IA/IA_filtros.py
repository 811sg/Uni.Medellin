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
    """Extrae el nombre del candidato desde el texto o el nombre del archivo."""
    match = re.search(r'nombre\s*(?:completo)?:\s*([a-záéíóúñ\s]+?)(?:\n|código|correo|teléfono|email)', texto.lower())
    if match:
        nombre = match.group(1).strip().title()
        nombre = re.sub(r'\s+', ' ', nombre)
        return nombre

    nombre = os.path.splitext(os.path.basename(archivo))[0]
    nombre = re.sub(r'^(cv|hoja|vida)_?', '', nombre, flags=re.I)
    nombre = nombre.replace('_', ' ').title()
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
            candidatos.append({
                'Nombre': extraer_nombre(texto, pdf),
                'Archivo': pdf,
                'Texto': limpiar_texto(texto)
            })
            print("[OK]")
        else:
            print("[ERROR]")

    if not candidatos:
        print("\n[X] No se pudo procesar ningún PDF\n")
        return None

    print(f"\n[OK] {len(candidatos)} CVs procesados correctamente\n")

    df = pd.DataFrame(candidatos)

    # =======================================
    # 🧠 ANÁLISIS DE SIMILITUD (IA REAL)
    # =======================================
    print("[*] Analizando con IA (TF-IDF + Similitud de Coseno)...")

    perfil_limpio = limpiar_texto(perfil)
    textos = df['Texto'].tolist() + [perfil_limpio]

    # 🔹 Vectorizador más robusto: considera palabras y frases
    vectorizer = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
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
        print(f"      Score: {row['Score']:.4f} ({int(row['Score']*100)}%) [{barra}]")
        print(f"      Archivo: {row['Archivo']}\n")

    df[['Nombre', 'Archivo', 'Score']].to_csv('ranking_monitores.csv', index=False)
    print("[*] Resultados guardados en: ranking_monitores.csv\n")

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

        print(f"\n[*] Análisis recibido desde Node.js con perfil:\n{perfil}\n")
        df = analizar_candidatos(perfil)

        if df is None or df.empty:
            print("[⚠️] No se encontraron CVs válidos.")
            return jsonify({"error": "No se encontraron CVs válidos."}), 400

        resultados = [
            {
                "nombre": row["Nombre"],
                "archivo": row["Archivo"],
                "puntaje": round(float(row["Score"]) * 100, 2)
            }
            for _, row in df.iterrows()
        ]

        print(f"[✅] Resultados generados ({len(resultados)} candidatos).\n")
        return jsonify(resultados)

    except Exception as e:
        print(f"[❌] Error al analizar: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n🌐 SERVIDOR IA ACTIVO — CONECTADO A NODE.JS")
    print("📂 Carpeta de análisis:", os.path.abspath(CARPETA_CVS))
    app.run(host="127.0.0.1", port=5000)
