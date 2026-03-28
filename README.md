# FocusFlow

## Description
FocusFlow is a task management application designed for students and freelancers who manage multiple projects. Users can create projects, add tasks, update task status, and stay organized in a simple dashboard.

---

## Features

- User authentication (signup & login with JWT)
- Create and delete projects
- Create and delete tasks within projects
- Update task status (todo → done)
- Protected routes (dashboard requires login)

---

## Tech Stack

### Frontend
- React (Vite)
- React Router

### Backend
- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-JWT-Extended
- Flask-Bcrypt

---

## How to Run Locally

### 1. Clone the repo
```bash
git clone https://github.com/bora682/focusflow.git
cd focusflow
```

### 2. Backend Setup
```bash
cd server
pipenv install
pipenv shell
export FLASK_APP=app.py
flask db upgrade
flask run -p 5555
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```

## Demo
- Users can sign up and log in 
- Users can create projects
- Users can add tasks to each project
- Users can mark tasks as done
- Users can delete tasks and projects

## Deployment
Live App: https://focusflow-dashboard.netlify.app

## Author
Deborah Im