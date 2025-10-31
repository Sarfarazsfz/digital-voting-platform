import React, { useState, useEffect } from 'react'
import axios from 'axios'

const Vote = () => {
  const [step, setStep] = useState(1) // 1: Verification, 2: Select Election, 3: Cast Vote
  const [voterData, setVoterData] = useState({
    voterId: '',
    name: '',
    email: '',
    age: ''
  })
  const [elections, setElections] = useState([])
  const [selectedElection, setSelectedElection] = useState(null)
  const [verifiedUser, setVerifiedUser] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchActiveElections()
  }, [])

  const fetchActiveElections = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/elections/active')
      const electionsData = Array.isArray(response.data) ? response.data : []
      setElections(electionsData)
    } catch (error) {
      console.error('Error fetching elections:', error)
      setElections([])
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.post('/api/auth/verify', voterData)
      if (response.data.verified) {
        setVerifiedUser(response.data.user)
        setStep(2)
        setMessage('')
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleElectionSelect = (election) => {
    setSelectedElection(election)
    setStep(3)
  }

  const castVote = async (candidateIndex) => {
    try {
      setLoading(true)
      await axios.post('/api/votes/cast', {
        electionId: selectedElection._id,
        voterId: verifiedUser.id,
        candidateIndex
      })
      setMessage('Vote cast successfully!')
      setStep(4) // Success step
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to cast vote')
    } finally {
      setLoading(false)
    }
  }

  const resetProcess = () => {
    setStep(1)
    setVoterData({ voterId: '', name: '', email: '', age: '' })
    setVerifiedUser(null)
    setSelectedElection(null)
    setMessage('')
  }

  const getStepStatus = (stepNumber) => {
    if (step > stepNumber) return 'completed'
    if (step === stepNumber) return 'active'
    return ''
  }

  return (
    <div className="container-sm">
      <div className="card">
        <h2 className="section-title">Cast Your Vote</h2>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${getStepStatus(1)}`}>
            <div className="step-number">1</div>
            <div className="step-label">Verify</div>
          </div>
          <div className={`step ${getStepStatus(2)}`}>
            <div className="step-number">2</div>
            <div className="step-label">Select</div>
          </div>
          <div className={`step ${getStepStatus(3)}`}>
            <div className="step-number">3</div>
            <div className="step-label">Vote</div>
          </div>
          <div className={`step ${getStepStatus(4)}`}>
            <div className="step-number">4</div>
            <div className="step-label">Complete</div>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.includes('Error') || message.includes('failed') 
            ? 'alert-error' 
            : 'alert-success'}`}>
            {message}
          </div>
        )}

        {loading && (
          <div className="alert alert-info text-center">
            Loading...
          </div>
        )}

        {/* Step 1: Voter Verification */}
        {step === 1 && (
          <form onSubmit={handleVerification}>
            <h3 className="section-title">Voter Verification</h3>
            
            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label">Voter ID *</label>
                <input
                  type="text"
                  value={voterData.voterId}
                  onChange={(e) => setVoterData({...voterData, voterId: e.target.value})}
                  className="form-input"
                  required
                  minLength="10"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  value={voterData.name}
                  onChange={(e) => setVoterData({...voterData, name: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  value={voterData.email}
                  onChange={(e) => setVoterData({...voterData, email: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Age *</label>
                <input
                  type="number"
                  value={voterData.age}
                  onChange={(e) => setVoterData({...voterData, age: e.target.value})}
                  className="form-input"
                  required
                  min="18"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-accent btn-block"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
          </form>
        )}

        {/* Step 2: Select Election */}
        {step === 2 && (
          <div>
            <h3 className="section-title">Select Election</h3>
            <div className="grid gap-2">
              {Array.isArray(elections) && elections.length > 0 ? (
                elections.map((election) => (
                  <div key={election._id || election.id} className="candidate-card">
                    <h4 className="mb-1">{election.title || 'Untitled Election'}</h4>
                    <p className="mb-2">{election.description || 'No description available'}</p>
                    <div className="flex flex-column gap-1">
                      <span className="small">
                        Ends: {election.endTime ? new Date(election.endTime).toLocaleString() : 'Unknown'}
                      </span>
                      <button
                        onClick={() => handleElectionSelect(election)}
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        Select Election
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center">No active elections available.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Cast Vote */}
        {step === 3 && selectedElection && (
          <div>
            <h3 className="section-title">Cast Your Vote</h3>
            <p className="text-center mb-3">
              Election: <strong>{selectedElection.title || 'Untitled Election'}</strong>
            </p>
            <p className="text-center mb-3">{selectedElection.description || 'No description available'}</p>

            <div className="grid grid-3">
              {selectedElection.candidates && Array.isArray(selectedElection.candidates) ? (
                selectedElection.candidates.map((candidate, index) => (
                  <div key={index} className="candidate-card">
                    <div className="candidate-avatar">
                      {candidate.name ? candidate.name.charAt(0) : '?'}
                    </div>
                    <h4 className="mb-1">{candidate.name || 'Unknown Candidate'}</h4>
                    {candidate.party && (
                      <p className="mb-1 text-primary">{candidate.party}</p>
                    )}
                    <p className="mb-2 small">{candidate.description || 'No description'}</p>
                    <button
                      onClick={() => castVote(index)}
                      className="btn btn-accent btn-block"
                      disabled={loading}
                    >
                      {loading ? 'Casting Vote...' : `Vote for ${candidate.name || 'Candidate'}`}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center" style={{ gridColumn: '1 / -1' }}>
                  No candidates available for this election.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="candidate-avatar bg-success mb-3">
              ✓
            </div>
            <h3 className="section-title">Vote Cast Successfully!</h3>
            <p className="mb-3">
              Thank you for participating in the democratic process. Your vote has been recorded.
            </p>
            <button
              onClick={resetProcess}
              className="btn btn-primary"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Vote