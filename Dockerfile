# Sherubtse TripHub — Node.js / Express production image.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies without copying environment files.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

COPY . .
RUN mkdir -p /app/private_uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
