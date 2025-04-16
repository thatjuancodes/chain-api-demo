# LangGraph Chain API Demo

This project demonstrates a chained prompt processing API using LangGraph/LangChain and a React frontend.

## Project Structure

- `api/`: Contains the FastAPI backend with LangGraph implementation
- `frontend/`: Contains the React frontend
- `.env`: Environment variables (add your OpenAI API key here)

## Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

## Setup

### 1. Set up Python environment

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -e .
```

### 2. Set up environment variables

Edit the `.env` file and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Set up the React frontend

```bash
cd frontend
npm install
```

## Running the application

### 1. Start the API server

```bash
python run_api.py
```

The API will be available at http://localhost:8000

### 2. Start the React frontend

```bash
cd frontend
npm start
```

The frontend will be available at http://localhost:3000

## API Endpoints

- `GET /`: Welcome message
- `POST /api/chain`: Main endpoint for the chained prompt processing

## Chain Architecture

This demo implements a simple 3-step chained processing:

1. **Fact Extraction**: Extracts key facts from the user query
2. **Research**: Performs deeper research based on the extracted facts
3. **Response Generation**: Generates a comprehensive response based on research

Each step is visible in the UI, showing the inputs and outputs at each stage of the chain.
