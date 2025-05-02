import React, { useState } from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view';

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
  const [inputMode, setInputMode] = useState('pdf'); // Default to PDF mode

  const handleModeChange = (mode) => {
    setInputMode(mode);
    setQuery('');
    setResponse(null);
    setSteps([]);
    setError('');
    setSelectedFile(null);
    setPdfError('');
    setLoading(false);
    setPdfLoading(false);
    setConversationHistory([]); // Clear history on mode change for simplicity now
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setPdfError(''); 
    // Clear results when a new file is selected, keep history
    setResponse(null);
    setSteps([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSteps([]);
    setResponse(null);

    const currentHistory = [
        ...conversationHistory,
        { role: 'user', content: query }
      ];

    try {
      const result = await axios.post('/api/chain', { // Using the original chain endpoint
        query,
        conversation_history: conversationHistory // Send previous turns
      });
      setConversationHistory([
        ...currentHistory, 
        { role: 'assistant', content: result.data.response }
      ]);
      setSteps(result.data.steps || []);
    } catch (err) {
      console.error('Error calling API:', err);
      setError(err.response?.data?.detail || 'Error processing your request.');
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const handlePdfSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setPdfError('Please select a PDF file first.');
      return;
    }
    setPdfLoading(true);
    setPdfError('');
    setSteps([]);
    setResponse(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    const pdfFileName = selectedFile.name;

    try {
      const result = await axios.post('/api/process_pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const userMessage = { role: 'user', content: `Processed PDF: ${pdfFileName}` };
      const assistantMessage = { role: 'assistant', content: result.data.response };
      setConversationHistory(prev => [...prev, userMessage, assistantMessage]);
      setSteps(result.data.steps || []);
    } catch (err) {
      console.error('Error uploading PDF:', err);
      const errorDetail = err.response?.data?.detail || 'Error processing PDF.';
      setPdfError(errorDetail);
    } finally {
      setPdfLoading(false);
      setSelectedFile(null);
      if(e.target.reset) e.target.reset(); // Reset form to clear file input
    }
  };

  return (
    <div className="container-fluid d-flex flex-column min-vh-100 p-5">
      <header className="text-center pt-4 pb-3">
        <h1>LangGraph Chain Demo</h1>
        <p className="lead">Choose your input method and see the chain processing</p>
      </header>

      <main className="flex-grow-1 d-flex flex-column">
        {/* Input Mode Selection - Tabs */}
        <nav>
          <div className="nav nav-tabs nav-fill mb-4" id="inputModeTab" role="tablist">
            <button 
              className={`nav-link ${inputMode === 'pdf' ? 'active' : ''}`}
              id="pdf-tab"
              type="button"
              role="tab"
              aria-controls="pdf-panel"
              aria-selected={inputMode === 'pdf'}
              onClick={() => handleModeChange('pdf')}
            >
              PDF Upload
            </button>
            <button 
              className={`nav-link ${inputMode === 'text' ? 'active' : ''}`}
              id="text-tab"
              type="button"
              role="tab"
              aria-controls="text-panel"
              aria-selected={inputMode === 'text'}
              onClick={() => handleModeChange('text')}
             >
              Text Input
            </button>
          </div>
        </nav>

        {/* Tab Content Panes - Takes remaining space */} 
        <div className="tab-content flex-grow-1" id="inputModeTabContent">
          
          {/* PDF Panel - Conditionally Rendered */}
          {inputMode === 'pdf' && (
            <div 
              className="tab-pane fade show active h-100 d-flex flex-column" /* Always show active when rendered */
              id="pdf-panel"
              role="tabpanel"
              aria-labelledby="pdf-tab"
            >
              <div className="card mb-4">
                <div className="card-header">Process a PDF</div>
                <div className="card-body">
                  <form onSubmit={handlePdfSubmit}>
                    <div className="input-group mb-3">
                      <input
                        type="file"
                        className="form-control"
                        id="pdf-file-input"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={pdfLoading}
                        aria-label="Select PDF file"
                      />
                      <button className="btn btn-success" type="submit" disabled={!selectedFile || pdfLoading}>
                        {pdfLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span className="visually-hidden">Loading...</span> Processing...
                          </>
                        ) : 'Upload & Process'}
                      </button>
                    </div>
                    {pdfError && <div className="alert alert-danger mt-3">{pdfError}</div>}
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Text Panel - Conditionally Rendered */}
          {inputMode === 'text' && (
            <div 
              className="tab-pane fade show active h-100 d-flex flex-column" /* Always show active when rendered */
              id="text-panel"
              role="tabpanel"
              aria-labelledby="text-tab"
            >
              <div className="card mb-4">
                <div className="card-header">Enter Your Query</div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your question..."
                        disabled={loading}
                        aria-label="Enter your question"
                      />
                      <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span className="visually-hidden">Loading...</span> Processing...
                          </>
                        ) : 'Submit Text'}
                      </button>
                    </div>
                    {error && <div className="alert alert-danger mt-3">{error}</div>}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Results Area - Separated from Tab content for consistent visibility */} 
        <div className="results-area mt-4 flex-grow-1 overflow-auto">
          {/* Conversation History */} 
          {conversationHistory.length > 0 && (
            <div className="mb-4">
              <h2>Conversation</h2>
              {conversationHistory.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`card mb-2 ${msg.role === 'user' ? 'border-primary' : 'border-secondary'}`}>
                  <div className={`card-body ${msg.role === 'user' ? 'text-primary' : 'text-dark'}`}>
                     <p className="mb-0"><strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong></p>
                     <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chain Processing Steps */} 
          {steps.length > 0 && (
            <div className="mb-4">
              <h2>Chain Processing Steps</h2>
               <div className="accordion" id="stepsAccordion">
                 {steps.map((step, idx) => (
                   <div className="accordion-item" key={idx}>
                    <h2 className="accordion-header" id={`heading-${idx}`}>
                      <button 
                        className="accordion-button collapsed" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target={`#collapse-${idx}`} 
                        aria-expanded="false" 
                        aria-controls={`collapse-${idx}`}>
                        Step {idx + 1}: {step.name}
                      </button>
                    </h2>
                    <div 
                      id={`collapse-${idx}`} 
                      className="accordion-collapse collapse" 
                      aria-labelledby={`heading-${idx}`} 
                      data-bs-parent="#stepsAccordion">
                      <div className="accordion-body">
                        <div className="mb-3">
                           <h5>Input:</h5>
                           <pre className="bg-light p-2 border rounded"><code>{typeof step.input === 'object' ? JSON.stringify(step.input, null, 2) : step.input}</code></pre>
                         </div>
                         <div>
                           <h5>Output:</h5>
                           <pre className="bg-light p-2 border rounded"><code>{typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : step.output}</code></pre>
                         </div>
                      </div>
                    </div>
                  </div>
                 ))}
              </div> 
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App; 