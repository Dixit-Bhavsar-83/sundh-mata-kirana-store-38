from flask import Blueprint, request, jsonify, session

auth_bp = Blueprint('auth', __name__)

# Mock Database (Real project mein ye db.sqlite3 se aayega)
customers_db = {} 

OWNER_CREDENTIALS = {
    "username": "dixit",
    "password": "1983"
}

# --- OWNER ROUTES ---
@auth_bp.route('/api/owner/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if username == OWNER_CREDENTIALS['username'] and password == OWNER_CREDENTIALS['password']:
        session['owner_logged_in'] = True
        return jsonify({"status": "success", "message": "Login Successful"}), 200
    return jsonify({"status": "error", "message": "Invalid Credentials"}), 401

# --- CUSTOMER REGISTRATION ROUTE ---
@auth_bp.route('/api/customer/register', methods=['POST'])
def register_customer():
    data = request.get_json()
    phone = data.get('phone')

    if not phone or len(phone) != 10:
        return jsonify({"status": "error", "message": "Invalid Phone Number"}), 400

    # Data Sync Logic: Agar user pehle se hai toh update, nahi toh naya
    customers_db[phone] = {
        "name": data.get('name'),
        "profession": data.get('profession'),
        "address": data.get('address'),
        "city": data.get('city'),
        "state": data.get('state'),
        "pincode": data.get('pincode')
    }

    # Debug for Owner (In production, ye Owner Dashboard fetch karega)
    print(f"✅ New Customer Synced to Owner Panel: {customers_db[phone]}")

    return jsonify({
        "status": "success",
        "message": "Registration Successful",
        "data": customers_db[phone]
    }), 200

# auth_routes.py mein ye add karein

@auth_bp.route('/api/admin/customers', methods=['GET'])
def get_all_customers():
    # customers_db se saara data list format mein bhejna
    customer_list = []
    for phone, details in customers_db.items():
        customer_list.append({
            "phone": phone,
            **details
        })
    return jsonify({"status": "success", "data": customer_list}), 200

@auth_bp.route('/api/admin/delete-customer/<phone>', methods=['DELETE'])
def delete_customer(phone):
    if phone in customers_db:
        del customers_db[phone]
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Not found"}), 404
