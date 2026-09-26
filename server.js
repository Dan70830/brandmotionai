import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CREATIVE_SKILLS, validateProductParams, formatCaptions } from './creativeSkills.js';


const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const LIVEPEER_MCP_URL = 'https://agent.livepeer.org/api/mcp';

// Retry delay sequence (ms): immediate → 3s → 7s → 15s → 30s
const MCP_RETRY_DELAYS = [0, 3000, 7000, 15000, 30000];

/**
 * Job status taxonomy.
 * RUNNING           – job is in-flight on Livepeer
 * COMPLETED         – job returned a usable media URL
 * GENERATION_FAILED – Livepeer explicitly reported a generation/provider failure
 * MCP_UNAVAILABLE   – every MCP attempt failed with transport error (job state unknown)
 * UNKNOWN           – job exists but status could not be determined
 */
const JOB_STATUS = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  MCP_UNAVAILABLE: 'MCP_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
};

// ─── Persistent Job ID Store ──────────────────────────────────────────────────
// Persists submitted Livepeer job IDs to disk so MCP outages never cause
// duplicate submissions.

const JOB_STORE_PATH = './livepeer_jobs.json';

function loadJobStore() {
  if (existsSync(JOB_STORE_PATH)) {
    try { return JSON.parse(readFileSync(JOB_STORE_PATH, 'utf-8')); }
    catch { return {}; }
  }
  return {};
}

function saveJobStore(store) {
  try { writeFileSync(JOB_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8'); }
  catch (err) { console.error('[JobStore] Failed to persist:', err.message); }
}

function persistJob(pipelineJobId, stage, livepeerJobId) {
  const store = loadJobStore();
  if (!store[pipelineJobId]) store[pipelineJobId] = {};
  store[pipelineJobId][stage] = livepeerJobId;
  saveJobStore(store);
  console.log(`[JobStore] Persisted ${stage} -> ${livepeerJobId} for pipeline ${pipelineJobId}`);
}

function getPersistedJob(pipelineJobId, stage) {
  const store = loadJobStore();
  return store[pipelineJobId]?.[stage] ?? null;
}



// ─── MCP Transport Layer ──────────────────────────────────────────────────────
// "mcp-remote: fetch failed" is a TRANSPORT error — it tells us nothing about
// whether the Livepeer job itself succeeded on the server.
// Rule: NEVER resubmit an expensive generation job after a transport error.
//       Retry the MCP request/poll with backoff; never the Livepeer generation.

class McpTransportError extends Error {
  constructor(message, attempts) {
    super(message);
    this.name = 'McpTransportError';
    this.attempts = attempts;
  }
}

async function callLivepeerMCPRaw(toolName, args) {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  };
  const response = await fetch(LIVEPEER_MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`MCP_HTTP_ERROR:${response.status}:${await response.text()}`);
  const data = await response.json();
  if (data.error) throw new Error(`MCP_JSONRPC_ERROR:${JSON.stringify(data.error)}`);
  return data.result;
}

/**
 * Calls an MCP tool with retry/backoff on transport errors only.
 * Livepeer-level errors (HTTP 4xx, JSON-RPC) are NOT retried.
 */
async function callLivepeerMCP(toolName, args, options = {}) {
  const delays = options.delays ?? MCP_RETRY_DELAYS;
  let lastError;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      console.log(`[MCP] Retry ${attempt}/${delays.length - 1} for ${toolName} — waiting ${delays[attempt]}ms`);
      await sleep(delays[attempt]);
    }
    try {
      const result = await callLivepeerMCPRaw(toolName, args);
      if (attempt > 0) console.log(`[MCP] ${toolName} recovered on attempt ${attempt + 1}`);
      return result;
    } catch (err) {
      lastError = err;
      const isTransport = err.message.includes('fetch failed') ||
        err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') || err.message.includes('network');
      if (!isTransport) throw err; // Livepeer-level error — do not retry
      console.warn(`[MCP] Transport error attempt ${attempt + 1}/${delays.length} for ${toolName}: ${err.message}`);
    }
  }
  throw new McpTransportError(
    `Livepeer connection interrupted — recovering existing generation (${toolName} failed after ${delays.length} attempts)`,
    delays.length
  );
}

/** Tests MCP connectivity with a cheap non-generative call */
async function checkMcpConnectivity() {
  try {
    await callLivepeerMCP('me', {}, { delays: [0, 3000, 7000] });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Upload an image to Livepeer CDN and return a real HTTPS URL.
 * LTX i2v (and other video models) require source_url to be a real HTTPS URL —
 * they cannot accept base64 data URLs or localhost URLs.
 * This step converts a File-uploaded base64 data URL into a hosted CDN URL.
 */
async function uploadImageToCDN(imageInput) {
  // Already a real URL — pass through
  if (typeof imageInput === 'string' && imageInput.startsWith('https://')) {
    return imageInput;
  }

  // Strip the data: prefix to get raw base64
  let base64Data = imageInput;
  if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
    base64Data = imageInput.split(',')[1];
  }

  if (!base64Data) {
    throw new Error('Cannot upload image: no valid image data received.');
  }

  console.log('[Image Upload] Uploading product image to Livepeer CDN...');
  const uploadResult = await callLivepeerMCP('upload_image', { data: base64Data });

  // Extract the CDN URL from the result
  const cdnUrl =
    uploadResult?.structuredContent?.url ||
    uploadResult?.url ||
    (() => {
      const text = uploadResult?.content?.[0]?.text || '';
      const match = text.match(/https:\/\/[^\s"]+/);
      return match ? match[0] : null;
    })();

  if (!cdnUrl) {
    throw new Error(`Image upload to CDN failed — no URL returned. Raw: ${JSON.stringify(uploadResult)}`);
  }

  console.log(`[Image Upload] CDN URL obtained: ${cdnUrl}`);
  return cdnUrl;
}

// ─── Job Poller ───────────────────────────────────────────────────────────────

/**
 * Polls a Livepeer job until terminal state, distinguishing transport errors
 * from actual Livepeer generation failures.
 */
async function pollJobStatus(jobId, maxWaitSec = 420) {
  if (typeof jobId === 'string' && (jobId.startsWith('http://') || jobId.startsWith('https://'))) {
    return { status: JOB_STATUS.COMPLETED, url: jobId, raw: 'Pre-existing asset URL' };
  }
  const startTime = Date.now();
  while ((Date.now() - startTime) / 1000 < maxWaitSec) {
    let result;
    try {
      result = await callLivepeerMCP('get_create_media', { job_id: jobId });
    } catch (err) {
      if (err instanceof McpTransportError) {
        console.warn(`[Poll] MCP unavailable for ${jobId} — state unknown`);
        return { status: JOB_STATUS.MCP_UNAVAILABLE, url: null, raw: err.message };
      }
      throw err;
    }
    const text = result?.content?.[0]?.text || '';
    const structured = result?.structuredContent;

    if (structured?.status === 'done' && structured?.url)
      return { status: JOB_STATUS.COMPLETED, url: structured.url, raw: text };

    if (text.includes(': done')) {
      const match = text.match(/URL:\s*(https:\/\/[^\s]+)/);
      if (match?.[1]) return { status: JOB_STATUS.COMPLETED, url: match[1], raw: text };
    }

    // Transport error surfaced inside poll response text — treat as MCP_UNAVAILABLE, NOT generation failure
    if (text.includes('mcp-remote: fetch failed')) {
      console.warn(`[Poll] ${jobId}: mcp-remote transport error in response text — MCP_UNAVAILABLE`);
      return { status: JOB_STATUS.MCP_UNAVAILABLE, url: null, raw: text };
    }

    const livepeerFailureSignals = [
      'Encountered error in step execution', 'generation failed', 'provider error', 'inference failed',
    ];
    if (livepeerFailureSignals.some(s => text.toLowerCase().includes(s.toLowerCase()))) {
      console.warn(`[Poll] ${jobId}: Livepeer generation failure detected`);
      return { status: JOB_STATUS.GENERATION_FAILED, url: null, raw: text };
    }

    console.log(`[Poll] ${jobId}: running — waiting 10s...`);
    await sleep(10000);
  }
  return { status: JOB_STATUS.UNKNOWN, url: null, raw: `Timed out after ${maxWaitSec}s` };
}

async function pollMediaJob(jobId, maxWaitSec = 420) {
  const result = await pollJobStatus(jobId, maxWaitSec);
  if (result.status === JOB_STATUS.COMPLETED) return { url: result.url, raw: result.raw };
  if (result.status === JOB_STATUS.MCP_UNAVAILABLE)
    throw new McpTransportError(`Livepeer connection interrupted — recovering existing generation (job ${jobId})`, 0);
  throw new Error(`Livepeer job ${jobId} did not complete: ${result.status} — ${result.raw}`);
}

// In-memory job state store
const activeJobs = new Map();

/**
 * POST /api/test-creative-skill
 * Local inspection route to test dynamic script and visual prompt generation without calling Livepeer
 */
app.post('/api/test-creative-skill', (req, res) => {
  const { product, ugcStyle } = req.body;
  const validation = validateProductParams(product, ugcStyle);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const skillConfig = CREATIVE_SKILLS[ugcStyle];
  const generatedScript = skillConfig.generateScript(product.name, product.description);
  const generatedVisualPrompt = skillConfig.generateVisualPrompt(product.name, product.description);
  const wordCount = generatedScript.split(/\s+/).filter(Boolean).length;

  const result = {
    skillId: ugcStyle,
    skillName: skillConfig.name,
    productName: product.name,
    productDescription: product.description,
    script: generatedScript,
    scriptWordCount: wordCount,
    visualPrompt: generatedVisualPrompt,
    productImage: product.image,
  };

  console.log('\n=== CREATIVE SKILL TEST INSPECTION ===');
  console.log(`Skill ID: ${result.skillId} (${result.skillName})`);
  console.log(`Product Name: ${result.productName}`);
  console.log(`Product Description: ${result.productDescription}`);
  console.log(`Generated Script (${wordCount} words): "${result.script}"`);
  console.log(`Generated Visual Prompt: "${result.visualPrompt}"`);
  console.log('======================================\n');

  res.json({ success: true, ...result });
});

/**
 * POST /api/generate-ugc
 * Starts the generation pipeline and returns a jobId
 */
app.post('/api/generate-ugc', async (req, res) => {
  try {
    const { product, ugcStyle } = req.body;
    const validation = validateProductParams(product, ugcStyle);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const skillConfig = CREATIVE_SKILLS[ugcStyle];

    // Generate dynamic script & visual prompt based on product & skill
    const generatedScript = skillConfig.generateScript(product.name, product.description);
    const generatedVisualPrompt = skillConfig.generateVisualPrompt(product.name, product.description);

    // Initial state
    const jobState = {
      id: jobId,
      status: 'processing',
      stepIndex: 0, // 0: Understanding, 1: Scripting, 2: Voice, 3: Video, 4: Captions, 5: Done
      productName: product.name,
      productDescription: product.description,
      productImageUrl: product.image,
      ugcStyle,
      skillName: skillConfig.name,
      script: generatedScript,
      visualPrompt: generatedVisualPrompt,
      finalVideoUrl: null,
      error: null,
      startTime: Date.now(),
      stageTimings: {},
      livepeerJobs: {}, // Livepeer job IDs keyed by stage — persisted to disk for recovery
    };

    activeJobs.set(jobId, jobState);

    console.log(`[Job ${jobId}] Created UGC Generation Request:`);
    console.log(`  Skill ID: ${ugcStyle}`);
    console.log(`  Product Name: ${product.name}`);
    console.log(`  Script: "${generatedScript}"`);
    console.log(`  Visual Prompt: "${generatedVisualPrompt}"`);

    // Respond immediately with jobId for frontend polling
    res.json({ success: true, jobId, jobState });

    // Execute the async Livepeer pipeline in background
    runPipeline(jobState).catch((err) => {
      console.error(`Pipeline ${jobId} failed:`, err.message);
      jobState.status = 'failed';
      jobState.error = err instanceof McpTransportError
        ? 'Livepeer connection interrupted — recovering existing generation'
        : (err.message || 'Video generation failed');
    });
  } catch (err) {
    console.error('Error starting UGC generation:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/** GET /api/mcp-status — non-destructive connectivity probe */
app.get('/api/mcp-status', async (req, res) => {
  const result = await checkMcpConnectivity();
  res.json(result);
});

/** GET /api/job-status/:livepeerJobId — single-shot status check with retry */
app.get('/api/job-status/:livepeerJobId', async (req, res) => {
  const { livepeerJobId } = req.params;
  try {
    const result = await callLivepeerMCP('get_create_media', { job_id: livepeerJobId });
    const text = result?.content?.[0]?.text || '';
    let status = JOB_STATUS.UNKNOWN;
    let url = null;
    if (text.includes('mcp-remote: fetch failed')) { status = JOB_STATUS.MCP_UNAVAILABLE; }
    else if (text.includes(': done')) {
      status = JOB_STATUS.COMPLETED;
      const m = text.match(/URL:\s*(https:\/\/[^\s]+)/);
      url = m?.[1] ?? null;
    } else if (text.includes('running')) { status = JOB_STATUS.RUNNING; }
    else if (text.includes('Encountered error') && !text.includes('mcp-remote')) { status = JOB_STATUS.GENERATION_FAILED; }
    res.json({ livepeerJobId, status, url, raw: text });
  } catch (err) {
    res.json({
      livepeerJobId,
      status: err instanceof McpTransportError ? JOB_STATUS.MCP_UNAVAILABLE : JOB_STATUS.UNKNOWN,
      url: null,
      raw: err.message,
    });
  }
});

/**
 * GET /api/generation-status/:jobId
 * Returns the current status & stage of the pipeline
 */
app.get('/api/generation-status/:jobId', (req, res) => {
  const jobState = activeJobs.get(req.params.jobId);
  if (!jobState) return res.status(404).json({ error: 'Job not found' });
  res.json(jobState);
});

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function runPipeline(jobState) {
  const t0 = Date.now();

  // Stage 0: Understanding
  jobState.stepIndex = 0;
  await sleep(1500);
  jobState.stageTimings.understanding = (Date.now() - t0) / 1000;

  // Stage 1: Script (already generated)
  jobState.stepIndex = 1;
  const t1 = Date.now();
  console.log(`[${jobState.id}] Script: "${jobState.script}"`);
  jobState.stageTimings.scripting = (Date.now() - t1) / 1000;

  // ── TTS ──────────────────────────────────────────────────────────────────
  jobState.stepIndex = 2;
  const t2 = Date.now();
  let ttsJobId = getPersistedJob(jobState.id, 'tts');
  if (ttsJobId) {
    console.log(`[${jobState.id}] Resuming TTS from persisted job ${ttsJobId}`);
  } else {
    const conn = await checkMcpConnectivity();
    if (!conn.ok) throw new McpTransportError('Livepeer connection interrupted — recovering existing generation', 0);
    console.log(`[${jobState.id}] Starting chatterbox-tts...`);
    const ttsResult = await callLivepeerMCP('run_capability', {
      capability: 'chatterbox-tts', prompt: jobState.script, timeout: 159, async: true,
    });
    ttsJobId = ttsResult.structuredContent?.job_id || extractJobId(ttsResult?.content?.[0]?.text);
    if (!ttsJobId) throw new Error('Failed to get chatterbox-tts job ID');
    persistJob(jobState.id, 'tts', ttsJobId);
    jobState.livepeerJobs.tts = ttsJobId;
  }
  const audioData = await pollMediaJob(ttsJobId, 180);
  const audioUrl = audioData.url;
  jobState.stageTimings.voice = (Date.now() - t2) / 1000;
  console.log(`[${jobState.id}] TTS done: ${audioUrl}`);

  // ── I2V ──────────────────────────────────────────────────────────────────
  // CRITICAL: Check persisted job ID before EVER submitting a new generation.
  // A transport error while polling does NOT mean the job failed on Livepeer.
  jobState.stepIndex = 3;
  const t3 = Date.now();
  let i2vJobId = getPersistedJob(jobState.id, 'i2v');
  if (i2vJobId) {
    console.log(`[${jobState.id}] Resuming I2V from persisted job ${i2vJobId}`);
  } else {
    // Assert user uploaded image is provided and valid
    if (!jobState.productImageUrl || typeof jobState.productImageUrl !== 'string' || !jobState.productImageUrl.trim()) {
      throw new Error('[Preflight Assertion Failed] No uploaded product image received. Image must be provided.');
    }
    if (jobState.productImageUrl.includes('unsplash.com')) {
      throw new Error('[Preflight Assertion Failed] Seeded/Unsplash image detected. User uploaded product image required.');
    }

    const hostedImageUrl = await uploadImageToCDN(jobState.productImageUrl);
    if (!hostedImageUrl || typeof hostedImageUrl !== 'string' || !hostedImageUrl.startsWith('https://')) {
      throw new Error(`[Preflight Assertion Failed] CDN image URL unresolved: ${hostedImageUrl}`);
    }

    console.log('\n=== LTX PREFLIGHT ASSERTION ===');
    console.log(`Job ID:               ${jobState.id}`);
    console.log(`Product Name:         ${jobState.productName}`);
    console.log(`Uploaded Image Input: ${jobState.productImageUrl.substring(0, 70)}...`);
    console.log(`Hosted LTX source_url: ${hostedImageUrl}`);
    console.log(`Visual Prompt:        ${jobState.visualPrompt}`);
    console.log('===============================\n');

    const conn = await checkMcpConnectivity();
    if (!conn.ok) throw new McpTransportError('Livepeer connection interrupted — recovering existing generation', 0);
    console.log(`[${jobState.id}] Starting ltx-25-i2v-fast...`);
    const i2vResult = await callLivepeerMCP('run_capability', {
      capability: 'ltx-25-i2v-fast', source_url: hostedImageUrl,
      prompt: jobState.visualPrompt, timeout: 300, async: true,
      inputs: { duration: 8, width: 576, height: 1024 },
    });
    i2vJobId = i2vResult.structuredContent?.job_id || extractJobId(i2vResult?.content?.[0]?.text);
    if (!i2vJobId) throw new Error('Failed to get ltx-25-i2v-fast job ID');
    persistJob(jobState.id, 'i2v', i2vJobId);
    jobState.livepeerJobs.i2v = i2vJobId;
  }
  const videoData = await pollMediaJob(i2vJobId, 360);
  const rawVideoUrl = videoData.url;
  jobState.stageTimings.video = (Date.now() - t3) / 1000;
  console.log(`[${jobState.id}] I2V done: ${rawVideoUrl}`);

  // ── FFmpeg Mux ───────────────────────────────────────────────────────────
  jobState.stepIndex = 4;
  const t4 = Date.now();
  let muxJobId = getPersistedJob(jobState.id, 'mux');
  if (muxJobId) {
    console.log(`[${jobState.id}] Resuming mux from persisted job ${muxJobId}`);
  } else {
    console.log(`[${jobState.id}] Starting ffmpeg-mux...`);
    const muxResult = await callLivepeerMCP('run_capability', {
      capability: 'ffmpeg-mux', source_url: rawVideoUrl,
      timeout: 36, async: true, inputs: { audio_url: audioUrl },
    });
    muxJobId = muxResult.structuredContent?.job_id || extractJobId(muxResult?.content?.[0]?.text);
    if (!muxJobId) throw new Error('Failed to get ffmpeg-mux job ID');
    persistJob(jobState.id, 'mux', muxJobId);
    jobState.livepeerJobs.mux = muxJobId;
  }
  const muxData = await pollMediaJob(muxJobId, 120);
  const muxedVideoUrl = muxData.url;
  jobState.stageTimings.muxing = (Date.now() - t4) / 1000;
  console.log(`[${jobState.id}] Mux done: ${muxedVideoUrl}`);

  // ── Captions ─────────────────────────────────────────────────────────────
  const t5 = Date.now();
  let captionJobId = getPersistedJob(jobState.id, 'captions');
  if (captionJobId) {
    console.log(`[${jobState.id}] Resuming captions from persisted job ${captionJobId}`);
  } else {
    const formattedCaptionText = formatCaptions(jobState.script);
    console.log(`[${jobState.id}] Starting hyperframes-caption with formatted multi-line text:\n"${formattedCaptionText}"`);
    const captionResult = await callLivepeerMCP('run_capability', {
      capability: 'hyperframes-caption', source_url: muxedVideoUrl,
      timeout: 48, async: true, inputs: { text: formattedCaptionText },
    });
    captionJobId = captionResult.structuredContent?.job_id || extractJobId(captionResult?.content?.[0]?.text);
    if (!captionJobId) throw new Error('Failed to get hyperframes-caption job ID');
    persistJob(jobState.id, 'captions', captionJobId);
    jobState.livepeerJobs.captions = captionJobId;
  }
  const finalData = await pollMediaJob(captionJobId, 120);
  const finalVideoUrl = finalData.url;
  jobState.stageTimings.captions = (Date.now() - t5) / 1000;
  jobState.stageTimings.total = (Date.now() - t0) / 1000;
  console.log(`[${jobState.id}] Pipeline complete: ${finalVideoUrl}`);
  jobState.finalVideoUrl = finalVideoUrl;
  jobState.stepIndex = 5;
  jobState.status = 'completed';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractJobId(text) {
  if (!text) return null;
  const match = text.match(/mjob_[a-f0-9]+/);
  return match ? match[0] : null;
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`UGC Backend Server listening on http://127.0.0.1:${PORT}`);
});

