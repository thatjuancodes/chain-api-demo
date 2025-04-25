import React, { useState } from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Add user message to history
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: query }
      ];
      
      // Call our API endpoint
      const result = await axios.post('/api/chain/finance', {
        query,
        conversation_history: conversationHistory
      });
      
      // Update conversation history with assistant's response
      updatedHistory.push({ role: 'assistant', content: result.data.response });
      setConversationHistory(updatedHistory);
      
      // Update UI with response and steps
      setResponse(result.data.response);
      setSteps(result.data.steps);
      
    } catch (err) {
      console.error('Error calling API:', err);
      setError('Error processing your request. Please try again.');
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>LangGraph Chain Demo</h1>
        <p>Ask a question and see the chain of prompt processing</p>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="query-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your question..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {conversationHistory.length > 0 && (
          <div className="conversation-history">
            <h2>Conversation</h2>
            {conversationHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
                <strong>{msg.role === 'user' ? 'You: ' : 'Assistant: '}</strong>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {steps.length > 0 && (
          <div className="chain-steps">
            <h2>Chain Processing Steps</h2>
            <div className="steps-container">
              {steps.map((step, idx) => (
                <div key={idx} className="step-card">
                  <h3>{step.name}</h3>
                  <div className="step-content">
                    <div className="step-input">
                      <h4>Input:</h4>
                      <p>{step.input}</p>
                    </div>
                    <div className="step-output">
                      <h4>Output:</h4>
                      <p>{step.output}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 