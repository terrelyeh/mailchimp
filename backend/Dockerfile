# Use official Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy logic
COPY . .

# Expose port
EXPOSE 8000

# Command to run (using 0.0.0.0 for external access)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
