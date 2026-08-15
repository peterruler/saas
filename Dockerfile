# Stage 1: Build the Next.js static files
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy all frontend files
COPY . .

# Build argument for Clerk public key
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

# Note: Docker may warn about "secrets in ARG/ENV" - this is OK!
# The NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is meant to be public (it starts with pk_)

# Build the Next.js app (creates 'out' directory with static files)
RUN npm run build

# Stage 2: Create the final Python container
FROM python:3.12-slim

WORKDIR /app

# --- Lambda Web Adapter additions (the only changes vs. the video's Dockerfile) ---
# Drops a Lambda extension binary into /opt/extensions. The binary is inert
# unless invoked by the Lambda runtime, so local `docker run` is unaffected.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.0.0 /lambda-adapter /opt/extensions/lambda-adapter

# Tell the adapter which port FastAPI listens on
ENV PORT=8000

# Enable Lambda response streaming (required so SSE / streaming endpoints work end-to-end)
ENV AWS_LWA_INVOKE_MODE=response_stream
# --- end of Lambda Web Adapter additions ---

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI server
COPY api/server.py .

# Copy the Next.js static export from builder stage
COPY --from=frontend-builder /app/out ./static

# Health check (used during local Docker testing; Lambda does not call it)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Expose port 8000 (FastAPI will serve everything)
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]