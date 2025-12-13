// Mock API - intercepts axios calls and returns mock data
import {
  mockUsers,
  mockSimulations,
  mockAttempts,
  MockSimulation,
  MockStep,
  MockAttempt,
  generateId,
} from "./mock-data";

// In-memory storage (persists during session)
let simulations = [...mockSimulations];
let attempts = [...mockAttempts];
let currentUser: typeof mockUsers[0] | null = null;

// Storage keys
const STORAGE_KEY = "mock_current_user";
const SIMULATIONS_KEY = "mock_simulations";
const ATTEMPTS_KEY = "mock_attempts";

// Initialize from localStorage
if (typeof window !== "undefined") {
  try {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }
    const storedSims = localStorage.getItem(SIMULATIONS_KEY);
    if (storedSims) {
      simulations = JSON.parse(storedSims);
    }
    const storedAttempts = localStorage.getItem(ATTEMPTS_KEY);
    if (storedAttempts) {
      attempts = JSON.parse(storedAttempts);
    }
  } catch {
    // Ignore errors
  }
}

function saveToStorage() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(simulations));
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }
}

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to remove password from user object
function omitPassword(user: typeof mockUsers[0]) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// Mock API handlers
export const mockApi = {
  // AUTH
  async signup(name: string, email: string, password: string) {
    await delay(500);

    // Check if email already exists
    const existingUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existingUser) {
      throw { response: { data: { message: "Email already registered" } } };
    }

    // Create new user
    const newUser = {
      id: generateId("user"),
      email,
      password,
      name,
      role: "APPLICANT" as const,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    saveToStorage();

    return { message: "Account created successfully" };
  },

  async login(role: string, email: string, password: string) {
    await delay(500);
    const user = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password &&
        u.role.toLowerCase() === role.toLowerCase()
    );

    if (!user) {
      throw { response: { data: { message: "Invalid credentials" } } };
    }

    currentUser = user;
    saveToStorage();

    return { user: omitPassword(user) };
  },

  async getMe() {
    await delay(200);
    if (!currentUser) {
      throw { response: { status: 401, data: { message: "Not authenticated" } } };
    }
    return omitPassword(currentUser);
  },

  async logout() {
    await delay(200);
    currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    return { message: "Logged out successfully" };
  },

  // SIMULATIONS
  async getMySimulations() {
    await delay(300);
    if (!currentUser || currentUser.role !== "AUTHOR") {
      throw { response: { status: 403, data: { message: "Forbidden" } } };
    }
    return simulations
      .filter((s) => s.authorId === currentUser!.id)
      .map((s) => ({
        ...s,
        _count: { steps: s.steps.length },
      }));
  },

  async getPublishedSimulations() {
    await delay(300);
    return simulations
      .filter((s) => s.status === "PUBLISHED")
      .map((s) => ({
        ...s,
        _count: { steps: s.steps.length },
      }));
  },

  async getSimulation(id: string) {
    await delay(200);
    const sim = simulations.find((s) => s.id === id);
    if (!sim) {
      throw { response: { status: 404, data: { message: "Simulation not found" } } };
    }
    return sim;
  },

  async createSimulation(data: { title: string; description: string; timeLimitMinutes: number }) {
    await delay(400);
    if (!currentUser || currentUser.role !== "AUTHOR") {
      throw { response: { status: 403, data: { message: "Forbidden" } } };
    }
    const newSim: MockSimulation = {
      id: generateId("sim"),
      title: data.title,
      description: data.description,
      status: "DRAFT",
      timeLimitMinutes: data.timeLimitMinutes,
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
    };
    simulations.push(newSim);
    saveToStorage();
    return newSim;
  },

  async updateSimulation(id: string, data: Partial<MockSimulation>) {
    await delay(300);
    const index = simulations.findIndex((s) => s.id === id);
    if (index === -1) {
      throw { response: { status: 404, data: { message: "Simulation not found" } } };
    }
    simulations[index] = {
      ...simulations[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage();
    return simulations[index];
  },

  async getSimulationSteps(simulationId: string) {
    await delay(200);
    const sim = simulations.find((s) => s.id === simulationId);
    if (!sim) {
      throw { response: { status: 404, data: { message: "Simulation not found" } } };
    }
    return sim.steps;
  },

  async addStep(simulationId: string, data: { type: string; prompt: string; order: number; options?: string[] }) {
    await delay(300);
    const sim = simulations.find((s) => s.id === simulationId);
    if (!sim) {
      throw { response: { status: 404, data: { message: "Simulation not found" } } };
    }
    const newStep: MockStep = {
      id: generateId("step"),
      simulationId,
      order: data.order,
      type: data.type as MockStep["type"],
      prompt: data.prompt,
      options: data.options,
      createdAt: new Date().toISOString(),
    };
    sim.steps.push(newStep);
    saveToStorage();
    return newStep;
  },

  async deleteStep(simulationId: string, stepId: string) {
    await delay(200);
    const sim = simulations.find((s) => s.id === simulationId);
    if (!sim) {
      throw { response: { status: 404, data: { message: "Simulation not found" } } };
    }
    sim.steps = sim.steps.filter((s) => s.id !== stepId);
    saveToStorage();
    return { message: "Step deleted" };
  },

  // ATTEMPTS
  async getCurrentAttempt(simulationId: string) {
    await delay(200);
    if (!currentUser) {
      throw { response: { status: 401, data: { message: "Not authenticated" } } };
    }
    const attempt = attempts.find(
      (a) => a.simulationId === simulationId && a.applicantId === currentUser!.id && a.status === "IN_PROGRESS"
    );
    if (!attempt) {
      throw { response: { status: 404, data: { message: "No active attempt" } } };
    }
    return attempt;
  },

  async startAttempt(simulationId: string) {
    await delay(400);
    if (!currentUser) {
      throw { response: { status: 401, data: { message: "Not authenticated" } } };
    }

    // Check for existing in-progress attempt
    const existing = attempts.find(
      (a) => a.simulationId === simulationId && a.applicantId === currentUser!.id && a.status === "IN_PROGRESS"
    );
    if (existing) {
      throw { response: { status: 400, data: { message: "You already have an active attempt" } } };
    }

    const newAttempt: MockAttempt = {
      id: generateId("attempt"),
      simulationId,
      applicantId: currentUser.id,
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
      responses: [],
    };
    attempts.push(newAttempt);
    saveToStorage();
    return newAttempt;
  },

  async saveResponse(attemptId: string, stepId: string, answer: string) {
    await delay(200);
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw { response: { status: 404, data: { message: "Attempt not found" } } };
    }

    const existingIndex = attempt.responses.findIndex((r) => r.stepId === stepId);
    if (existingIndex >= 0) {
      attempt.responses[existingIndex].answer = answer;
      attempt.responses[existingIndex].updatedAt = new Date().toISOString();
    } else {
      attempt.responses.push({
        id: generateId("resp"),
        attemptId,
        stepId,
        answer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveToStorage();
    return attempt.responses.find((r) => r.stepId === stepId);
  },

  async submitAttempt(attemptId: string) {
    await delay(400);
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw { response: { status: 404, data: { message: "Attempt not found" } } };
    }
    attempt.status = "SUBMITTED";
    attempt.submittedAt = new Date().toISOString();
    saveToStorage();
    return attempt;
  },

  // SCORING
  async getPendingAttempts() {
    await delay(300);
    return attempts
      .filter((a) => a.status === "SUBMITTED")
      .map((a) => {
        const sim = simulations.find((s) => s.id === a.simulationId);
        const applicant = mockUsers.find((u) => u.id === a.applicantId);
        return {
          id: a.id,
          status: a.status,
          submittedAt: a.submittedAt,
          simulation: sim ? { id: sim.id, title: sim.title } : null,
          applicant: applicant
            ? { id: applicant.id, name: applicant.name, email: applicant.email }
            : null,
        };
      });
  },

  async getAttemptForScoring(attemptId: string) {
    await delay(300);
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw { response: { status: 404, data: { message: "Attempt not found" } } };
    }
    const sim = simulations.find((s) => s.id === attempt.simulationId);
    const applicant = mockUsers.find((u) => u.id === attempt.applicantId);

    return {
      ...attempt,
      simulation: sim || null,
      applicant: applicant
        ? { id: applicant.id, name: applicant.name, email: applicant.email }
        : null,
    };
  },

  async submitScore(attemptId: string, score: number, feedback?: string) {
    await delay(400);
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      throw { response: { status: 404, data: { message: "Attempt not found" } } };
    }
    attempt.status = "SCORED";
    attempt.score = score;
    attempt.feedback = feedback;
    attempt.scoredAt = new Date().toISOString();
    attempt.scoredBy = currentUser?.id;
    saveToStorage();
    return attempt;
  },

  async getMyScores() {
    await delay(300);
    if (!currentUser) {
      throw { response: { status: 401, data: { message: "Not authenticated" } } };
    }
    return attempts
      .filter((a) => a.status === "SCORED" && a.scoredBy === currentUser!.id)
      .map((a) => {
        const sim = simulations.find((s) => s.id === a.simulationId);
        const applicant = mockUsers.find((u) => u.id === a.applicantId);
        return {
          id: a.id,
          status: a.status,
          submittedAt: a.submittedAt,
          scoredAt: a.scoredAt,
          score: a.score,
          feedback: a.feedback,
          simulation: sim ? { id: sim.id, title: sim.title } : null,
          applicant: applicant
            ? { id: applicant.id, name: applicant.name, email: applicant.email }
            : null,
        };
      });
  },
};

