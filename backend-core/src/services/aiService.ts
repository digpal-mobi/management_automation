import axios from 'axios';
import { config } from '../config/index.js';

const client = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 45000,
});

export interface IngestProjectPayload {
  projectId: string;
  projectName: string;
  description: string;
  prdText: string;
  techStack?: string;
  goals?: string;
  constraints?: string;
}

export interface GeneratedTicketItem {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  technicalNotes: string;
  dependencies: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  storyPoints: number;
  labels: string[];
  prChecklist: string[];
}

export interface GenerateTicketsResult {
  success: boolean;
  provider: string;
  ticketsCount: number;
  tickets: GeneratedTicketItem[];
}

export interface TicketChatPayload {
  projectId: string;
  project: {
    name: string;
    description: string;
    techStack?: string | null;
  };
  ticket: {
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: any;
    technicalNotes?: string | null;
    priority: string;
    storyPoints: number;
    labels: any;
  };
  history: Array<{
    senderType: string;
    content: string;
  }>;
  message: string;
}

export interface TicketChatResult {
  success: boolean;
  response: string;
  provider: string;
  citations: Array<{
    section: string;
    snippet: string;
    distance: number;
  }>;
}

export class AiService {
  static async ingestProject(payload: IngestProjectPayload) {
    try {
      const resp = await client.post('/ai/ingest-project', payload);
      return resp.data;
    } catch (error: any) {
      console.error('[AiService.ingestProject] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async generateTickets(payload: IngestProjectPayload): Promise<GenerateTicketsResult> {
    try {
      const resp = await client.post<GenerateTicketsResult>('/ai/generate-tickets', payload);
      return resp.data;
    } catch (error: any) {
      console.error('[AiService.generateTickets] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async chatWithTicket(payload: TicketChatPayload): Promise<TicketChatResult> {
    try {
      const resp = await client.post<TicketChatResult>('/ai/ticket-chat', payload);
      return resp.data;
    } catch (error: any) {
      console.error('[AiService.chatWithTicket] Error:', error.response?.data || error.message);
      throw error;
    }
  }

  static async checkHealth() {
    try {
      const resp = await client.get('/ai/health');
      return resp.data;
    } catch (error: any) {
      return { status: 'unreachable', error: error.message };
    }
  }
}
