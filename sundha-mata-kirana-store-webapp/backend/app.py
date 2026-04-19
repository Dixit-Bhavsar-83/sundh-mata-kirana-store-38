from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from routes.auth_routes import auth_bp
import os

app = Flask(__name__)
app.secret_key = "super_secret_key_123"

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

# ✅ Correct path - backend/ se ek upar jaata hai
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "..", "frontend")

products_db = []

app.register_blueprint(auth_bp)

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:path>")
def serve_files(path):
    return send_from_directory(FRONTEND_FOLDER, path)

@app.route("/api/admin/update-product/<int:p_id>", methods=["PUT"])
def update_product(p_id):
    data = request.json
    for product in products_db:
        if product["id"] == p_id:
            product["name"] = data.get("name")
            product["nickname"] = data.get("nickname")
            product["unit"] = data.get("unit")
            product["qty"] = data.get("qty")
            product["price"] = data.get("price")
            product["img"] = data.get("img1")
            return jsonify({"status": "success", "message": "Product Updated!"})
    return jsonify({"status": "error", "message": "Product not found"}), 404

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify({"status": "success", "data": products_db})

@app.route("/api/admin/delete-product/<int:p_id>", methods=["DELETE"])
def delete_product(p_id):
    global products_db
    products_db = [p for p in products_db if p["id"] != p_id]
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)