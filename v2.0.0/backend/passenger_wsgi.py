import os
import sys

# Set up paths
sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware
from server import app

# Passenger WSGI bridge for FastAPI
application = ASGIMiddleware(app)
