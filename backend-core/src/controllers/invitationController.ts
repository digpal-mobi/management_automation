import { Request, Response } from 'express';
import { authenticateRequest } from '../lib/auth.js';
import { handleControllerError } from '../lib/apiError.js';
import { InvitationService } from '../services/invitationService.js';

export class InvitationController {
  static async listPending(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const invitations = await InvitationService.listPendingForUser(user.id, user.email);
      return res.status(200).json({ success: true, invitations });
    } catch (error) {
      return handleControllerError(res, error, '[InvitationController.listPending]');
    }
  }

  static async listForProject(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const invitations = await InvitationService.listProjectInvitations(req.params.id, user.id);
      return res.status(200).json({ success: true, invitations });
    } catch (error) {
      return handleControllerError(res, error, '[InvitationController.listForProject]');
    }
  }

  static async accept(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const result = await InvitationService.acceptInvitation(req.params.id, user);
      return res.status(200).json({
        success: true,
        message: result.alreadyAccepted
          ? 'Invitation already accepted.'
          : 'Invitation accepted. You now have access to the project.',
        ...result,
      });
    } catch (error) {
      return handleControllerError(res, error, '[InvitationController.accept]');
    }
  }

  static async decline(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const result = await InvitationService.declineInvitation(req.params.id, user);
      return res.status(200).json({
        success: true,
        message: 'Invitation declined.',
        ...result,
      });
    } catch (error) {
      return handleControllerError(res, error, '[InvitationController.decline]');
    }
  }

  static async revoke(req: Request, res: Response) {
    try {
      const user = await authenticateRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const invitation = await InvitationService.revokeInvitation(
        req.params.id,
        req.params.invitationId,
        user.id
      );
      return res.status(200).json({
        success: true,
        message: 'Invitation revoked.',
        invitation,
      });
    } catch (error) {
      return handleControllerError(res, error, '[InvitationController.revoke]');
    }
  }
}
