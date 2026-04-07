FROM nginx:1.27-alpine

COPY nginx/frontend-split.conf /etc/nginx/conf.d/default.conf
COPY frontend/ /usr/share/nginx/html/
