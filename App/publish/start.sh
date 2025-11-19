docker compose down
docker system prune -a

gunzip onis-web-app.tar.gz 
docker load -i onis-web-app.tar
docker compose up -d
rm -f onis-web-app.tar.gz onis-web-app.tar
docker system prune -a