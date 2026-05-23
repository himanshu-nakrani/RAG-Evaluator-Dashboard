import { db, documentsTable, questionSetsTable, questionsTable, presetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const presets = [
  {
    slug: "tech-api-reference",
    name: "Payments API Reference",
    description: "Evaluate how well each RAG system answers technical questions about a fictional payments API.",
    category: "technical",
    docContent: `The Payments API exposes three endpoints. POST /v1/charges creates a charge; required fields are amount (integer, minor units), currency (ISO 4217), and source (a tokenized payment method). Returns 201 with the created charge object. GET /v1/charges/{id} returns the charge or 404. POST /v1/refunds requires charge_id and optional amount (defaults to full charge). Idempotency-Key header is supported on all POST endpoints and recommended for retries. Rate limit: 100 req/sec per API key.`,
    questions: [
      { text: "What HTTP status does a successful charge return?", groundTruth: "201" },
      { text: "Which header should I send to safely retry a POST?", groundTruth: "Idempotency-Key" },
      { text: "What does a refund without an amount field do?", groundTruth: "Defaults to the full charge amount" },
      { text: "What is the rate limit?", groundTruth: "100 requests per second per API key" },
    ],
  },
  {
    slug: "legal-tos-excerpt",
    name: "Service Terms of Use",
    description: "Test RAG comprehension on a dense legal document excerpt.",
    category: "legal",
    docContent: `By accessing the Service, you agree to be bound by these Terms. Acme may modify the Terms at any time by posting the revised version; continued use after such posting constitutes acceptance. The Service is provided "as is" without warranty of any kind. Acme's liability for any claim arising from your use shall not exceed the fees you paid to Acme in the twelve (12) months preceding the claim. You may terminate at any time by closing your account; Acme may terminate immediately for breach. Disputes shall be resolved in the courts of Delaware, applying Delaware law.`,
    questions: [
      { text: "How does Acme notify users of Terms changes?", groundTruth: "By posting the revised version" },
      { text: "What is the liability cap?", groundTruth: "Fees paid in the twelve months preceding the claim" },
      { text: "Which state's law governs disputes?", groundTruth: "Delaware" },
      { text: "Can Acme terminate without notice?", groundTruth: "Yes, immediately for breach" },
    ],
  },
  {
    slug: "support-password-reset",
    name: "Password Reset Guide",
    description: "A customer support knowledge base article about resetting passwords.",
    category: "support",
    docContent: `To reset your password, visit acme.com/forgot, enter the email associated with your account, and click "Send reset link." You'll receive an email within 5 minutes; check spam if not. The link expires after 1 hour. If you no longer have access to your email, contact support@acme.com with proof of identity (a billing receipt or government ID). Two-factor authentication is required for password resets on Pro accounts; have your authenticator app ready.`,
    questions: [
      { text: "How long is the reset link valid?", groundTruth: "1 hour" },
      { text: "What if I can't access my email?", groundTruth: "Contact support with proof of identity like a billing receipt or government ID" },
      { text: "Do Pro accounts need 2FA for a reset?", groundTruth: "Yes" },
      { text: "Where do I start the reset?", groundTruth: "acme.com/forgot" },
    ],
  },
  {
    slug: "fantasy-eldoria-wiki",
    name: "Kingdom of Eldoria",
    description: "A fantasy worldbuilding wiki excerpt — great for testing creative comprehension.",
    category: "fantasy",
    docContent: `The kingdom of Eldoria was founded in 412 AS by Queen Maraith after the Sundering of the Old Realm. Its capital, Vael'thar, lies at the confluence of the Silver and Ember rivers and is protected by the Warded Walls — enchantments laid by the archmage Thalindor. Eldoria's official religion venerates the Twin Moons, Aelis (silver) and Korr (red); priests of Aelis serve as healers, while priests of Korr lead the war-rites. The current monarch is King Veylan III, who ascended in 718 AS after his elder sister abdicated to join the Order of the Pale Star.`,
    questions: [
      { text: "Who founded Eldoria?", groundTruth: "Queen Maraith" },
      { text: "What rivers meet at the capital?", groundTruth: "The Silver and Ember rivers" },
      { text: "Which moon's priests heal?", groundTruth: "Aelis (the silver moon)" },
      { text: "Why did Veylan III's sister give up the throne?", groundTruth: "To join the Order of the Pale Star" },
      { text: "Who laid the Warded Walls?", groundTruth: "The archmage Thalindor" },
    ],
  },
];

async function seed() {
  for (const p of presets) {
    try {
      const existing = await db.select().from(presetsTable).where(eq(presetsTable.slug, p.slug));
      if (existing.length > 0) {
        console.log(`Preset "${p.slug}" already exists — skipping`);
        continue;
      }

      const [doc] = await db
        .insert(documentsTable)
        .values({ name: p.name, content: p.docContent, sizeBytes: Buffer.byteLength(p.docContent) })
        .returning();

      const [qs] = await db
        .insert(questionSetsTable)
        .values({ name: p.name, description: p.description })
        .returning();

      for (const q of p.questions) {
        await db
          .insert(questionsTable)
          .values({ questionSetId: qs.id, text: q.text, groundTruth: q.groundTruth });
      }

      await db.insert(presetsTable).values({
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        documentId: doc.id,
        questionSetId: qs.id,
        defaultChunkSize: 512,
        defaultChunkOverlap: 50,
        defaultEmbeddingModel: "text-embedding-3-small",
        defaultRetrieverType: "hybrid",
        defaultTopK: 5,
      });

      console.log(`Seeded preset: ${p.slug}`);
    } catch (err) {
      console.error(`Failed to seed preset "${p.slug}":`, err);
    }
  }
  process.exit(0);
}

seed();
