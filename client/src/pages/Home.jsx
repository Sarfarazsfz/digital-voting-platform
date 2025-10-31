import React, { useState, useEffect } from 'react'
import axios from 'axios'

const Home = () => {
  const [elections, setElections] = useState([])
  const [stats, setStats] = useState({ totalElections: 0, activeElections: 0, totalVotes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchElections()
    fetchStats()
  }, [])

  const fetchElections = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/elections')
      // Ensure we're working with an array
      const electionsData = Array.isArray(response.data) ? response.data : []
      setElections(electionsData.slice(0, 3)) // Show only 3 recent elections
    } catch (error) {
      console.error('Error fetching elections:', error)
      setElections([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    // This would be replaced with actual stats endpoint
    setStats({
      totalElections: elections.length,
      activeElections: elections.filter(e => e.isActive).length,
      totalVotes: 1247
    })
  }

  const getElectionStatus = (election) => {
    if (!election) return 'unknown'
    const now = new Date()
    const startTime = new Date(election.startTime)
    const endTime = new Date(election.endTime)
    
    if (now < startTime) return 'scheduled'
    if (now > endTime) return 'completed'
    return 'active'
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'btn-accent'
      case 'completed': return 'btn-secondary'
      case 'scheduled': return 'btn-primary'
      default: return 'btn-secondary'
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card text-center">
          <div className="flex flex-center">
            <div className="candidate-avatar">⏳</div>
          </div>
          <h3>Loading...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card text-center">
        <h2 className="section-title">Welcome to SpringVote</h2>
        <p className="mb-3">
          A secure, transparent, and efficient digital voting platform for modern democracies.
        </p>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalElections}</div>
          <div className="stat-label">Total Elections</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.activeElections}</div>
          <div className="stat-label">Active Elections</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalVotes}</div>
          <div className="stat-label">Total Votes Cast</div>
        </div>
      </div>

      {/* Recent Elections */}
      <div className="card">
        <h3 className="section-title">Recent Elections</h3>
        <div className="grid grid-3">
          {Array.isArray(elections) && elections.length > 0 ? (
            elections.map((election) => {
              const status = getElectionStatus(election)
              return (
                <div key={election._id || election.id} className="candidate-card">
                  <h4 className="mb-1">{election.title || 'Untitled Election'}</h4>
                  <p className="mb-2 small">{election.description || 'No description available'}</p>
                  <div className="flex flex-column gap-1">
                    <span className={`btn btn-small ${getStatusClass(status)}`}>
                      {status}
                    </span>
                    <span className="small">
                      Ends: {election.endTime ? new Date(election.endTime).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center" style={{ gridColumn: '1 / -1' }}>
              <p>No elections available.</p>
              <p className="small">Create your first election to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home