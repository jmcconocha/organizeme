import { Routes, Route } from "react-router-dom"
import { DashboardPage } from "./pages/dashboard"
import { ProjectDetailPage } from "./pages/project-detail"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
    </Routes>
  )
}
