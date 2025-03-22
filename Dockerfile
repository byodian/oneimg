# Base image with pnpm pre-installed
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN npm install -g pnpm@8.14.0

# Production dependencies stage
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

# Build stage
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . . 
RUN pnpm run build

# Final image (minimal size)
FROM base AS final
WORKDIR /app

# Copy only the necessary files from previous stages
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json pnpm-lock.yaml ./
COPY public ./public

EXPOSE 3000

# Set the entry point for production
CMD [ "pnpm", "start" ]
