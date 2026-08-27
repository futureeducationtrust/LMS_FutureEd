/**
 * Global login gate.
 *
 * While enabled, nobody (Admin, Sub-Admin or Employee) can sign in — clicking
 * "Sign in" shows the pending-dues notice instead, and the login proxy route
 * rejects the request so the UI cannot be bypassed.
 *
 * Flip PAYMENT_DUE_BLOCK to `false` to restore normal login for everyone.
 */
export const PAYMENT_DUE_BLOCK = true;

export const PAYMENT_DUE_TITLE = "Payment Pending";

export const PAYMENT_DUE_MESSAGE =
  "Please clear your pending dues to continue. Access to the Lead Management System has been temporarily suspended until the outstanding payment is settled.";

export const PAYMENT_DUE_NOTE =
  "Already paid? Please contact your administrator to restore access.";
