from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
import os

app = Flask(__name__)
app.secret_key = "super_secret_key_123"

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "..", "frontend")

products_db = []

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:path>")
def serve_files(path):
    return send_from_directory(FRONTEND_FOLDER, path)

# ✅ ADD PRODUCT - NAYA ROUTE
@app.route("/api/admin/add-product", methods=["POST"])
def add_product():
    data = request.json
    product = {
        "id": data.get("id"),
        "name": data.get("name"),
        "nick": data.get("nick"),
        "unit": data.get("unit"),
        "qty": data.get("qty"),
        "price": data.get("price"),
        "img1": data.get("img1"),
        "img2": data.get("img2")
    }
    products_db.insert(0, product)
    return jsonify({"status": "success", "message": "Product Added!", "data": product}), 201

# ✅ UPDATE PRODUCT
@app.route("/api/admin/update-product/<int:p_id>", methods=["PUT"])
def update_product(p_id):
    data = request.json
    for product in products_db:
        if product["id"] == p_id:
            product["name"] = data.get("name")
            product["nick"] = data.get("nick")      # ✅ nick (JS se match)
            product["unit"] = data.get("unit")
            product["qty"] = data.get("qty")
            product["price"] = data.get("price")
            product["img1"] = data.get("img1")
            product["img2"] = data.get("img2")
            return jsonify({"status": "success", "message": "Product Updated!"})
    return jsonify({"status": "error", "message": "Product not found"}), 404

# ✅ GET ALL PRODUCTS
@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify({"status": "success", "data": products_db})

# ✅ DELETE PRODUCT
@app.route("/api/admin/delete-product/<int:p_id>", methods=["DELETE"])
def delete_product(p_id):
    global products_db
    products_db = [p for p in products_db if p["id"] != p_id]
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)
