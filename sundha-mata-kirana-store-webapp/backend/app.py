from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from supabase import create_client
import os

app = Flask(__name__)
app.secret_key = "super_secret_key_123"

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "..", "frontend")

# ✅ Supabase Connect
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:path>")
def serve_files(path):
    return send_from_directory(FRONTEND_FOLDER, path)

# ✅ Keep-Alive
@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"status": "alive"}), 200

# ✅ Add Product
@app.route("/api/admin/add-product", methods=["POST"])
def add_product():
    data = request.json
    product = {
        "id": data.get("id"),
        "name": data.get("name"),
        "nick": data.get("nick", ""),
        "unit": data.get("unit", ""),
        "qty": data.get("qty", ""),
        "price": data.get("price", ""),
        "img": data.get("img") or data.get("img1", ""),
        "img2": data.get("img2", "")
    }
    supabase.table("products").upsert(product).execute()
    return jsonify({"status": "success", "data": product}), 201

# ✅ Update Product
@app.route("/api/admin/update-product/<int:p_id>", methods=["PUT"])
def update_product(p_id):
    data = request.json
    product = {
        "name": data.get("name"),
        "nick": data.get("nick", ""),
        "unit": data.get("unit", ""),
        "qty": data.get("qty", ""),
        "price": data.get("price", ""),
        "img": data.get("img") or data.get("img1", ""),
        "img2": data.get("img2", "")
    }
    supabase.table("products").update(product).eq("id", p_id).execute()
    return jsonify({"status": "success"}), 200

# ✅ Get All Products
@app.route("/api/products", methods=["GET"])
def get_products():
    res = supabase.table("products").select("*").order("id", desc=True).execute()
    return jsonify({"status": "success", "data": res.data}), 200

# ✅ Delete Product
@app.route("/api/admin/delete-product/<int:p_id>", methods=["DELETE"])
def delete_product(p_id):
    supabase.table("products").delete().eq("id", p_id).execute()
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    app.run(debug=True)
