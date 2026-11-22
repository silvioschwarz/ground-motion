import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GroundMotionDashboard from "./GroundMotionDashboard.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GroundMotionDashboard />
  </StrictMode>
);
