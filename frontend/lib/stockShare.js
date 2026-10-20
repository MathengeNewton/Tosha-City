/** OUTGOING = butchery gave meat to the partner; INCOMING = butchery received meat from the partner. */
export const SHARE_DIRECTION = {
  OUTGOING: "OUTGOING",
  INCOMING: "INCOMING",
};

export function shareIsIncoming(share) {
  return share?.direction === SHARE_DIRECTION.INCOMING;
}

export function shareDirectionLabel(share) {
  return shareIsIncoming(share) ? "Received" : "Given out";
}

export function shareDirectionBadgeClass(share) {
  return shareIsIncoming(share) ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800";
}

/** Payment wording depends on who owes whom. */
export function sharePaymentLabel(share) {
  if (shareIsIncoming(share)) return share?.paid ? "We paid" : "We owe partner";
  return share?.paid ? "Partner paid" : "Partner owes us";
}
