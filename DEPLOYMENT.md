# GenAssessment Deployment Guide

GenAssessment is a full-stack project consisting of:
1. **Frontend**: A React Single Page App built with Vite in `/client`
2. **Backend**: An Express API in `/server`
3. **Database**: A PostgreSQL database

This guide explains how to deploy the application for free using **Vercel** (frontend), **Render** (backend), and **Neon** (database).

---

## Part 1: Provision a PostgreSQL Database (Neon)
1. Go to [Neon.tech](https://neon.tech) and create a free account.
2. Create a new database project named `gen-assessment`.
3. Copy the connection string. It will look like:
   `postgresql://username:password@ep-some-cluster.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Part 2: Deploy the Backend API (Render)
1. Create a free account at [Render.com](https://render.com).
2. Click **New +** in the dashboard and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name**: `gen-assessment-api`
   - **Runtime**: `Node`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run migrate && npm start`
5. Go to **Environment** settings and add these variables:
   - `DATABASE_URL`: `(Your Neon connection string copied above)`
   - `JWT_SECRET`: `(Any secure random string, e.g. "my-super-secret-key-123")`
   - `GEMINI_API_KEY`: `(Your Gemini API key)`
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `(Enter your Vercel URL here after you complete Part 3, e.g., https://genassessment.vercel.app)`
6. Deploy the Web Service. Once completed, copy the public URL Render assigns to it (e.g., `https://gen-assessment-api.onrender.com`).

---

## Part 3: Deploy the Frontend App (Vercel)
1. Go to [Vercel.com](https://vercel.com) and create an account.
2. Click **Add New** -> **Project**.
3. Select your repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - Keep the default build configuration (`npm run build` and `dist` output directory).
5. Expand the **Environment Variables** section and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-render-api-url.onrender.com/api` (Replace with your actual Render API URL, making sure to append `/api` at the end).
6. Click **Deploy**. Once the build finishes, copy the URL Vercel gives you.

---

## Part 4: Connect CORS and Cookies
1. Open your Render web service dashboard.
2. Go to **Environment** settings.
3. Update the `CLIENT_URL` variable to your new Vercel deployment URL (e.g., `https://genassessment.vercel.app`).
4. Save the environment changes. Render will automatically redeploy your API.
5. Once redeployed, your frontend will be authorized to make requests, read, and write cookies.
