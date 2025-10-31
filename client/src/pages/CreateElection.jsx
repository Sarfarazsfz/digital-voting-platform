import React, { useState } from 'react'
import axios from 'axios'

const CreateElection = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: ''
  })
  const [candidates, setCandidates] = useState([{ name: '', party: '', description: '' }])
  const [message, setMessage] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCandidateChange = (index, field, value) => {
    const updatedCandidates = [...candidates]
    updatedCandidates[index][field] = value
    setCandidates(updatedCandidates)
  }

  const addCandidate = () => {
    setCandidates([...candidates, { name: '', party: '', description: '' }])
  }

  const removeCandidate = (index) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const electionData = {
        ...formData,
        candidates: candidates.filter(candidate => candidate.name.trim() !== '')
      }

      const response = await axios.post('/api/elections', electionData)
      setMessage('Election created successfully!')
      setFormData({ title: '', description: '', startTime: '', endTime: '' })
      setCandidates([{ name: '', party: '', description: '' }])
    } catch (error) {
      setMessage('Error creating election: ' + (error.response?.data?.message || error.message))
    }
  }

  return (
    <div className="container-sm">
      <div className="card">
        <h2 className="section-title">Create New Election</h2>
        
        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2 gap-2">
            <div className="form-group">
              <label className="form-label">Election Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-2 gap-2">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="flex flex-column gap-2">
              <h3 className="mb-1">Candidates</h3>
              <button
                type="button"
                onClick={addCandidate}
                className="btn btn-secondary"
              >
                Add Candidate
              </button>
            </div>

            <div className="grid gap-2">
              {candidates.map((candidate, index) => (
                <div key={index} className="candidate-card">
                  <div className="grid grid-3 gap-1 mb-1">
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input
                        type="text"
                        value={candidate.name}
                        onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Party</label>
                      <input
                        type="text"
                        value={candidate.party}
                        onChange={(e) => handleCandidateChange(index, 'party', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group flex flex-column justify-end">
                      <button
                        type="button"
                        onClick={() => removeCandidate(index)}
                        className="btn btn-danger btn-small"
                        disabled={candidates.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      value={candidate.description}
                      onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-block"
          >
            Create Election
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateElection