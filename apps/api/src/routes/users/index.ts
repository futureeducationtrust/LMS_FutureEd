import type { FastifyInstance } from 'fastify'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { canCreateUser, canUpdateUser } from '@lms/auth'
import { Role } from '@lms/types'
import {
  getUserStats,
  createUser,
  adminResetPassword,
  getDeactivationPreview,
  executeDeactivation,
} from './service'

export async function userRoutes(fastify: FastifyInstance): Promise<void> {

  // ─────────────────────────────────────────
  // GET /users
  // List all users with inline stats
  // ─────────────────────────────────────────
  fastify.get('/', {
    preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
  }, async (request, reply) => {
    const query = request.query as {
      role?: string
      branchId?: string
      isActive?: string
      search?: string
      page?: string
    }

    const page = Math.max(1, parseInt(query.page ?? '1', 10))
    const pageSize = 20

    const where: Record<string, unknown> = {}

    if (query.role) where['role'] = query.role
    if (query.branchId) where['branchId'] = query.branchId
    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive === 'true'
    }
    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ]
    }

    const [users, total] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          branch: { select: { id: true, name: true, city: true } },
          // Inline stats via _count
          _count: {
            select: {
              assignedLeads: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      fastify.prisma.user.count({ where }),
    ])

    // Attach confirmed count per user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const confirmedCount = await fastify.prisma.lead.count({
          where: { assignedToId: user.id, status: 'CONFIRMED' },
        })
        return {
          ...user,
          stats: {
            assignedLeads: user._count.assignedLeads,
            confirmedLeads: confirmedCount,
          },
          _count: undefined,
        }
      })
    )

    return reply.status(200).send({
      success: true,
      data: { users: usersWithStats, total, page, pageSize },
    })
  })

  // ─────────────────────────────────────────
  // POST /users — Create user
  // ─────────────────────────────────────────
  fastify.post('/', {
    preHandler: authenticate,
  }, async (request, reply) => {
    const { id: userId, role } = request.user

    if (!canCreateUser({ id: userId, role: role as Role, branchId: request.user.branchId })) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Sub Admin and Admin can create users' },
      })
    }

    const body = request.body as {
      name: string
      email: string
      phone?: string
      role: string
      branchId: string
      sendSetupLink?: boolean
    }

    if (!body.name || !body.email || !body.role || !body.branchId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Name, email, role, and branch are required' },
      })
    }

    // Sub admin cannot create admin users
    if (role === Role.SUB_ADMIN && body.role === Role.ADMIN) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Sub Admin cannot create Admin users' },
      })
    }

    const result = await createUser({
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      role: body.role,
      branchId: body.branchId,
      sendSetupLink: body.sendSetupLink ?? true,
      createdById: userId,
      prisma: fastify.prisma,
      fastify,
    })

    if ('error' in result) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'A user with this email already exists' },
      })
    }

    return reply.status(201).send({
      success: true,
      data: { userId: result.userId },
    })
  })

  // ─────────────────────────────────────────
  // GET /users/:id — User detail + full stats
  // ─────────────────────────────────────────
  fastify.get('/:id', {
    preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const user = await fastify.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true, city: true } },
      },
    })

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    const stats = await getUserStats(id, fastify.prisma)

    return reply.status(200).send({
      success: true,
      data: { ...user, stats },
    })
  })

  // ─────────────────────────────────────────
  // PATCH /users/:id — Update user details
  // ─────────────────────────────────────────
  fastify.patch('/:id', {
    preHandler: authenticate,
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { id: userId, role } = request.user

    if (!canUpdateUser({ id: userId, role: role as Role, branchId: request.user.branchId })) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      })
    }

    const body = request.body as {
      name?: string
      phone?: string
      branchId?: string
      role?: string
    }

    // Sub admin cannot promote to admin
    if (role === Role.SUB_ADMIN && body.role === Role.ADMIN) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Sub Admin cannot assign Admin role' },
      })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.phone !== undefined) data.phone = body.phone
    if (body.branchId !== undefined) data.branchId = body.branchId
    if (body.role !== undefined) data.role = body.role

    const updated = await fastify.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true,
        phone: true, role: true, isActive: true,
      },
    })

    return reply.status(200).send({ success: true, data: updated })
  })

  // ─────────────────────────────────────────
  // POST /users/:id/reset-password
  // Admin sets a new password + emails employee
  // ─────────────────────────────────────────
  fastify.post('/:id/reset-password', {
    preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { newPassword } = request.body as { newPassword?: string }

    if (!newPassword || newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Password must be at least 8 characters',
        },
      })
    }

    const target = await fastify.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    })

    if (!target) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    await adminResetPassword({
      targetUserId: id,
      newPassword,
      prisma: fastify.prisma,
      redis: fastify.redis,
      fastify,
    })

    return reply.status(200).send({
      success: true,
      data: { message: 'Password updated. Employee has been notified via email.' },
    })
  })

  // ─────────────────────────────────────────
  // GET /users/:id/deactivate-preview
  // Show admin how many leads will be unassigned
  // BEFORE they confirm deactivation
  // ─────────────────────────────────────────
  fastify.get('/:id/deactivate-preview', {
    preHandler: [authenticate, authorize([Role.ADMIN])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const preview = await getDeactivationPreview({
      targetUserId: id,
      prisma: fastify.prisma,
    })

    return reply.status(200).send({ success: true, data: preview })
  })

  // ─────────────────────────────────────────
  // POST /users/:id/deactivate
  // Execute deactivation after admin confirms
  // ─────────────────────────────────────────
  fastify.post('/:id/deactivate', {
    preHandler: [authenticate, authorize([Role.ADMIN])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { id: executedById } = request.user

    // Cannot deactivate yourself
    if (id === executedById) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'You cannot deactivate your own account' },
      })
    }

    const target = await fastify.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, role: true },
    })

    if (!target) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    if (!target.isActive) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'User is already deactivated' },
      })
    }

    await executeDeactivation({
      targetUserId: id,
      executedById,
      prisma: fastify.prisma,
      redis: fastify.redis,
      fastify,
    })

    return reply.status(200).send({
      success: true,
      data: { message: 'User deactivated. Sessions invalidated. Leads unassigned.' },
    })
  })

  // ─────────────────────────────────────────
  // POST /users/:id/activate — Reactivate user
  // ─────────────────────────────────────────
  fastify.post('/:id/activate', {
    preHandler: [authenticate, authorize([Role.ADMIN])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await fastify.prisma.user.update({
      where: { id },
      data: { isActive: true },
    })

    return reply.status(200).send({
      success: true,
      data: { message: 'User account reactivated' },
    })
  })
}