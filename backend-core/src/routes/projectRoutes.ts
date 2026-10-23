import { Router } from 'express';
import multer from 'multer';
import { ProjectController } from '../controllers/projectController.js';
import { BoardColumnController } from '../controllers/boardColumnController.js';
import { MemberController } from '../controllers/memberController.js';
import { DocumentController } from '../controllers/documentController.js';
import { FeatureController } from '../controllers/featureController.js';
import { AnalysisController } from '../controllers/analysisController.js';
import { ProjectTicketController } from '../controllers/projectTicketController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// --- Core Project Routes ---
router.post('/', ProjectController.createProject);
router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProjectById);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.get('/:id/analytics', ProjectController.getProjectAnalytics);

// --- Board & Dynamic Columns Routes ---
router.get('/:id/board', BoardColumnController.getProjectBoard);
router.post('/:id/board/columns', BoardColumnController.createColumn);
router.put('/:id/board/columns/reorder', BoardColumnController.reorderColumns);
router.patch('/:id/board/columns/:columnId', BoardColumnController.updateColumn);
router.delete('/:id/board/columns/:columnId', BoardColumnController.deleteColumn);

// --- Member Routes ---
router.get('/:id/members', MemberController.getMembers);
router.post('/:id/members', MemberController.inviteMember);
router.put('/:id/members/:userId', MemberController.updateMemberRole);
router.delete('/:id/members/:userId', MemberController.removeMember);

// --- Document Routes ---
router.get('/:id/documents', DocumentController.getDocuments);
router.post('/:id/documents', upload.any(), DocumentController.uploadDocuments);
router.get('/:id/documents/:docId', DocumentController.getDocumentById);
router.delete('/:id/documents/:docId', DocumentController.deleteDocument);
router.post('/:id/documents/:docId/retry', DocumentController.retryDocument);

// --- Feature Routes ---
router.get('/:id/features', FeatureController.getFeatures);
router.post('/:id/features', FeatureController.createFeature);
router.get('/:id/features/:featureId', FeatureController.getFeatureById);
router.patch('/:id/features/:featureId', FeatureController.updateFeature);
router.delete('/:id/features/:featureId', FeatureController.deleteFeature);
router.post('/:id/features/:featureId/generate-tickets', FeatureController.generateTickets);

// --- Analysis Routes ---
router.get('/:id/analysis', AnalysisController.getAnalysis);
router.put('/:id/analysis', AnalysisController.updateAnalysis);
router.post('/:id/analysis/run', AnalysisController.runAnalysis);

// --- Ticket Routes (Scoped under Project) ---
router.get('/:id/tickets', ProjectTicketController.getTickets);
router.post('/:id/tickets', ProjectTicketController.createTicket);
router.get('/:id/tickets/search', ProjectTicketController.searchTickets);
router.get('/:id/tickets/:ticketId', ProjectTicketController.getTicketById);
router.patch('/:id/tickets/:ticketId', ProjectTicketController.updateTicket);
router.delete('/:id/tickets/:ticketId', ProjectTicketController.deleteTicket);

// --- Ticket Comments & AI Assistant ---
router.get('/:id/tickets/:ticketId/comments', ProjectTicketController.getComments);
router.post('/:id/tickets/:ticketId/comments', ProjectTicketController.createComment);
router.patch('/:id/tickets/:ticketId/comments/:commentId', ProjectTicketController.updateComment);
router.delete('/:id/tickets/:ticketId/comments/:commentId', ProjectTicketController.deleteComment);
router.post('/:id/tickets/:ticketId/comments/:commentId/retry', ProjectTicketController.retryComment);

export default router;
