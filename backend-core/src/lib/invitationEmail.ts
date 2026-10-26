export interface InvitationEmailInput {
  invitationId: string;
  recipientEmail: string;
  projectName: string;
  inviterUsername: string;
  roleLabel: string;
}

export interface InvitationEmailResult {
  delivered: boolean;
  error?: string;
}

/**
 * The application does not ship an email provider. Delivery is attempted
 * separately from the invitation transaction so a provider failure cannot
 * roll back membership state or the in-app notification.
 */
export async function deliverInvitationEmail(
  input: InvitationEmailInput
): Promise<InvitationEmailResult> {
  try {
    if (process.env.INVITATION_EMAIL_FORCE_FAIL === '1') {
      throw new Error('SMTP unavailable');
    }

    return {
      delivered: false,
      error: 'Email delivery is not configured',
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Email delivery failed';
    console.warn('[invitation-email] delivery failed', {
      invitationId: input.invitationId,
      reason,
    });
    return { delivered: false, error: reason };
  }
}
