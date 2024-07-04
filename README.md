# DOT-20 MARKET

This is a community-driven DOT-20 market project, which was upgraded from `DOT-20` index to `AssetHub` during the period.

> ⚠️ Disclaimer
> This project is for educational purposes only. It is not intended to be used in a production environment. The project is not affiliated with any organization or individual. The project is not responsible for any loss caused by the use of the project.

## Tech stack

This is a full-stack project by `TypeScript`, which uses the following technologies:

- TypeScript
- React
- Prisma
- TRPC
- NextUI
- TailwindCSS
- MySQL

## How to run

### 1. Prepare mysql database

```bash
docker run --name mysql -e MYSQL_ROOT_PASSWORD=123456 -d -p 3306:3306 mysql
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Database migration

```bash
pnpm prisma:migrate
```

> ⚠️ Note
> Need to modify the `DATABASE_URL` in the `.env` file to the correct database connection string.

### 4. Run the project

```bash
pnpm start:dev
```

##
