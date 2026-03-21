"""Vercel Serverless entry point — exports FastAPI ASGI app."""
import sys
import os

# Ensure the backend root is on the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
