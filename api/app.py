from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF

# LangChain imports
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# Load environment variables
load_dotenv()

# Ensure you have an OpenAI API key
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable is not set")

app = FastAPI(title="LangGraph Chain API Demo")

# Add CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request and response models
class ChainRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = []

class ChainResponse(BaseModel):
    response: str
    steps: List[Dict[str, Any]]

# Initialize our LLM
llm = ChatOpenAI(
    model="gpt-4o",  # Change this based on your needs
    temperature=0.7,
)

# Define our state
class GraphState(dict):
    """The state of our graph."""
    messages: List[Any]
    steps: List[Dict[str, Any]]

# Define our state
class FinanceGraphState(dict):
    """The state of our graph."""
    messages: List[Any]
    steps: List[Dict[str, Any]]

# Define chain nodes
def fact_extraction(state: GraphState) -> GraphState:
    """Extract key facts from the user query."""
    messages = state["messages"]
    
    # Create a system message for fact extraction
    system_prompt = """You are a fact extraction expert. 
    Given a query, extract the key facts and entities present.
    Respond with a concise, structured list of facts."""
    
    # Extract the user query from the last message
    user_query = messages[-1].content
    
    # Run the LLM to extract facts
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_query)
    ])
    
    # Record this step
    state["steps"].append({
        "name": "fact_extraction",
        "input": user_query,
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

def fact_finance_extraction(state: FinanceGraphState) -> FinanceGraphState:
    """Extract key facts from the user query."""
    messages = state["messages"]
    
    # Create a system message for fact extraction
    system_prompt = """You are a financial expert in venture capital and startup funding. 
    Given a query, extract the key companies present in the portfolio and the values attached to them.
    Respond with a concise, structured list of all company records."""
    
    # Extract the user query from the last message
    user_query = messages[-1].content
    
    # Run the LLM to extract facts
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_query)
    ])
    
    # Record this step
    state["steps"].append({
        "name": "fact_finance_extraction",
        "input": user_query,
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

def research(state: GraphState) -> GraphState:
    """Research deeper information based on extracted facts."""
    messages = state["messages"]
    facts = messages[-1].content
    
    # Create a system message for research
    system_prompt = """You are a research expert.
    Based on the extracted facts, provide deeper context and information.
    Be thorough but concise, focusing on the most relevant details."""
    
    # Run the LLM for research
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Based on these facts: {facts}, provide deeper research.")
    ])
    
    # Record this step
    state["steps"].append({
        "name": "research",
        "input": facts,
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

def research_finance(state: FinanceGraphState) -> FinanceGraphState:
    """Research deeper information based on extracted facts."""
    messages = state["messages"]
    facts = messages[-1].content
    
    # Create a system message for research
    system_prompt = """You are a financial research expert.
    Based on the extracted facts, provide deeper context and information about startup funding and venture
    capital that happened in this quarter.
    Be thorough but concise, focusing on the most relevant details."""
    
    # Run the LLM for research
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Based on these facts: {facts}, provide deeper research.")
    ])
    
    # Record this step
    state["steps"].append({
        "name": "research_finance",
        "input": facts,
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

def response_generation(state: GraphState) -> GraphState:
    """Generate a final response based on all accumulated information."""
    messages = state["messages"]
    research_results = messages[-1].content
    original_query = messages[0].content
    
    # Create a system message for response generation
    system_prompt = """You are a helpful assistant.
    Based on the original query and research, provide a comprehensive and helpful response.
    Make sure to directly address the user's question in a clear, informative manner."""
    
    # Run the LLM for final response
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Original query: {original_query}\nResearch: {research_results}\nPlease provide a final response.")
    ])
    
    # Record this step
    state["steps"].append({
        "name": "response_generation",
        "input": f"Query: {original_query}\nResearch: {research_results}",
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

def response_finance_generation(state: FinanceGraphState) -> FinanceGraphState:
    """Generate a final response based on all accumulated information."""
    messages = state["messages"]
    research_results = messages[-1].content
    original_query = messages[0].content
    
    # Create a system message for response generation
    system_prompt = """You are a data scientist.
    Based on the original query and research, provide an array of json objects that represent the portfolio companies"""
    
    # Run the LLM for final response
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Original query: {original_query}\nResearch: {research_results}\nPlease provide a final response.")
    ])
    
    # Record this step
    state["steps"].append({
        "name": "response_finance_generation",
        "input": f"Query: {original_query}\nResearch: {research_results}",
        "output": response.content
    })
    
    # Add the response to the messages
    state["messages"].append(AIMessage(content=response.content))
    
    return state

# Create our LangGraph
def build_graph():
    workflow = StateGraph(GraphState)
    
    # Add nodes
    workflow.add_node("fact_extraction", fact_extraction)
    workflow.add_node("research", research)
    workflow.add_node("response_generation", response_generation)
    
    # Add edges
    workflow.add_edge("fact_extraction", "research")
    workflow.add_edge("research", "response_generation")
    workflow.add_edge("response_generation", END)
    
    # Set entry point
    workflow.set_entry_point("fact_extraction")
    
    return workflow.compile()

# Create our LangGraph
def build_finance_graph():
    workflow = StateGraph(FinanceGraphState)
    
    # Add nodes
    workflow.add_node("fact_finance_extraction", fact_finance_extraction)
    workflow.add_node("research_finance", research_finance)
    workflow.add_node("response_finance_generation", response_finance_generation)
    
    # Add edges
    workflow.add_edge("fact_finance_extraction", "research_finance")
    workflow.add_edge("research_finance", "response_finance_generation")
    workflow.add_edge("response_finance_generation", END)
    
    # Set entry point
    workflow.set_entry_point("fact_finance_extraction")
    
    return workflow.compile()

# Build our graph 
chain_graph = build_graph()
chain_finance_graph = build_finance_graph()

@app.get("/")
async def root():
    return {"message": "Welcome to the LangGraph Chain API Demo"}

@app.post("/api/chain", response_model=ChainResponse)
async def run_chain(request: ChainRequest):
    try:
        # Initialize state
        messages = [HumanMessage(content=request.query)]
        
        # Add conversation history if provided
        if request.conversation_history:
            for msg in request.conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Set up initial state
        state = {"messages": messages, "steps": []}
        
        # Run the graph
        result = chain_graph.invoke(state)
        
        # Extract the final response from the last AI message
        final_response = result["messages"][-1].content
        
        return {
            "response": final_response,
            "steps": result["steps"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chain/finance", response_model=ChainResponse)
async def run_chain(request: ChainRequest):
    try:
        # Initialize state
        messages = [HumanMessage(content=request.query)]
        
        # Add conversation history if provided
        if request.conversation_history:
            for msg in request.conversation_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
        
        # Set up initial state
        state = {"messages": messages, "steps": []}
        
        # Run the graph
        result = chain_finance_graph.invoke(state)
        
        # Extract the final response from the last AI message
        final_response = result["messages"][-1].content
        
        return {
            "response": final_response,
            "steps": result["steps"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process_pdf", response_model=ChainResponse)
async def process_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF file upload, extracts text using PyMuPDF, 
    runs the text through the finance chain graph, and returns the result.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        # Read the file content
        contents = await file.read()
        
        # Open the PDF using PyMuPDF
        doc = fitz.open(stream=contents, filetype="pdf")
        
        extracted_text = ""
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            extracted_text += page.get_text()
            
        doc.close()

        if not extracted_text.strip():
            # Handle case where no text could be extracted
            # Option 1: Raise an error
            # raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")
            # Option 2: Return empty response (or specific message)
             return {
                 "response": "No text could be extracted from the PDF.",
                 "steps": []
             }

        # Now, run the extracted text through the finance chain graph
        initial_state = {
            "messages": [HumanMessage(content=extracted_text)],
            "steps": []
        }
        
        # Run the graph - CHANGED TO USE chain_graph
        result = chain_finance_graph.invoke(initial_state)
        
        # Extract the final response from the last AI message
        final_response = result["messages"][-1].content
        
        return {
            "response": final_response,
            "steps": result["steps"]
        }

    except Exception as e:
        # Log the exception for debugging
        print(f"Error processing PDF {file.filename}: {e}") 
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True) 