from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
import os
import uuid
import requests as req
from datetime import datetime, timedelta, timezone

app = Flask(__name__)
app.secret_key = "super_secret_key_123"

def get_ist_now():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_FOLDER = os.path.join(BASE_DIR, "..", "frontend")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

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
    return jsonify({"status": "success"}), 200

# ✅ Get All Products
@app.route("/api/products", methods=["GET"])
def get_products():
    res = req.get(
        f"{db('products')}?order=id.desc",
        headers=HEADERS
    )
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
    return jsonify({"status": "success"}), 200

# ============================================================
# ✅ ORDERS — Place Order (Customer Side)
# ============================================================
@app.route("/api/orders", methods=["POST"])
def place_order():
    data = request.json
    order_id = "ORD-" + str(uuid.uuid4())[:6].upper()
    now_ist = (datetime.utcnow() + timedelta(hours=5, minutes=30)).isoformat()

    order = {
        "id": order_id,
        "customer_name": data.get("customer_name", data.get("name", "")),
        "customer_phone": data.get("customer_phone", data.get("phone", "")),
        "customer_address": data.get("customer_address", data.get("address", "")),
        "items": data.get("items", []),
        "total": data.get("total", 0),
        "status": "PENDING",
        "created_at": now_ist
    }

    res = req.post(
        db("orders"),
        json=order,
        headers={**HEADERS, "Prefer": "return=representation"}
    )
    print("ORDER PLACE STATUS:", res.status_code, res.text[:200])
    return jsonify({"status": "success", "data": order}), 201

# ============================================================
# ✅ ORDERS — Get Orders (Last 3 Days Only)
# ============================================================
@app.route("/api/orders", methods=["GET"])
def get_orders():
    three_days_ago = (datetime.utcnow() - timedelta(days=3)).isoformat()

    res = req.get(
        f"{db('orders')}?created_at=gte.{three_days_ago}&order=created_at.desc",
        headers=HEADERS
    )
    if res.status_code != 200:
        return jsonify({"status": "error", "message": res.text}), 500

    orders = res.json()
    return jsonify({"status": "success", "data": orders}), 200

@app.route("/api/orders/<order_id>", methods=["GET"])
def get_single_order(order_id):
    res = req.get(
        f"{db('orders')}?id=eq.{order_id}&limit=1",
        headers=HEADERS
    )
    if res.status_code != 200:
        return jsonify({"status": "error", "message": res.text}), 500
    data = res.json()
    if not data:
        return jsonify({"status": "error", "message": "Order not found"}), 404
    return jsonify({"status": "success", "data": data[0]}), 200
 
 
# ============================================================
# ✅ ORDERS — Update Status (PENDING → ACCEPTED)
# ============================================================
@app.route("/api/orders/<order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    data = request.json
    new_status = data.get("status", "ACCEPTED")
    boy_id = data.get("delivery_boy_id") # New field

    update_payload = {"status": new_status}
    if boy_id:
        update_payload["delivery_boy_id"] = boy_id

    res = req.patch(
        f"{db('orders')}?id=eq.{order_id}",
        json=update_payload,
        headers=HEADERS
    )
    print(f"STATUS UPDATE [{order_id}] → {new_status} (Boy: {boy_id}):", res.status_code)
    return jsonify({"status": "success"}), 200

# ============================================================
# ✅ DASHBOARD — Today's Stats (Earnings, Orders, Pending)
# ============================================================
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    # IST today start
    now_ist = datetime.utcnow() + timedelta(hours=5, minutes=30)
    today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = (today_start - timedelta(hours=5, minutes=30)).isoformat()

    res = req.get(
        f"{db('orders')}?created_at=gte.{today_start_utc}&order=created_at.asc",
        headers=HEADERS
    )

    orders = res.json() if res.status_code == 200 else []

    total_orders = len(orders)
    pending = sum(1 for o in orders if o.get("status") == "PENDING")
    # Earnings = only accepted orders
    earnings = sum(
    o.get("total", 0)
    for o in orders
    if o.get("status") in ["ACCEPTED", "DELIVERED", "COMPLETED"]
)
    # Hourly breakdown for live chart
    hourly = {}
    for o in orders:
        created = o.get("created_at", "")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", ""))
            dt_ist = dt + timedelta(hours=5, minutes=30)
            hour_key = dt_ist.hour
            if hour_key not in hourly:
                hourly[hour_key] = {"orders": 0, "earnings": 0}
            hourly[hour_key]["orders"] += 1
            if o.get("status") == "ACCEPTED":
                hourly[hour_key]["earnings"] += o.get("total", 0)
        except Exception:
            pass

    return jsonify({
        "status": "success",
        "data": {
            "total_orders": total_orders,
            "pending": pending,
            "earnings": earnings,
            "hourly": hourly
        }
    }), 200

    

# ============================================================
# ✅ DASHBOARD — Weekly Stats (Last 7 Days)
# ============================================================
@app.route("/api/dashboard/weekly", methods=["GET"])
def weekly_stats():
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

    res = req.get(
        f"{db('orders')}?created_at=gte.{seven_days_ago}&order=created_at.asc",
        headers=HEADERS
    )
    orders = res.json() if res.status_code == 200 else []

    daily = {}
    for o in orders:
        created = o.get("created_at", "")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", ""))
            dt_ist = dt + timedelta(hours=5, minutes=30)
            day_key = dt_ist.strftime("%Y-%m-%d")
            if day_key not in daily:
                daily[day_key] = {"orders": 0, "earnings": 0}
            daily[day_key]["orders"] += 1
            if o.get("status") in ["ACCEPTED", "COMPLETED", "DELIVERED"]:
                daily[day_key]["earnings"] += o.get("total", 0)
        except Exception:
            pass

    return jsonify({"status": "success", "data": daily}), 200


# ✅ DELIVERY ROUTES
# ════════════════════════════════════════════════════════════
 
@app.route("/api/delivery/live", methods=["GET"])
def delivery_live_orders():
    # Aaj ki midnight (IST)
    ist_today_start = get_ist_now().replace(hour=0, minute=0, second=0, microsecond=0)
    utc_today_start = (ist_today_start - timedelta(hours=5, minutes=30)).isoformat()
    
    # Logic: Status PENDING ho OR Status ACCEPTED ho but delivery_boy_id khali (null) ho
    # Supabase filter:
    res = req.get(
        f"{db('orders')}?created_at=gte.{utc_today_start}&or=(status.eq.PENDING,and(status.eq.ACCEPTED,delivery_boy_id.is.null))&order=created_at.desc",
        headers=HEADERS
    )
    if res.status_code != 200:
        return jsonify({"status": "error", "message": res.text}), 500
    return jsonify({"status": "success", "data": res.json()}), 200

@app.route("/api/delivery/mine", methods=["GET"])
def delivery_my_orders():
    boy_id = request.args.get("boy_id", "")
    if not boy_id:
        return jsonify({"status": "error", "message": "boy_id required"}), 400
    
    # Simple query: sirf boy_id match karo, baki filter hata do test karne ke liye
    url = f"{db('orders')}?delivery_boy_id=eq.{boy_id}&order=created_at.desc"
    
    res = req.get(url, headers=HEADERS)
    
    # Agar error aaye, toh crash mat hone do
    if res.status_code != 200:
        return jsonify({"status": "error", "message": "Database error", "debug": res.text}), 200
        
    return jsonify({"status": "success", "data": res.json()}), 200

if __name__ == "__main__":
    app.run(debug=True)