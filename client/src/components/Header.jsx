import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Header = () => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1>SpringVote</h1>
            <p>Secure Digital Voting Platform</p>
          </div>
        </div>
      </header>
      
      <nav className="nav">
        <div className="container">
          <div className="nav-links">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link 
              to="/create" 
              className={`nav-link ${isActive('/create') ? 'active' : ''}`}
            >
              Create Election
            </Link>
            <Link 
              to="/vote" 
              className={`nav-link ${isActive('/vote') ? 'active' : ''}`}
            >
              Vote
            </Link>
            <Link 
              to="/results" 
              className={`nav-link ${isActive('/results') ? 'active' : ''}`}
            >
              Results
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Header