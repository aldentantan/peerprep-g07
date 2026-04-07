import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3005;
const PISTON_URL = process.env.PISTON_URL || 'http://piston:2000';

// Map collaboration room language keys to Piston language identifiers and versions.
const LANGUAGE_CONFIG = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python:     { language: 'python',     version: '3.10.0' },
  java:       { language: 'java',       version: '15.0.2' },
  cpp:        { language: 'c++',        version: '10.2.0' },
  go:         { language: 'go',         version: '1.16.2' },
  ruby:       { language: 'ruby',       version: '3.0.1' },
  csharp:     { language: 'csharp',     version: '6.12.0' },
};

const MAX_OUTPUT_BYTES = 1024 * 1024; // Around 1 MB
const EXECUTION_TIMEOUT_MS = 10000;   // 10000 milliseconds is 10 seconds

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'code-execution-service' });
});

app.post('/execute', async (req, res) => {
  const { language, code, stdin } = req.body;

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'language is required' });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  const config = LANGUAGE_CONFIG[language.toLowerCase()];
  if (!config) {
    return res.status(400).json({
      error: `Unsupported language: ${language}`,
      supported: Object.keys(LANGUAGE_CONFIG),
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const pistonResponse = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [{ content: code }],
        stdin: stdin || '',
        run_timeout: 3000,
        compile_timeout: 10000,
        run_memory_limit: -1,
      }),
    });

    clearTimeout(timeout);

    if (!pistonResponse.ok) {
      const text = await pistonResponse.text();
      console.error(`Piston error (${pistonResponse.status}):`, text);
      return res.status(502).json({ error: 'Code execution engine error', detail: text });
    }

    const result = await pistonResponse.json();

    // Piston returns { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
    const run = result.run || {};
    const compile = result.compile || {};

    const stdout = (run.stdout || '').slice(0, MAX_OUTPUT_BYTES);
    const stderr = (run.stderr || compile.stderr || '').slice(0, MAX_OUTPUT_BYTES);
    const exitCode = run.code ?? -1;

    return res.json({ stdout, stderr, exitCode });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Execution timed out' });
    }
    console.error('Execution failed:', err);
    return res.status(500).json({ error: 'Internal execution error' });
  }
});

app.listen(PORT, () => {
  console.log(`Code execution service running on port ${PORT}`);
});
