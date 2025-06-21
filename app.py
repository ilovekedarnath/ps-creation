# -------------------- IMPORTS --------------------
from flask import Flask, render_template, request, redirect, session, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from email.mime.text import MIMEText
import smtplib
import os
from dotenv import load_dotenv

# -------------------- CONFIG --------------------
app = Flask(__name__)
load_dotenv()  # Load .env variables (for email credentials)
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

app.secret_key = os.getenv("SECRET_KEY", "fallback-secret") 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
s = URLSafeTimedSerializer(app.secret_key)  # For token-based password reset

# -------------------- MODELS --------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    userid = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)  # NEW: email for password reset

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500))
    quantity = db.Column(db.Integer, default=1)

# -------------------- ROUTES --------------------
@app.route('/init-db')
def init_db():
    with app.app_context():
        db.create_all()
    return "✅ Database initialized!"


@app.route('/')
def home():
    return redirect('/login')

@app.route('/login')
def login():
    return render_template('login.html', signup_error=False)

@app.route('/signup', methods=['POST'])
def signup():
    userid = request.form.get('userid')
    password = request.form.get('password')
    email = request.form.get('email')  # ✅ now safely uses .get()

    if not userid or not password or not email:
        return render_template('login.html', signup_error="All fields are required.", showSignup=True)

    # Check if User ID or Email already exists
    existing_user = User.query.filter(
        (User.userid == userid) | (User.email == email)
    ).first()

    if existing_user:
        return render_template('login.html', signup_error="User ID or Email already in use.", showSignup=True)

    # Store hashed password
    hashed = generate_password_hash(password)
    new_user = User(userid=userid, password=hashed, email=email)

    db.session.add(new_user)
    db.session.commit()

    session['username'] = new_user.userid
    session['user_id'] = new_user.id

    return redirect('/sync-cart?next=main&new=1')


@app.route('/verify', methods=['POST'])
def verify():
    userid = request.form['userid']
    password = request.form['password']
    user = User.query.filter_by(userid=userid).first()

    if user and check_password_hash(user.password, password):
        session['username'] = user.userid
        session['user_id'] = user.id
        return redirect('/sync-cart?next=main')

    return render_template('login.html', error="Invalid credentials.")

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# -------------------- PASSWORD RESET --------------------
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email']
        user = User.query.filter_by(email=email).first()

        if user:
            token = s.dumps(user.email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)

            subject = "🔐 Reset Your Password - PS Creation"
            body = f"""
Hi {user.userid},

Click the link below to reset your password:
{reset_url}

If you didn't request this, simply ignore this message.
- PS Creation Team
"""

            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = EMAIL_USER
            msg['To'] = user.email

            try:
                with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                    smtp.login(EMAIL_USER, EMAIL_PASS)
                    smtp.send_message(msg)
            except Exception as e:
                print(f"❌ Failed to send email: {e}")
                return render_template('forgot_password.html', error="Failed to send email. Please try again.")

            return render_template('forgot_password.html', message="✅ Reset link sent to your email.")
        else:
            return render_template('forgot_password.html', error="❌ Email not found.")

    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = s.loads(token, salt='password-reset-salt', max_age=1800)
    except SignatureExpired:
        return render_template('reset_password.html', error="⚠️ The link has expired.")
    except BadSignature:
        return render_template('reset_password.html', error="❌ Invalid reset link.")

    user = User.query.filter_by(email=email).first()
    if not user:
        return render_template('reset_password.html', error="⚠️ Email not found.")

    if request.method == 'POST':
        new_password = request.form['password']
        user.password = generate_password_hash(new_password)
        db.session.commit()
        return render_template('reset_password.html', message="✅ Password updated successfully. You may now log in.")

    return render_template('reset_password.html')

# -------------------- PAGE ROUTES --------------------
@app.route('/main')
def main():
    if 'username' not in session:
        return redirect('/login')
    return render_template('main.html', username=session['username'])

@app.route('/store')
def store():
    if 'username' not in session:
        return redirect('/login')
    return render_template('store.html', username=session['username'])

@app.route('/sync-cart')
def sync_cart():
    if 'user_id' not in session:
        return redirect('/login')
    next_page = request.args.get('next', 'store')
    return render_template('sync_cart.html', next_page=next_page)

# -------------------- CART API --------------------
@app.route('/add-to-cart', methods=['POST'])
def add_to_cart():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    data = request.get_json()
    name = data.get('name')
    price = data.get('price')
    image = data.get('image')
    quantity = data.get('quantity', 1)

    if not all([name, price]):
        return jsonify({'success': False, 'error': 'Missing fields'}), 400

    user_id = session['user_id']
    existing = CartItem.query.filter_by(user_id=user_id, product_name=name).first()
    if existing:
        existing.quantity += quantity
    else:
        db.session.add(CartItem(user_id=user_id, product_name=name, price=price, image_url=image, quantity=quantity))

    db.session.commit()
    return jsonify({'success': True})

@app.route('/save-cart', methods=['POST'])
def save_cart():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    cart = request.get_json()
    user_id = session['user_id']

    CartItem.query.filter_by(user_id=user_id).delete()

    for item in cart:
        if not all(k in item for k in ('name', 'price', 'quantity')):
            continue
        db.session.add(CartItem(
            user_id=user_id,
            product_name=item['name'],
            price=item['price'],
            image_url=item.get('image', ''),
            quantity=item.get('quantity', 1)
        ))

    db.session.commit()
    return jsonify({'message': 'Cart saved successfully'})

@app.route('/get-cart')
def get_cart():
    if 'user_id' not in session:
        return jsonify([])

    items = CartItem.query.filter_by(user_id=session['user_id']).all()
    return jsonify([
        {
            'name': item.product_name,
            'price': item.price,
            'image': item.image_url,
            'quantity': item.quantity
        } for item in items
    ])

@app.route('/clear-cart', methods=['POST'])
def clear_cart():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    CartItem.query.filter_by(user_id=session['user_id']).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared'})

# -------------------- INIT --------------------
if __name__ == '__main__':
    from os import environ
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
