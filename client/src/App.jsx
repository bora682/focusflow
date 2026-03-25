import { useState, useEffect } from "react";
import {
  Link,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";

function Home() {
  return <h2>Welcome to FocusFlow</h2>;
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
  });

  function handleAuthError(message = "Session expired. Please log in again.") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setError(message);
    navigate("/login");
  }

  async function loadProjects() {
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        handleAuthError("No token found. Please log in again.");
        return;
      }

      const response = await fetch("http://127.0.0.1:5555/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401 || data.msg === "Token has expired") {
        handleAuthError("Token has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setError(data.error || data.msg || "Failed to load projects");
        return;
      }

      setProjects(data);
    } catch (err) {
      setError("Something went wrong");
      console.error(err);
    }
  }

  async function loadTasks(projectId) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://127.0.0.1:5555/api/projects/${projectId}/tasks?page=1&per_page=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401 || data.msg === "Token has expired") {
        handleAuthError("Token has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setError(data.error || data.msg || "Failed to load tasks");
        return;
      }

      setTasks(data.items);
    } catch (err) {
      setError("Something went wrong while loading tasks");
      console.error(err);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function handleProjectChange(event) {
    const { name, value } = event.target;
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleTaskChange(event) {
    const { name, value } = event.target;
    setTaskForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        handleAuthError("No token found. Please log in again.");
        return;
      }

      const response = await fetch("http://127.0.0.1:5555/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectForm),
      });

      const data = await response.json();

      if (response.status === 401 || data.msg === "Token has expired") {
        handleAuthError("Token has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setError(data.error || data.msg || "Failed to create project");
        return;
      }

      setProjects((prev) => [data, ...prev]);

      setProjectForm({
        name: "",
        description: "",
      });
    } catch (err) {
      setError("Something went wrong");
      console.error(err);
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!selectedProject) {
        setError("Please select a project first.");
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:5555/api/projects/${selectedProject.id}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(taskForm),
        }
      );

      const data = await response.json();

      if (response.status === 401 || data.msg === "Token has expired") {
        handleAuthError("Token has expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setError(data.error || data.msg || "Failed to create task");
        return;
      }

      await loadTasks(selectedProject.id);

      setTaskForm({
        title: "",
        description: "",
      });
    } catch (err) {
      setError("Something went wrong");
      console.error(err);
    }
  }

  async function handleSelectProject(project) {
    setSelectedProject(project);
    await loadTasks(project.id);
  }

  return (
    <div>
      <h2>Dashboard</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form
        onSubmit={handleCreateProject}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "320px",
          margin: "20px auto",
        }}
      >
        <input
          type="text"
          name="name"
          placeholder="Project name"
          value={projectForm.name}
          onChange={handleProjectChange}
        />

        <input
          type="text"
          name="description"
          placeholder="Project description"
          value={projectForm.description}
          onChange={handleProjectChange}
        />

        <button type="submit">Create Project</button>
      </form>

      <h3>Your Projects</h3>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {projects.map((project) => (
          <li
            key={project.id}
            onClick={() => handleSelectProject(project)}
            style={{
              border: "1px solid #ddd",
              margin: "10px auto",
              padding: "12px",
              maxWidth: "400px",
              cursor: "pointer",
            }}
          >
            <strong>{project.name}</strong>
            <p>{project.description}</p>
          </li>
        ))}
      </ul>

      {selectedProject && (
        <div style={{ marginTop: "30px" }}>
          <h3>Tasks for: {selectedProject.name}</h3>

          <form
            onSubmit={handleCreateTask}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "320px",
              margin: "20px auto",
            }}
          >
            <input
              type="text"
              name="title"
              placeholder="Task title"
              value={taskForm.title}
              onChange={handleTaskChange}
            />

            <input
              type="text"
              name="description"
              placeholder="Task description"
              value={taskForm.description}
              onChange={handleTaskChange}
            />

            <button type="submit">Create Task</button>
          </form>

          {tasks.length === 0 ? (
            <p>No tasks yet for this project.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {tasks.map((task) => (
                <li
                  key={task.id}
                  style={{
                    border: "1px solid #888",
                    margin: "10px auto",
                    padding: "12px",
                    maxWidth: "400px",
                  }}
                >
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                  <p>Status: {task.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("http://127.0.0.1:5555/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccessMessage("Signup successful! Redirecting to login...");

      setFormData({
        username: "",
        email: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      <h2>Signup Page</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "320px",
          margin: "20px auto",
        }}
      >
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />

        <button type="submit">Create Account</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
    </div>
  );
}

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:5555/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setFormData({
        email: "",
        password: "",
      });

      navigate("/dashboard");
    } catch (err) {
      setError("Something went wrong.");
    }
  }

  return (
    <div>
      <h2>Login Page</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "320px",
          margin: "20px auto",
        }}
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />

        <button type="submit">Log In</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default function App() {
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ padding: "20px", borderBottom: "1px solid #ddd" }}>
        <Link to="/" style={{ marginRight: "15px" }}>Home</Link>
        <Link to="/login" style={{ marginRight: "15px" }}>Login</Link>
        <Link to="/signup" style={{ marginRight: "15px" }}>Signup</Link>
        <Link to="/dashboard" style={{ marginRight: "15px" }}>Dashboard</Link>
        {isLoggedIn && <button onClick={handleLogout}>Logout</button>}
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}