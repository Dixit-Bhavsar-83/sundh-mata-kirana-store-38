from flask import Blueprint, request, jsonify
# In-memory or DB mock
users_db = {} 

user_bp = Blueprint('user_routes', __name__)

@user_bp.route('/api/register', methods=['POST'])
def register_customer():
    data = request.json
    phone = data.get('phone')
    
    if not phone or len(phone) != 10:
        return jsonify({"success": False, "message": "Invalid Phone Number"}), 400

    # UPSERT Logic: Agar phone exist karta hai toh update, nahi toh create
    users_db[phone] = {
        "name": data.get('name'),
        "profession": data.get('profession'),
        "address": data.get('address'),
        "city": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380005"
    }

    # Sync with Owner Panel: Yahan aapka db.sqlite3 update hoga
    print(f"User Synced: {users_db[phone]}") 

    return jsonify({
        "success": True, 
        "message": "User registered/updated successfully",
        "user": users_db[phone]
    }), 200