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
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'pdf'

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

  const handleModeChange = (mode) => {
    setInputMode(mode);
    // Clear everything when changing mode
    setQuery('');
    setResponse(null);
    setSteps([]);
    setError('');
    setSelectedFile(null);
    setPdfError('');
    setLoading(false); 
    setPdfLoading(false);
    // Clear file input visually if switching away from PDF mode
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) {
        fileInput.value = '';
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setResponse(null);
    setSteps([]);
    setError('');
    setPdfError('');
  };

  const handlePdfSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setPdfError('Please select a PDF file first.');
      return;
    }

    setPdfLoading(true);
    setPdfError('');
    // Clear previous results - response state is less critical now
    setResponse(null); 
    setSteps([]); 
    setError('');
    // Keep conversation history, but clear steps/errors for this new request

    const formData = new FormData();
    formData.append('file', selectedFile);
    const pdfFileName = selectedFile.name; // Store filename for message

    try {
      const result = await axios.post('/api/process_pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update conversation history with PDF processing turn
      const userMessage = { role: 'user', content: `Processed PDF: ${pdfFileName}` };
      const assistantMessage = { role: 'assistant', content: result.data.response };
      setConversationHistory(prev => [...prev, userMessage, assistantMessage]);

      // Update steps state
      setSteps(result.data.steps || []); // Ensure steps is always an array

      // Clear the specific response state - we use conversationHistory now
      setResponse(null); 

      setSelectedFile(null); // Clear the file input state
      e.target.reset(); // Clear the actual file input element value
    } catch (err) {
      console.error('Error uploading PDF:', err);
      const errorDetail = err.response?.data?.detail || 'Error processing PDF. Please try again.';
      setPdfError(errorDetail);
      // Optionally add error to conversation history? Or keep separate pdfError state.
      // setConversationHistory(prev => [...prev, { role: 'user', content: `Attempted to process PDF: ${pdfFileName}` }, { role: 'assistant', content: `Error: ${errorDetail}` }]);
      setSteps([]); // Clear steps on error
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>LangGraph Chain Demo</h1>
        <p>Choose your input method and see the chain processing</p>
      </header>

      <main>
        {/* Input Mode Selection */}
        <div className="input-mode-selector">
          <label>
            <input
              type="radio"
              name="inputMode"
              value="text"
              checked={inputMode === 'text'}
              onChange={() => handleModeChange('text')}
            />
            Text Input
          </label>
          <label>
            <input
              type="radio"
              name="inputMode"
              value="pdf"
              checked={inputMode === 'pdf'}
              onChange={() => handleModeChange('pdf')}
            />
            PDF Upload
          </label>
        </div>

        {/* Conditional Forms based on inputMode */}
        {inputMode === 'text' && (
          <section className="text-input-section">
             <h2>Enter Your Query</h2>
             <form onSubmit={handleSubmit} className="query-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your question..."
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Submit Text'}
              </button>
            </form>
          </section>
        )}

        {inputMode === 'pdf' && (
          <section className="pdf-upload-section">
            <h2>Process a PDF</h2>
            <form onSubmit={handlePdfSubmit} className="pdf-form">
              <input
                id="pdf-file-input" // Added ID for clearing
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={pdfLoading}
              />
              <button type="submit" disabled={!selectedFile || pdfLoading}>
                {pdfLoading ? 'Processing PDF...' : 'Upload & Process PDF'}
              </button>
            </form>
            {pdfError && <div className="error-message">{pdfError}</div>}
          </section>
        )}

        {/* Combined Error Display */}
        {error && <div className="error-message">Text Input Error: {error}</div>}
        {pdfError && <div className="error-message">PDF Error: {pdfError}</div>}

        {/* Display Conversation History (Handles both text and PDF results) */}
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