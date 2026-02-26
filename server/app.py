from flask import Flask, request
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

from config import Config
from models import db, bcrypt, User, Project, Task

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    Migrate(app, db)
    JWTManager(app)

    @app.get("/")
    def home():
        return {"status": "ok"}

    # -------- AUTH --------
    @app.post("/api/signup")
    def signup():
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if not username or not email or not password:
            return {"error": "username, email, and password are required"}, 400

        if User.query.filter((User.username == username) | (User.email == email)).first():
            return {"error": "username or email already exists"}, 409

        user = User(username=username, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        token = create_access_token(identity=user.id)
        return {"token": token, "user": {"id": user.id, "username": user.username, "email": user.email}}, 201

    @app.post("/api/login")
    def login():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return {"error": "invalid credentials"}, 401

        token = create_access_token(identity=user.id)
        return {"token": token, "user": {"id": user.id, "username": user.username, "email": user.email}}, 200

    return app

app = create_app()

if __name__ == "__main__":
    app.run(port=5555, debug=True)