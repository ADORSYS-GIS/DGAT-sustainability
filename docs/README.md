# DGRV Digital Tools — Documentation Index

This directory contains all handover documentation for the DGAT Sustainability
Tool. Start with the Architecture overview, then drill into the area you need.

## Getting Started / Overview
- [Developer Setup Guide](DEVELOPER_SETUP.md) — from clone to a running local stack
- [System Architecture](ARCHITECTURE.md) — components, data flow, topology
- [Roles & RBAC](RBAC_ROLES.md) — role hierarchy, backend & frontend authorization
- [Database Schema](DATABASE_SCHEMA.md) — entities, JSONB usage, migrations

## Operations
- [CI/CD Pipeline](CICD_PIPELINE.md) — CI jobs and image deploy workflow
- [Deployment Guide](DEPLOYMENT.md) — SSH → pull → up, SSL/Certbot, hardening
- [Backup & Restore](BACKUP_RESTORE.md) — backup scripts, scheduling, recovery scenarios

## Review & Audit
- [IT Review Meeting](IT_REVIEW_MEETING.md) — original meeting template
- [IT Review Answers](IT_REVIEW_ANSWERS.md) — answers to every open question above

## Deep-Dive / Feature Docs
- [Offline Architecture](OFFLINE_ARCHITECTURE.md) — PWA offline & sync design
- [JWT Verification](jwt-verification.md) — JWT validation internals
- [Endpoints](Endpoints.md) — API endpoint reference
- [Technical Implementation Details](TECHNICAL_IMPLEMENTATION_DETAILS.md)
- [Current Architecture Analysis](CURRENT_ARCHITECTURE_ANALYSIS.md)
- [Category Assignment Feature](CATEGORY_ASSIGNMENT_FEATURE.md)
- [Category Assignment Implementation](CATEGORY_ASSIGNMENT_IMPLEMENTATION.md)
- [Category Assignment Roadmap](CATEGORY_ASSIGNMENT_ROADMAP.md)
- [Pending Invitation Tracking](PENDING_INVITATION_TRACKING.md)
- [User Invitation Flow](user-invitation-flow.md) — how users get invited, verify email, and join an org
- [Phase 3 Completion](PHASE_3_COMPLETION.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Testing Guide](TESTING_GUIDE.md) / [Quick Test Guide](QUICK_TEST_GUIDE.md)
- [Architecture (arc42)](architecture/arc42.md) / [Docker Deployment Guide](architecture/Docker%20Deployment%20Guide.md)

## Frontend docs
- [Frontend Authentication](../frontend/docs/AUTHENTICATION.md)
- [Frontend Architecture](../frontend/docs/frontend_Arc_Document.md)
- [Keycloak setup](../frontend/docs/Keycloak.md)
- [Workflow](../frontend/docs/workflow.md)