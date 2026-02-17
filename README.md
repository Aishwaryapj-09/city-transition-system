# City Transition System

A full-stack DevSecOps-based web application that helps users find accommodation and plan relocation efficiently.

---

## 🚀 Project Overview

City Transition System is a secure rental and relocation assistance platform that provides:

- User Authentication & Role-Based Access
- Accommodation Finder
- Verified Rental Listings
- Nearby Essentials Finder
- Cost of Living Calculator
- Budget Planner

This project follows a complete DevSecOps lifecycle including CI, security scanning, Docker containerization, and Continuous Deployment using Jenkins.

---

## 🛠 Tech Stack

### Frontend
- React
- Axios
- React Router

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)

### Security
- JWT Authentication
- bcrypt Password Hashing
- Helmet
- express-rate-limit
- Environment Variables (.env)

### DevOps
- Git & GitHub
- Jenkins (CI + Continuous Deployment)
- Docker
- docker-compose
- npm audit (Security Scanning)
- Jest & Supertest (Testing)

---

## 🌳 Branch Strategy

We follow a professional Git workflow:

- main → Production branch (Auto deployed via Jenkins)
- dev → Development integration branch
- feature/* → Temporary feature branches

Flow:
feature → dev → main → Jenkins deploy

---

## 📁 Project Structure

