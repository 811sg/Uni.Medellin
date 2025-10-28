from flask import Flask, request, jsonify
from IA_filtros import analizar_candidatos  # 👈 Usa el nombre real de tu función IA

app = Flask(__name__)

@app.route("/analizar", methods=["POST"])
def analizar():
    try:
        data = request.get_json()
        perfil = data.get("perfil", "monitor de ingeniería de sistemas")

        resultado = analizar_candidatos(perfil)
        candidatos = resultado.to_dict(orient="records")
        return jsonify(candidatos)
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)
