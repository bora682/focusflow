from flask import Flask, request
from flask_migrate import Migrate
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)

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
        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        }, 201

    @app.post("/api/login")
    def login():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return {"error": "invalid credentials"}, 401

        token = create_access_token(identity=user.id)
        return {
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        }, 200

    # -------- HELPER --------

    def current_user():
        user_id = get_jwt_identity()
        return User.query.get(user_id)

    # -------- PROJECTS (Protected) --------

    @app.get("/api/projects")
    @jwt_required()
    def list_projects():
        user = current_user()
        projects = (
            Project.query.filter_by(user_id=user.id)
            .order_by(Project.id.desc())
            .all()
        )
        return [
            {"id": p.id, "name": p.name, "description": p.description}
            for p in projects
        ], 200

    @app.post("/api/projects")
    @jwt_required()
    def create_project():
        user = current_user()
        data = request.get_json() or {}

        name = (data.get("name") or "").strip()
        description = (data.get("description") or "").strip()

        if not name:
            return {"error": "name is required"}, 400

        project = Project(name=name, description=description, user_id=user.id)
        db.session.add(project)
        db.session.commit()

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
        }, 201

    @app.get("/api/projects/<int:project_id>")
    @jwt_required()
    def get_project(project_id):
        user = current_user()
        project = Project.query.filter_by(id=project_id, user_id=user.id).first()

        if not project:
            return {"error": "project not found"}, 404

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
        }, 200

    @app.patch("/api/projects/<int:project_id>")
    @jwt_required()
    def update_project(project_id):
        user = current_user()
        project = Project.query.filter_by(id=project_id, user_id=user.id).first()

        if not project:
            return {"error": "project not found"}, 404

        data = request.get_json() or {}

        if "name" in data:
            new_name = (data.get("name") or "").strip()
            if not new_name:
                return {"error": "name cannot be empty"}, 400
            project.name = new_name

        if "description" in data:
            project.description = (data.get("description") or "").strip()

        db.session.commit()

        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
        }, 200

    @app.delete("/api/projects/<int:project_id>")
    @jwt_required()
    def delete_project(project_id):
        user = current_user()
        project = Project.query.filter_by(id=project_id, user_id=user.id).first()

        if not project:
            return {"error": "project not found"}, 404

        db.session.delete(project)
        db.session.commit()

        return {"message": "deleted"}, 200

    # -------- TASKS (Protected + Ownership + Pagination) --------

    @app.post("/api/projects/<int:project_id>/tasks")
    @jwt_required()
    def create_task(project_id):
        user = current_user()

        project = Project.query.filter_by(id=project_id, user_id=user.id).first()
        if not project:
            return {"error": "project not found"}, 404

        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        status = (data.get("status") or "todo").strip() or "todo"

        if not title:
            return {"error": "title is required"}, 400

        if status not in ["todo", "in_progress", "done"]:
            return {"error": "status must be todo, in_progress, or done"}, 400

        task = Task(
            title=title,
            description=description,
            status=status,
            project_id=project.id,
        )
        db.session.add(task)
        db.session.commit()

        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "project_id": task.project_id,
        }, 201

    @app.get("/api/projects/<int:project_id>/tasks")
    @jwt_required()
    def list_tasks(project_id):
        user = current_user()

        project = Project.query.filter_by(id=project_id, user_id=user.id).first()
        if not project:
            return {"error": "project not found"}, 404

        page = request.args.get("page", default=1, type=int)
        per_page = request.args.get("per_page", default=10, type=int)

        if page < 1:
            page = 1
        if per_page < 1:
            per_page = 10
        if per_page > 50:
            per_page = 50

        pagination = (
            Task.query.filter_by(project_id=project.id)
            .order_by(Task.id.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        return {
            "items": [
                {
                    "id": t.id,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                    "project_id": t.project_id,
                }
                for t in pagination.items
            ],
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }, 200

    @app.patch("/api/tasks/<int:task_id>")
    @jwt_required()
    def update_task(task_id):
        user = current_user()

        task = (
            Task.query.join(Project)
            .filter(Task.id == task_id, Project.user_id == user.id)
            .first()
        )
        if not task:
            return {"error": "task not found"}, 404

        data = request.get_json() or {}

        if "title" in data:
            new_title = (data.get("title") or "").strip()
            if not new_title:
                return {"error": "title cannot be empty"}, 400
            task.title = new_title

        if "description" in data:
            task.description = (data.get("description") or "").strip()

        if "status" in data:
            new_status = (data.get("status") or "").strip()
            if new_status not in ["todo", "in_progress", "done"]:
                return {"error": "status must be todo, in_progress, or done"}, 400
            task.status = new_status

        db.session.commit()

        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "project_id": task.project_id,
        }, 200

    @app.delete("/api/tasks/<int:task_id>")
    @jwt_required()
    def delete_task(task_id):
        user = current_user()

        task = (
            Task.query.join(Project)
            .filter(Task.id == task_id, Project.user_id == user.id)
            .first()
        )
        if not task:
            return {"error": "task not found"}, 404

        db.session.delete(task)
        db.session.commit()

        return {"message": "deleted"}, 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(port=5555, debug=True)