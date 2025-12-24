import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import ProjectsList from '../components/ProjectsList'
import ProjectForm from '../components/ProjectForm'
import '../styles/ProjectsPage.css'

function ProjectsPage() {
  const { token, logout, user, refreshUser } = useContext(AuthContext)
  const [showForm, setShowForm] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [notice, setNotice] = useState('')
  const [connecting, setConnecting] = useState(false)

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('github_connected')) {
      setNotice(`GitHub connected${params.get('github_username') ? ` as ${params.get('github_username')}` : ''}`)
      refreshUser && refreshUser()
      params.delete('github_connected')
      params.delete('github_username')
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [refreshUser])

  const handleLogout = () => {
    logout()
  }

  const handleProjectCreated = () => {
    setShowForm(false)
    setRefresh(refresh + 1)
  }

  const handleConnectGitHub = async () => {
    setNotice('')
    setConnecting(true)
    try {
      const returnTo = encodeURIComponent(window.location.href)
      const res = await fetch(`${baseUrl}/api/github/oauth/start?return_to=${returnTo}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to start GitHub OAuth')
      const data = await res.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        throw new Error('Invalid OAuth response')
      }
    } catch (err) {
      setNotice(`GitHub connect error: ${err.message}`)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="projects-page">
      <header className="page-header">
        <h1>Project Portfolio Manager</h1>
        <div className="header-actions">
          {user?.github_username ? (
            <span className="github-connected">GitHub: {user.github_username}</span>
          ) : (
            <button className="btn-secondary" onClick={handleConnectGitHub} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect GitHub'}
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {notice && <div className="notice-banner">{notice}</div>}

      <main className="page-content">
        <div className="projects-section">
          <div className="section-header">
            <h2>Projects</h2>
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'New Project'}
            </button>
          </div>

          {showForm && (
            <ProjectForm
              token={token}
              baseUrl={baseUrl}
              onSuccess={handleProjectCreated}
            />
          )}

          <ProjectsList
            token={token}
            baseUrl={baseUrl}
            refresh={refresh}
            onRefresh={() => setRefresh(refresh + 1)}
          />
        </div>
      </main>
    </div>
  )
}

export default ProjectsPage
