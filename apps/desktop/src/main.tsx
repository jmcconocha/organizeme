import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { ThemeProvider } from "@organizeme/ui/components/theme-provider"
import { DesktopNavigationProvider } from "./providers/navigation-provider"
import { DesktopDataProviderWrapper } from "./providers/data-provider"
import { App } from "./App"
import "./app.css"

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#ef4444" }}>
          <h1>Render Error</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 16 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <DesktopNavigationProvider>
              <DesktopDataProviderWrapper>
                <App />
              </DesktopDataProviderWrapper>
            </DesktopNavigationProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (err) {
  document.getElementById("root")!.innerHTML =
    `<pre style="padding:40px;color:red;font-family:monospace">Boot error: ${err}</pre>`
}
