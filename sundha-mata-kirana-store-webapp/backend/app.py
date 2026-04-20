from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
import os
import requests as req

app = Flask(__name__)
app.secret_key = "super_secret_key_123"

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "..", "frontend")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# ✅ Debug - startup pe check karo
print("SUPABASE_URL:", SUPABASE_URL)
print("SUPABASE_KEY:", SUPABASE_KEY[:20] if SUPABASE_KEY else "MISSING!")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def db(table):
    return f"{SUPABASE_URL}/rest/v1/{table}"

app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:path>")
def serve_files(path):
    return send_from_directory(FRONTEND_FOLDER, path)

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
    res = req.post(
        db("products"), 
        json=product, 
        headers={**HEADERS, "Prefer": "return=representation"}
    )
    print("ADD STATUS:", res.status_code)
    print("ADD RESPONSE:", res.text)
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
    res = req.patch(
        f"{db('products')}?id=eq.{p_id}", 
        json=product, 
        headers=HEADERS
    )
    print("UPDATE STATUS:", res.status_code)
    print("UPDATE RESPONSE:", res.text)
    return jsonify({"status": "success"}), 200

# ✅ Get All Products
@app.route("/api/products", methods=["GET"])
def get_products():
    res = req.get(
        f"{db('products')}?order=id.desc", 
        headers=HEADERS
    )
    print("GET STATUS:", res.status_code)
    print("GET RESPONSE:", res.text[:200])
    
    if res.status_code != 200:
        return jsonify({"status": "error", "message": res.text}), 500
        
    return jsonify({"status": "success", "data": res.json()}), 200

# ✅ Delete Product
@app.route("/api/admin/delete-product/<int:p_id>", methods=["DELETE"])
def delete_product(p_id):
    res = req.delete(
        f"{db('products')}?id=eq.{p_id}", 
        headers=HEADERS
    )
    print("DELETE STATUS:", res.status_code)
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    app.run(debug=True)
