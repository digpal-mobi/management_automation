import { prisma } from './prisma';
import crypto from 'crypto';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

export function generateDeterministicEmbedding(text: string, dim: number = 1536): number[] {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);
  const vec = new Float32Array(dim);

  if (tokens.length === 0) {
    vec[0] = 1.0;
    return Array.from(vec);
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const h1 = parseInt(crypto.createHash('sha256').update(t).digest('hex').slice(0, 8), 16);
    const idx1 = h1 % dim;
    const sign1 = (h1 >> 8) & 1 ? 1.0 : -1.0;
    vec[idx1] += sign1 * 1.5;

    if (i < tokens.length - 1) {
      const bigram = `${t}_${tokens[i + 1]}`;
      const h2 = parseInt(crypto.createHash('sha256').update(bigram).digest('hex').slice(0, 8), 16);
      const idx2 = h2 % dim;
      const sign2 = (h2 >> 8) & 1 ? 1.0 : -1.0;
      vec[idx2] += sign2 * 2.0;
    }
  }

  // Normalize L2
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  } else {
    vec[0] = 1.0;
  }

  return Array.from(vec);
}

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/ai/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch {
    // Service may be offline or unreachable, use fallback
  }

  return generateDeterministicEmbedding(text, 1536);
}

export async function syncTicketEmbedding(ticketId: string, description: string | null) {
  if (!description || description.trim().length < 10) {
    // Only generate embeddings when a ticket has a meaningful description
    return;
  }

  try {
    const emb = await getEmbedding(description);
    const vectorString = `[${emb.join(',')}]`;

    // Upsert into ticket_embeddings
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO ticket_embeddings (id, ticket_id, embedding, created_at)
      VALUES (gen_random_uuid(), $1, $2::vector, NOW())
      ON CONFLICT (ticket_id)
      DO UPDATE SET embedding = $2::vector;
      `,
      ticketId,
      vectorString
    );
  } catch (err) {
    console.warn('[syncTicketEmbedding] Warning:', err);
  }
}

export async function searchProjectTicketsSemantic(projectId: string, query: string, limit: number = 10) {
  const emb = await getEmbedding(query);
  const vectorString = `[${emb.join(',')}]`;

  // Search using pgvector cosine distance `<=>`
  try {
    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        t.id, t.title, t.description, t.status, t.priority, t.type,
        t.assignee_id, t.reporter_id, t.created_at, t.updated_at,
        (te.embedding <=> $1::vector) AS distance
      FROM tickets t
      JOIN ticket_embeddings te ON te.ticket_id = t.id
      WHERE t.project_id = $2
      ORDER BY te.embedding <=> $1::vector ASC
      LIMIT $3;
      `,
      vectorString,
      projectId,
      limit
    );
    return results;
  } catch (err) {
    console.warn('[searchProjectTicketsSemantic] pgvector query failed, falling back to ILIKE:', err);
    // Fallback to text matching
    return prisma.ticket.findMany({
      where: {
        projectId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });
  }
}
