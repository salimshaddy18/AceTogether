import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./pages/Auth/Signup";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Profile";
import ProtectedRoute from "./routes/ProtectedRoute";
import UpdateProfile from "./pages/UpdateProfile";
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/update-profile" element={<UpdateProfile />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App; 
