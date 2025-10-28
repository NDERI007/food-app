import axios from 'axios';
import { z } from 'zod';

// Define environment variable schema
const envSchema = z.object({
  VITE_API_URL: z.string().default(''),
});

// Validate and get environment variables
const env = envSchema.parse({
  VITE_API_URL: 'http://localhost:8787',
});

const API_URL = env.VITE_API_URL;

// Create an axios instance with base configuration
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Optional: Helper function if you prefer
export const apiUrl = (path: string) => `${API_URL}${path}`;
