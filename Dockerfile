FROM node:18

WORKDIR /app

# Copy only package files first (for caching)
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd backend && npm install

# Copy remaining code
COPY . .

WORKDIR /app/backend

EXPOSE 5000

CMD ["npm", "start"]