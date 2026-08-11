const urls = process.argv.slice(2);

if (urls.length === 0) {
  console.error('Usage: node scripts/wait-for-url.mjs <url> [url ...]');
  process.exit(2);
}

const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 180_000);
const intervalMs = Number(process.env.WAIT_INTERVAL_MS ?? 2_000);
const deadline = Date.now() + timeoutMs;

for (const url of urls) {
  let lastError = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok) {
        console.log(`Ready: ${url} (${response.status})`);
        lastError = '';
        break;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (lastError) {
    console.error(`Timed out waiting for ${url}: ${lastError}`);
    process.exit(1);
  }
}
