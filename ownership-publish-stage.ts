// Stage 1 of the approved two-publish upgrade. After Publish succeeds and the
// production prerequisite key is verified, set false and push DEVELOPMENT again.
// Never use a runtime/environment toggle: Publish introspects the actual DB.
// See docs/ownership-publishing.md before changing this value.
export const DEFER_CUSTOMER_OWNER_FOREIGN_KEY = true;
