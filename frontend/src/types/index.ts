export type ProjectMemberRole = 'owner' | 'manager' | 'developer' | 'editor';

export type TicketStatus = 'To Do' | 'In Progress' | 'Done';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Priority = TicketPriority;

export type TicketType = 'Feature' | 'Bug' | 'Task' | 'Improvement';

export type DocumentProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type FeatureReviewStatus = 'PROPOSED' | 'ACCEPTED' | 'DEFERRED';

export interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';

export type NotificationType =
  | 'PROJECT_INVITATION'
  | 'PROJECT_INVITATION_ACCEPTED'
  | 'PROJECT_INVITATION_DECLINED'
  | 'SYSTEM';

export interface ProjectInvitation {
  id: string;
  projectId: string;
  project?: { id: string; name: string; slug: string };
  invitedUserId?: string | null;
  recipientEmail: string;
  invitee?: User | null;
  inviterId: string;
  inviter?: Pick<User, 'id' | 'username' | 'avatarUrl'> | null;
  role: ProjectMemberRole;
  status: InvitationStatus;
  actionable: boolean;
  expiresAt: string;
  respondedAt?: string | null;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string | null;
  project?: { id: string; name: string; slug: string } | null;
  invitationId?: string | null;
  invitation?: ProjectInvitation | null;
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  href?: string | null;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  role: ProjectMemberRole;
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  goals?: string | null;
  targetUsers?: string | null;
  techStack?: string | null;
  businessRequirements?: string | null;
  technicalConstraints?: string | null;
  knownDependencies?: string | null;
  targetReleaseDate?: string | null;
  additionalNotes?: string | null;
  ownerId: string;
  owner?: User;
  userRole?: ProjectMemberRole;
  createdAt: string;
  updatedAt: string;
  members?: ProjectMember[];
  ticketCount?: number;
  memberCount?: number;
  documentCount?: number;
  featureCount?: number;
  boardId?: string | null;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  projectId: string;
  chunkText: string;
  location?: string | null;
  sourceHeading?: string | null;
  order: number;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  filename: string;
  fileSize: number;
  fileFormat: string;
  mimeType: string;
  status: DocumentProcessingStatus;
  errorMessage?: string | null;
  extractedText?: string | null;
  metadata?: {
    pageCount?: number;
    sheetNames?: string[];
    wordCount?: number;
    characterCount?: number;
    headings?: string[];
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  chunks?: DocumentChunk[];
}

export interface SourceReference {
  docTitle: string;
  location?: string;
  excerpt?: string;
}

export interface ProjectFeature {
  id: string;
  projectId: string;
  name: string;
  description: string;
  module: string;
  businessValue?: string | null;
  relatedRequirements?: string[] | null;
  dependencies?: string[] | null;
  suggestedPriority: TicketPriority;
  constraints?: string | null;
  sourceReferences?: SourceReference[] | null;
  sprint?: string | null;
  targetDate?: string | null;
  sourceCandidateIds?: string[] | null;
  proposedAcceptanceCriteria?: string[] | null;
  status: FeatureReviewStatus;
  isAiGenerated: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  tickets?: Ticket[];
}

export interface RequirementItem {
  id?: string;
  title: string;
  description: string;
  module?: string;
  priority?: string;
  source?: string;
}

export interface ProjectAnalysis {
  id: string;
  projectId: string;
  overview?: string | null;
  functionalRequirements?: RequirementItem[] | null;
  nonFunctionalRequirements?: Array<{ category: string; description: string; source?: string }> | null;
  businessRules?: Array<{ rule: string; details?: string; source?: string }> | null;
  technicalRequirements?: Array<{ area: string; details: string; source?: string }> | null;
  milestones?: Array<{ name: string; targetDate?: string; sequenceOrder?: number; isConfirmed?: boolean; details?: string }> | null;
  openQuestions?: Array<{ question: string; category?: string; impact?: string; resolution?: string }> | null;
  brief?: any;
  coverageReport?: any;
  sprintSchedule?: any;
  candidateReconciliations?: any;
  status: string;
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  description?: string | null;
  position: number;
  category: TicketStatus;
  isDefault: boolean;
  color?: string | null;
  wipLimit?: number | null;
  isCollapsed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tickets?: Ticket[];
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  columns?: BoardColumn[];
}

export type Column = BoardColumn;

export type AiProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface Comment {
  id: string;
  ticketId: string;
  userId?: string | null;
  user?: User | null;
  content: string;
  isAi?: boolean;
  authorName?: string | null;
  parentCommentId?: string | null;
  aiProcessingStatus?: AiProcessingStatus | null;
  aiMetadata?: {
    model?: string;
    provider?: string;
    citations?: Array<{ section?: string; snippet?: string; distance?: number }>;
    responseTimeMs?: number;
    error?: string;
    retryable?: boolean;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  boardId: string;
  columnId?: string | null;
  column?: BoardColumn | null;
  projectId: string;
  featureId?: string | null;
  feature?: ProjectFeature | null;
  sourceCandidateId?: string | null;
  sprint?: string | null;
  module?: string | null;
  ownershipRole?: string | null;
  title: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  acceptanceCriteria?: Array<{ id: string; text: string; completed: boolean }> | null;
  technicalNotes?: string | null;
  prChecklist?: Array<{ id: string; text: string; completed: boolean }> | null;
  definitionOfDone?: Array<{ id: string; text: string; completed: boolean }> | null;
  storyPoints?: number | null;
  executionOrder?: number;
  isLocked?: boolean;
  assigneeId?: string | null;
  assignee?: User | null;
  reporterId?: string | null;
  reporter?: User | null;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
  _count?: {
    comments: number;
  };
}

export interface AllocatedSprintTicket {
  ticketId: string;
  sourceCandidateId?: string | null;
  title: string;
  module?: string | null;
  priority: string;
  storyPoints: number;
  ownershipRole: string;
  executionOrder: number;
  isLocked: boolean;
  status: string;
  prerequisitesInSprint: string[];
  prerequisitesPriorSprints: string[];
  explanation: string;
}

export interface PlanningSprintAllocation {
  sprintId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  goal: string;
  capacityPoints: number;
  allocatedPoints: number;
  utilizationPercentage: number;
  tickets: AllocatedSprintTicket[];
  roleBreakdown: Record<string, number>;
  deliverablesSummary: string;
  warnings: string[];
}

export interface UnscheduledTicketItem {
  ticketId: string;
  sourceCandidateId?: string | null;
  title: string;
  module?: string | null;
  priority: string;
  storyPoints: number;
  ownershipRole: string;
  reasonCode:
    | 'UNSCHEDULED_CAPACITY_EXCEEDED'
    | 'UNSCHEDULED_DEPENDENCY_UNRESOLVED'
    | 'UNSCHEDULED_MISSING_ESTIMATE'
    | 'UNSCHEDULED_DEFERRED_BY_PM'
    | 'UNSCHEDULED_BLOCKED'
    | 'UNSCHEDULED_DEADLINE_BREACH';
  reasonDescription: string;
  actionRequired: string;
  blockingPrerequisites: string[];
}

export interface PlanningValidationReport {
  isValid: boolean;
  totalTicketsAnalyzed: number;
  totalScheduled: number;
  totalUnscheduled: number;
  totalSprintsUsed: number;
  capacityUtilizationAverage: number;
  criticalPathLength: number;
  criticalPathTicketIds: string[];
  dependencyViolationCount: number;
  capacityViolationCount: number;
  cycleCount: number;
  detectedCycles: string[][];
  warnings: string[];
  ruleEvaluations: Array<{
    rule: string;
    passed: boolean;
    details: string;
  }>;
}

export interface SprintPlan {
  id: string;
  projectId: string;
  version: number;
  status: 'PROPOSED' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED';
  title: string;
  summary: string;
  sourceBriefRevision?: string;
  sprintAllocations: PlanningSprintAllocation[];
  dependencies?: Array<{
    sourceTicketId: string;
    sourceKey: string;
    targetTicketId: string;
    targetKey: string;
    type: string;
    isInferred: boolean;
    reason?: string;
  }>;
  unscheduledTickets?: UnscheduledTicketItem[];
  criticalPath?: {
    ticketIds: string[];
    totalPoints: number;
    estimatedSprints: number;
  };
  capacitySettings?: {
    defaultSprintCapacity: number;
    sprintCount: number;
    roleCapacities?: Record<string, number>;
  };
  validationReport?: PlanningValidationReport;
  changeSummary?: {
    ticketsMoved: number;
    pointsShifted: number;
    addedToSprints: number;
    removedToUnscheduled: number;
    details: string[];
  };
  planningAssumptions?: string[];
  isApproved: boolean;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDependency {
  id: string;
  projectId: string;
  sourceTicketId: string;
  sourceTicket?: { id: string; title: string; sourceCandidateId?: string | null; sprint?: string | null; status?: string };
  targetTicketId: string;
  targetTicket?: { id: string; title: string; sourceCandidateId?: string | null; sprint?: string | null; status?: string };
  type: string;
  isInferred: boolean;
  reason?: string | null;
  confidence?: number | null;
  createdAt: string;
}

export interface Message {
  id: string;
  ticketId: string;
  senderId?: string;
  senderName?: string;
  senderType?: 'user' | 'ai';
  content: string;
  createdAt: string;
}

export interface ProjectAnalytics {
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  todoTickets: number;
  completionRate: number;
  priorityBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: RolePermission[];
  userRoles?: UserRole[];
  userCount?: number;
  _count?: {
    permissions?: number;
    userRoles?: number;
  };
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  role?: Role;
  permissionId: string;
  permission: Permission;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  user?: User;
  roleId: string;
  role?: Role;
  projectId?: string | null;
  project?: Project | null;
  createdAt: string;
}

export interface UserEffectivePermissions {
  userId: string;
  isSystemAdmin: boolean;
  systemRoles: string[];
  projectRoles: string[];
  permissions: string[];
}

