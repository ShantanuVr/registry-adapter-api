import prisma from '../../lib/database.js';
import { AuditEventSchema } from '../../lib/schemas.js';
import { AuthContext } from '../auth/index.js';
import logger from '../../lib/logger.js';

export interface AuditEventData {
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: Record<string, any>;
  afterJson?: Record<string, any>;
  ip?: string;
}

export const createAuditEvent = async (
  authContext: AuthContext,
  eventData: AuditEventData
): Promise<void> => {
  try {
    await prisma.auditEvent.create({
      data: {
        actorSub: authContext.claims.sub,
        actorOrgId: authContext.claims.orgId,
        actorRole: authContext.claims.role,
        action: eventData.action,
        entityType: eventData.entityType,
        entityId: eventData.entityId,
        beforeJson: eventData.beforeJson,
        afterJson: eventData.afterJson,
        ip: eventData.ip,
      },
    });

    logger.info({
      traceId: authContext.traceId,
      action: eventData.action,
      entityType: eventData.entityType,
      entityId: eventData.entityId,
    }, 'Audit event created');
  } catch (error) {
    logger.error({ error, eventData }, 'Failed to create audit event');
    // Don't throw error to avoid breaking main flow
  }
};

export const getAuditEvents = async (
  entityType?: string,
  entityId?: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    const where: any = {};
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (entityId) {
      where.entityId = entityId;
    }

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events;
  } catch (error) {
    logger.error({ error, entityType, entityId }, 'Failed to get audit events');
    throw error;
  }
};

export const getAuditEventsByOrg = async (
  orgId: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    const events = await prisma.auditEvent.findMany({
      where: { actorOrgId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events;
  } catch (error) {
    logger.error({ error, orgId }, 'Failed to get audit events by org');
    throw error;
  }
};

export const getAuditEventsByActor = async (
  actorSub: string,
  limit: number = 100
): Promise<any[]> => {
  try {
    const events = await prisma.auditEvent.findMany({
      where: { actorSub },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return events;
  } catch (error) {
    logger.error({ error, actorSub }, 'Failed to get audit events by actor');
    throw error;
  }
};

// Audit event types
export const AUDIT_ACTIONS = {
  MINT_REQUEST: 'MINT_REQUEST',
  MINT_SUCCESS: 'MINT_SUCCESS',
  MINT_FAILED: 'MINT_FAILED',
  RETIRE_REQUEST: 'RETIRE_REQUEST',
  RETIRE_SUCCESS: 'RETIRE_SUCCESS',
  RETIRE_FAILED: 'RETIRE_FAILED',
  ANCHOR_REQUEST: 'ANCHOR_REQUEST',
  ANCHOR_SUCCESS: 'ANCHOR_SUCCESS',
  ANCHOR_FAILED: 'ANCHOR_FAILED',
  TRANSFER_REQUEST: 'TRANSFER_REQUEST',
  TRANSFER_SUCCESS: 'TRANSFER_SUCCESS',
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  CLASS_CREATED: 'CLASS_CREATED',
  CLASS_RESOLVED: 'CLASS_RESOLVED',
  RECEIPT_CREATED: 'RECEIPT_CREATED',
  RECEIPT_UPDATED: 'RECEIPT_UPDATED',
} as const;

export const AUDIT_ENTITY_TYPES = {
  CLASS: 'CLASS',
  PROJECT: 'PROJECT',
  RECEIPT: 'RECEIPT',
  ISSUANCE: 'ISSUANCE',
  RETIREMENT: 'RETIREMENT',
  ANCHOR: 'ANCHOR',
  TRANSFER: 'TRANSFER',
} as const;
