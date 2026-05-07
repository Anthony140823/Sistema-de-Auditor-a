FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for psycopg, argon2, weasyprint)
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 8000

# Use entrypoint script (seeds DB then starts server)
ENTRYPOINT ["./entrypoint.sh"]
