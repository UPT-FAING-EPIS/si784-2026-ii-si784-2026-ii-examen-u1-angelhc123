# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
# Railway pasa las variables del servicio como build args si están declaradas aquí
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Runtime ----------
# nginx sin privilegios (usuario 101); procesa /etc/nginx/templates/*.template con envsubst (${PORT})
FROM nginxinc/nginx-unprivileged:alpine AS runtime
USER root
RUN apk upgrade --no-cache
COPY --chown=101:101 nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chown=101:101 --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080
USER 101
