# Database Migration Instructions

## Initial Setup

1. **Ensure PostgreSQL is running** with the database created:
   ```bash
   createdb your_database_name
   ```

2. **Reset the database** (WARNING: This will delete all data):
   ```bash
   psql -h localhost -p 5432 -U your_user -d your_database -f scripts/reset-database.sql
   ```

3. **Run all migrations**:
   ```bash
   npm run migration:run
   ```

## Migration Order

The migrations will run in this order:
1. `1750000000000-InitialSchema` - Creates base tables (organizations, teams, users, roles, permissions, etc.)
2. `1751000000000-SeedRolesAndPermissions` - Seeds initial roles (SUPER_ADMIN, ADMIN, USER) and permissions
3. `1753767555858-CreatePromptsModuleTables` - Creates prompts-related tables
4. `1753909126511-AddPasswordAndRefreshTokenToUser` - Adds password and refreshToken columns to user table
5. `1754000000000-SeedAgentPrompts` - Seeds agent prompts
6. `1754100000000-SeedAdminUser` - Creates default admin and user accounts

## Default Users

After running migrations, the following users will be available:
- **Admin**: `admin@lumify.ai` / `admin123!`
- **User**: `user@lumify.ai` / `user123!`

## Running the Server

After migrations are complete, start the server:
```bash
npm run start:dev
```

Note: The SeedService will not run automatically unless you set `RUN_SEEDS=true` in your environment variables.

## Troubleshooting

If you encounter errors:
1. Make sure PostgreSQL is running
2. Check that your `.env` file has the correct database credentials
3. Ensure the database exists
4. Try resetting the database and running migrations again