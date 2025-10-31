import React, { useState, useEffect } from 'react'
import axios from 'axios'

const Results = () => {
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchElections()
  }, [])

  const fetchElections = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/elections')
      const electionsData = Array.isArray(response.data) ? response.data : []
      setElections(electionsData)
    } catch (error) {
      console.error('Error fetching elections:', error)
      setElections([])
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async (electionId) => {
    try {
      const response = await axios.get(`/api/votes/results/${electionId}`)
      setResults(response.data)
      setSelectedElection(electionId)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults(null)
    }
  }

  const getWinner = (candidates) => {
    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) return null
    const maxVotes = Math.max(...candidates.map(c => c.votes || 0))
    const winners = candidates.filter(c => c.votes === maxVotes)
    return winners.length === 1 ? winners[0] : null
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

  if (loading) {
    return (
      <div className="container">
        <div className="card text-center">
          <div className="flex flex-center">
            <div className="candidate-avatar">⏳</div>
          </div>
          <h3>Loading elections...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="section-title">Election Results</h2>

        <div className="grid grid-4">
          {/* Election List */}
          <div className="grid gap-2">
            <h3 className="mb-2">Available Elections</h3>
            {Array.isArray(elections) && elections.length > 0 ? (
              elections.map((election) => {
                const status = getElectionStatus(election)
                return (
                  <button
                    key={election._id || election.id}
                    onClick={() => fetchResults(election._id || election.id)}
                    className={`btn btn-block ${selectedElection === (election._id || election.id) ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <div className="text-left">
                      <div className="font-bold">{election.title || 'Untitled Election'}</div>
                      <div className="small">
                        {status === 'completed' ? 'Completed' : 
                         status === 'active' ? 'Active' : 'Scheduled'}
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <p className="text-center">No elections available.</p>
            )}
          </div>

          {/* Results Display */}
          <div className="grid-3">
            {results ? (
              <div>
                <div className="flex flex-column gap-2 mb-3">
                  <h3 className="section-title">{results.title || 'Election Results'}</h3>
                  <p className="text-center">
                    Total Votes Cast: <strong>{results.totalVotes || 0}</strong>
                  </p>
                  {results.candidates && Array.isArray(results.candidates) && results.candidates.length > 0 && (
                    <div className="text-center">
                      <span className="btn btn-accent">
                        {getWinner(results.candidates) 
                          ? `Winner: ${getWinner(results.candidates).name}`
                          : 'Election Tied'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  {results.candidates && Array.isArray(results.candidates) ? (
                    results.candidates.map((candidate, index) => {
                      const percentage = results.totalVotes > 0 
                        ? (((candidate.votes || 0) / results.totalVotes) * 100).toFixed(1)
                        : 0
                      const isWinner = getWinner(results.candidates) === candidate
                      
                      return (
                        <div key={index} className={`result-bar ${isWinner ? 'winner' : ''}`}>
                          <div className="flex flex-column gap-1">
                            <div className="flex justify-between">
                              <div>
                                <h4 className="font-bold">{candidate.name || 'Unknown Candidate'}</h4>
                                {candidate.party && (
                                  <p className="small text-primary">{candidate.party}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="vote-count">{candidate.votes || 0}</div>
                                <div className="vote-percentage">{percentage}%</div>
                              </div>
                            </div>
                            
                            {candidate.description && (
                              <p className="small">{candidate.description}</p>
                            )}
                            
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center">No candidate data available.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center grid gap-2">
                <div className="candidate-avatar">📊</div>
                <h3>No Election Selected</h3>
                <p className="text-gray-dark">
                  Choose an election from the list to view results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results