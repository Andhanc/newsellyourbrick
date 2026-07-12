import { getPrisma } from './prismaClient.js'

const reportSelect = (row) => row ? ({
  id: row.id,
  conversationId: row.conversation_id,
  category: row.category,
  question: row.question,
  status: row.status,
  shortAnswer: row.short_answer || '',
  report: row.report_json || null,
  hasPdf: Boolean(row.pdf_data),
  model: row.model,
  error: row.error || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
}) : null

export async function ensurePropertyAiConversation({ userId, propertyId, propertyTable = 'properties' }) {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw`
    INSERT INTO property_ai_conversations (user_id, property_id, property_table)
    VALUES (${userId}, ${propertyId}, ${propertyTable})
    ON CONFLICT (user_id, property_id, property_table)
    DO UPDATE SET updated_at = NOW()
    RETURNING *
  `
  return rows[0]
}

export async function createPropertyAiReport({ conversationId, category, question, model }) {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw`
    INSERT INTO property_ai_reports (conversation_id, category, question, model)
    VALUES (${conversationId}, ${category}, ${question}, ${model})
    RETURNING *
  `
  return reportSelect(rows[0])
}

export async function appendPropertyAiMessage({ conversationId, reportId = null, role, content }) {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw`
    INSERT INTO property_ai_messages (conversation_id, report_id, role, content)
    VALUES (${conversationId}, ${reportId}, ${role}, ${content})
    RETURNING *
  `
  return rows[0]
}

export async function updatePropertyAiReport(reportId, patch = {}) {
  const prisma = getPrisma()
  const status = patch.status ?? null
  const shortAnswer = patch.shortAnswer ?? null
  const reportJson = patch.report ? JSON.stringify(patch.report) : null
  const pdfData = patch.pdfData ?? null
  const error = patch.error ?? null
  const rows = await prisma.$queryRaw`
    UPDATE property_ai_reports
    SET status = COALESCE(${status}, status),
        short_answer = COALESCE(${shortAnswer}, short_answer),
        report_json = COALESCE(${reportJson}::jsonb, report_json),
        pdf_data = COALESCE(${pdfData}, pdf_data),
        error = ${error},
        completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = ${reportId}
    RETURNING *
  `
  return reportSelect(rows[0])
}

export async function findReusablePropertyAiReport({ conversationId, category, question, model }) {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw`
    SELECT * FROM property_ai_reports
    WHERE conversation_id = ${conversationId}
      AND category = ${category}
      AND question = ${question}
      AND model = ${model}
      AND status IN ('queued', 'analyzing', 'rendering', 'completed')
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 1
  `
  return reportSelect(rows[0])
}

export async function getOwnedPropertyAiReport({ reportId, userId, includePdf = false }) {
  const prisma = getPrisma()
  const rows = includePdf
    ? await prisma.$queryRaw`
        SELECT r.*, c.user_id, c.property_id, c.property_table
        FROM property_ai_reports r
        JOIN property_ai_conversations c ON c.id = r.conversation_id
        WHERE r.id = ${reportId} AND c.user_id = ${userId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT r.id, r.conversation_id, r.category, r.question, r.status,
               r.short_answer, r.report_json, (r.pdf_data IS NOT NULL) AS has_pdf,
               r.model, r.error, r.created_at, r.updated_at, r.completed_at,
               c.user_id, c.property_id, c.property_table
        FROM property_ai_reports r
        JOIN property_ai_conversations c ON c.id = r.conversation_id
        WHERE r.id = ${reportId} AND c.user_id = ${userId}
        LIMIT 1
      `
  const row = rows[0]
  if (!row) return null
  return { ...reportSelect({ ...row, pdf_data: includePdf ? row.pdf_data : row.has_pdf }), pdfData: includePdf ? row.pdf_data : undefined, propertyId: row.property_id, propertyTable: row.property_table }
}

export async function listPropertyAiHistory({ userId, propertyId, propertyTable = null }) {
  const prisma = getPrisma()
  const rows = propertyTable
    ? await prisma.$queryRaw`
        SELECT r.* FROM property_ai_reports r
        JOIN property_ai_conversations c ON c.id = r.conversation_id
        WHERE c.user_id = ${userId} AND c.property_id = ${propertyId} AND c.property_table = ${propertyTable}
        ORDER BY r.created_at DESC LIMIT 50
      `
    : await prisma.$queryRaw`
        SELECT r.* FROM property_ai_reports r
        JOIN property_ai_conversations c ON c.id = r.conversation_id
        WHERE c.user_id = ${userId} AND c.property_id = ${propertyId}
        ORDER BY r.created_at DESC LIMIT 50
      `
  return rows.map(reportSelect)
}

export async function userExistsForPropertyAi(userId) {
  const prisma = getPrisma()
  const rows = await prisma.$queryRaw`SELECT id FROM users WHERE id = ${userId} LIMIT 1`
  return Boolean(rows[0])
}
