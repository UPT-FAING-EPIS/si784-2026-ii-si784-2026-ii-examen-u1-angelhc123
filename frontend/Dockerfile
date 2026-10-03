# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Railway pasa las variables del servicio como build args si están declaradas aquí
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.27-alpine AS runtime
# La imagen oficial procesa /etc/nginx/templates/*.template con envsubst (usa ${PORT})
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=8080
EXPOSE 8080
