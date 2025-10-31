import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import CreateElection from './pages/CreateElection'
import Vote from './pages/Vote'
import Results from './pages/Results'

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateElection />} />
            <Route path="/vote" element={<Vote />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App