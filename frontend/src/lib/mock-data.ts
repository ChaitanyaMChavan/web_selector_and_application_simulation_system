// Mock data store - simulates a database
import { UserRole } from "./auth";

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface MockSimulation {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  timeLimitMinutes: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  steps: MockStep[];
}

export interface MockStep {
  id: string;
  simulationId: string;
  order: number;
  type: "MCQ" | "WRITTEN" | "VIDEO" | "CODING";
  prompt: string;
  options?: string[];
  createdAt: string;
}

export interface MockAttempt {
  id: string;
  simulationId: string;
  applicantId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "SCORED";
  startedAt: string;
  submittedAt?: string;
  score?: number;
  feedback?: string;
  scoredAt?: string;
  scoredBy?: string;
  responses: MockResponse[];
}

export interface MockResponse {
  id: string;
  attemptId: string;
  stepId: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

// Test users
export const mockUsers: MockUser[] = [
  {
    id: "user-admin-1",
    email: "admin@test.com",
    password: "admin123",
    name: "Admin User",
    role: "ADMIN",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "user-author-1",
    email: "author@test.com",
    password: "author123",
    name: "Author User",
    role: "AUTHOR",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "user-selector-1",
    email: "selector@test.com",
    password: "selector123",
    name: "Selector User",
    role: "SELECTOR",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "user-applicant-1",
    email: "applicant@test.com",
    password: "applicant123",
    name: "Applicant User",
    role: "APPLICANT",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

// Sample simulations
export const mockSimulations: MockSimulation[] = [
  {
    id: "sim-1",
    title: "Frontend Developer Assessment",
    description: "A comprehensive assessment to evaluate frontend development skills including React, CSS, and JavaScript fundamentals.",
    status: "PUBLISHED",
    timeLimitMinutes: 45,
    authorId: "user-author-1",
    createdAt: "2024-01-15T10:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
    steps: [
      {
        id: "step-1-1",
        simulationId: "sim-1",
        order: 1,
        type: "MCQ",
        prompt: "What is the virtual DOM in React?",
        options: [
          "A lightweight copy of the real DOM",
          "A database for storing components",
          "A CSS framework",
          "A testing library",
        ],
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      {
        id: "step-1-2",
        simulationId: "sim-1",
        order: 2,
        type: "WRITTEN",
        prompt: "Explain the difference between props and state in React. Provide examples of when to use each.",
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      {
        id: "step-1-3",
        simulationId: "sim-1",
        order: 3,
        type: "CODING",
        prompt: "Write a React component that displays a counter with increment and decrement buttons.",
        createdAt: "2024-01-15T10:00:00.000Z",
      },
    ],
  },
  {
    id: "sim-2",
    title: "Problem Solving Challenge",
    description: "Test your analytical and problem-solving abilities with this timed assessment.",
    status: "PUBLISHED",
    timeLimitMinutes: 30,
    authorId: "user-author-1",
    createdAt: "2024-01-20T10:00:00.000Z",
    updatedAt: "2024-01-20T10:00:00.000Z",
    steps: [
      {
        id: "step-2-1",
        simulationId: "sim-2",
        order: 1,
        type: "MCQ",
        prompt: "If a train travels 120 km in 2 hours, what is its average speed?",
        options: ["40 km/h", "60 km/h", "80 km/h", "100 km/h"],
        createdAt: "2024-01-20T10:00:00.000Z",
      },
      {
        id: "step-2-2",
        simulationId: "sim-2",
        order: 2,
        type: "WRITTEN",
        prompt: "Describe a challenging problem you faced and how you solved it.",
        createdAt: "2024-01-20T10:00:00.000Z",
      },
    ],
  },
  {
    id: "sim-3",
    title: "Communication Skills (Draft)",
    description: "Evaluate verbal and written communication abilities.",
    status: "DRAFT",
    timeLimitMinutes: 20,
    authorId: "user-author-1",
    createdAt: "2024-01-25T10:00:00.000Z",
    updatedAt: "2024-01-25T10:00:00.000Z",
    steps: [],
  },
];

// Sample attempts (submitted, waiting for scoring)
export const mockAttempts: MockAttempt[] = [
  {
    id: "attempt-1",
    simulationId: "sim-1",
    applicantId: "user-applicant-1",
    status: "SUBMITTED",
    startedAt: "2024-02-01T09:00:00.000Z",
    submittedAt: "2024-02-01T09:40:00.000Z",
    responses: [
      {
        id: "resp-1-1",
        attemptId: "attempt-1",
        stepId: "step-1-1",
        answer: "A lightweight copy of the real DOM",
        createdAt: "2024-02-01T09:05:00.000Z",
        updatedAt: "2024-02-01T09:05:00.000Z",
      },
      {
        id: "resp-1-2",
        attemptId: "attempt-1",
        stepId: "step-1-2",
        answer: "Props are read-only data passed from parent to child components. They allow components to be reusable with different data. State is mutable data managed within a component that can change over time, typically in response to user actions or API calls.",
        createdAt: "2024-02-01T09:15:00.000Z",
        updatedAt: "2024-02-01T09:15:00.000Z",
      },
      {
        id: "resp-1-3",
        attemptId: "attempt-1",
        stepId: "step-1-3",
        answer: "function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div>\n      <button onClick={() => setCount(c => c - 1)}>-</button>\n      <span>{count}</span>\n      <button onClick={() => setCount(c => c + 1)}>+</button>\n    </div>\n  );\n}",
        createdAt: "2024-02-01T09:35:00.000Z",
        updatedAt: "2024-02-01T09:35:00.000Z",
      },
    ],
  },
];

// Helper to generate IDs
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

