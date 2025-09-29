# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Battle Card Game - A new project currently being initialized.

## Development Status

This is a new project with no existing codebase. When implementing features:

1. Determine the technology stack with the user before creating files
2. Follow the established patterns once the initial architecture is set up
3. Update this CLAUDE.md file as the project structure evolves

## Commands

Commands will be added as the project is built and dependencies are installed.

## Database

The SQLite database file is located at `/backend/game.db`. This is the ONLY database file used by the application.
- All database operations go through `/backend/src/data/database.ts` and `/backend/src/data/dbStore.ts`
- Database backups are created with timestamp suffix (e.g. `game.db.backup.TIMESTAMP`)

## Architecture

Architecture details will be documented as the project structure is established.