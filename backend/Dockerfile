# Use official Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create data directory for persistent storage
# On Zeabur, mount a persistent volume to /data
RUN mkdir -p /data

# Set environment variable for database location
ENV DATA_DIR=/data

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic
COPY . .

# Expose port
EXPOSE 8000

# Command to run (using 0.0.0.0 for external access)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
