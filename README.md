## Mysql

```
docker run --name mysql -v /etc/mysql/conf.d:/etc/mysql/conf.d -v /var/lib/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 -p 3306:3306 -d mysql:8.3.0
```
