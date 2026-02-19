// backend/services/rag.js
// RAG (Retrieval Augmented Generation) Pipeline
// Converts queries to embeddings, stores/searches vectors in Supabase pgvector

const OpenAI = require('openai');
const { supabase } = require('../config/database');

function hasRagConfig() {
  return Boolean(
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.includes('your-openai-key-here')
  );
}

function getOpenAIClient() {
  if (!hasRagConfig()) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Search for relevant content using RAG pipeline
 * @param {string} chatbotId - The chatbot to search content for
 * @param {string} query - The user's question
 * @param {number} topK - Number of results to return (default: 3)
 * @returns {Array} - Array of { text, score, url } objects
 */
async function ragSearch(chatbotId, query, topK = 3) {
  try {
    if (!supabase) return [];

    // Step 1: Convert query to embedding vector
    const queryEmbedding = await generateEmbedding(query);

    if (!queryEmbedding) {
      console.warn('Failed to generate query embedding');
      return [];
    }

    // Step 2: Search Supabase pgvector via RPC
    const rpcName = process.env.SUPABASE_VECTOR_RPC || 'match_document_chunks';
    const scoreThreshold = Number(process.env.RAG_SCORE_THRESHOLD || 0.7);

    const { data: rows, error } = await supabase.rpc(rpcName, {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_chatbot_id: chatbotId,
    });

    if (error) {
      console.error('Supabase vector search error:', error.message);
      return [];
    }

    // Step 3: Extract and return relevant text chunks
    if (!rows || rows.length === 0) {
      console.log(`No RAG results found for chatbot ${chatbotId}`);
      return [];
    }

    const relevantResults = rows
      .map((row) => ({
        text: row.content || row.text || '',
        score: row.similarity ?? row.score ?? 0,
        url: row.url || '',
        title: row.title || '',
      }));

    const filtered = relevantResults.filter((item) => item.score >= scoreThreshold);

    console.log(`RAG: Found ${filtered.length} relevant chunks (threshold: ${scoreThreshold})`);
    return filtered;
  } catch (err) {
    console.error('RAG search error:', err.message);
    // Don't throw - RAG is optional, chatbot should still work without it
    return [];
  }
}

/**
 * Generate embedding vector for text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Array<number>} - Embedding vector (1536 dimensions)
 */
async function generateEmbedding(text) {
  try {
    const openai = getOpenAIClient();
    if (!openai) return null;

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // OpenAI limit
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error('Embedding generation error:', err.message);
    return null;
  }
}

/**
 * Store content chunks in Supabase pgvector table
 * @param {string} chatbotId - Chatbot ID
 * @param {Array} chunks - Array of { text, url, title } objects
 * @param {string} trainedContentId - Optional trained_content record ID
 */
async function storeEmbeddings(chatbotId, chunks, trainedContentId = null) {
  try {
    if (!supabase) {
      console.warn('RAG disabled: Supabase is not configured');
      return 0;
    }

    const tableName = process.env.SUPABASE_VECTOR_TABLE || 'document_chunks';
    const contentColumn = process.env.SUPABASE_VECTOR_CONTENT_COLUMN || 'content';
    const embeddingColumn = process.env.SUPABASE_VECTOR_EMBEDDING_COLUMN || 'embedding';

    const rows = await Promise.all(chunks.map(async (chunk) => {
      const embedding = await generateEmbedding(chunk.text);
      if (!embedding) return null;

      return {
        chatbot_id: chatbotId,
        trained_content_id: trainedContentId,
        url: chunk.url || '',
        title: chunk.title || '',
        [contentColumn]: chunk.text,
        [embeddingColumn]: embedding,
      };
    }));

    const validRows = rows.filter(Boolean);
    if (validRows.length === 0) {
      return 0;
    }

    const { error } = await supabase
      .from(tableName)
      .insert(validRows);

    if (error) {
      throw new Error(`Failed to store Supabase vectors: ${error.message}`);
    }

    console.log(`✅ Stored ${validRows.length} chunks in Supabase vectors for chatbot ${chatbotId}`);
    return validRows.length;
  } catch (err) {
    console.error('Store embeddings error:', err.message);
    throw err;
  }
}

/**
 * Delete all vectors for a chatbot (used when retraining)
 * @param {string} chatbotId - Chatbot ID to clear
 */
async function deleteEmbeddings(chatbotId) {
  try {
    if (!supabase) return;

    const tableName = process.env.SUPABASE_VECTOR_TABLE || 'document_chunks';
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('chatbot_id', chatbotId);

    if (error) {
      throw new Error(error.message);
    }

    console.log(`🗑️ Deleted all Supabase vectors for chatbot ${chatbotId}`);
  } catch (err) {
    console.error('Delete embeddings error:', err.message);
  }
}

module.exports = {
  ragSearch,
  generateEmbedding,
  storeEmbeddings,
  deleteEmbeddings,
};
