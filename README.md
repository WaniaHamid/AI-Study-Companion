# AI Study Companion

An AI-powered study platform designed to help students **upload study materials, interact with AI, generate quizzes, and track their learning activity** through a modern web application.

The project follows a full-stack architecture with a **Next.js frontend**, **Node.js/Express backend**, **MongoDB**, **Redis**, and **Apache Kafka**, with AI-powered functionality integrated into the backend.

---

## Overview

**AI Study Companion** is a full-stack educational platform that combines AI assistance with structured study management.

Students can use the platform to:

- Upload and manage study documents
- Interact with an AI-powered study assistant
- Generate and take quizzes
- View learning and activity analytics
- Create accounts and securely authenticate
- Work with uploaded study materials
- Use Redis and Kafka for scalable backend processing

The system is built with a modular backend architecture and a responsive Next.js frontend.

---

## Features

### AI Study Assistant

The platform provides an AI-powered chat interface for interacting with study-related content.

- AI-powered study conversations
- Backend AI service integration
- Dedicated AI API routes
- AI activity logging
- Structured service architecture

---

### Document Management

Students can upload and manage their study materials.

- Document upload
- Document management
- File metadata handling
- Backend document services
- File upload middleware
- Persistent document records

Uploaded files are stored separately from the Git repository and are intentionally excluded from version control.

---

### Quiz System

The platform includes a dedicated quiz workflow.

- Quiz generation and management
- Quiz API routes
- Quiz data models
- Quiz service layer
- Interactive quiz interface

---

### Analytics

The application includes an analytics section for tracking study activity.

- Analytics dashboard
- Backend analytics routes
- Analytics service layer
- AI activity logging

---

### Authentication

The application provides user authentication and protected backend functionality.

- User registration
- User login
- Authentication middleware
- JWT-based authentication
- Refresh-token support
- Protected API routes
- User model

---

## System Architecture

The project follows a layered full-stack architecture:

```text
                    ┌──────────────────────┐
                    │      Next.js         │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │   Node.js / Express  │
                    │       Backend        │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐     ┌───────────┐     ┌───────────┐
       │ MongoDB   │     │   Redis   │     │   Kafka   │
       │ Database  │     │  Caching  │     │ Messaging │
       └───────────┘     └───────────┘     └───────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │  AI Services  │
                       └───────────────┘
```

---

## Tech Stack

### Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query**
- **Zustand**

### Backend

- **Node.js**
- **Express.js**
- **JavaScript**
- **REST APIs**
- **JWT Authentication**
- **Mongoose**

### Database

- **MongoDB**

### Infrastructure & Messaging

- **Redis**
- **Apache Kafka**
- **Docker Compose**

### AI

- AI service integration
- LLM-powered study assistance
- AI activity logging

## Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB
- Redis
- Apache Kafka
- Docker Desktop _(recommended for infrastructure services)_

## Environment Variables

The repository includes example environment files:

```text
backend/.env.example
frontend/.env.local.example
```

Create your own local environment files from these examples.

### Backend

The backend environment configuration includes variables for:

- Server configuration
- MongoDB
- JWT authentication
- Redis
- Kafka
- AI API configuration
- File uploads
- Rate limiting
- CORS/frontend configuration

### Frontend

The frontend uses environment variables for:

- Backend API URL
- Application configuration

> **Security:** Actual `.env` and `.env.local` files are excluded from version control. Never commit API keys, database credentials, JWT secrets, or other private credentials.

---

## Learning Objectives

This project was developed to explore the practical implementation of:

- Full-stack web development
- Next.js application architecture
- REST API development
- AI/LLM integration
- Authentication and authorization
- MongoDB data modeling
- Redis integration
- Kafka-based event processing
- File upload workflows
- Scalable backend architecture
- State management
- API data fetching
- Docker-based infrastructure
