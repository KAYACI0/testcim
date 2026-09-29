import { z } from 'zod';

/** Workspace roles, ordered from most to least privileged. */
export const WORKSPACE_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const roleSchema = z.enum(WORKSPACE_ROLES);

export const uuidSchema = z.uuid();
