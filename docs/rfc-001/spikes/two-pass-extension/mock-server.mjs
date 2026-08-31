// Minimal OpenAI-compatible mock. Logs each request; SSE-streams a fixed reply.
import http from 'node:http';
import fs from 'node:fs';
const LOG = process.env.MOCK_LOG || '/tmp/mock-requests.jsonl';
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (process.env.MOCK_HANG && body.includes('CLASSIFY_PASS')) {
        return;
      } // hang classify: no response at all
      if (process.env.MOCK_STALL && body.includes('CLASSIFY_PASS')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.write('{"choices":[');
        return;
      } // headers sent, body stalls

      let parsed = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = {};
      }
      const sys = JSON.stringify(
        parsed.messages?.filter((m) =>
          ['system', 'developer'].includes(m.role),
        ) ?? [],
      );
      const isClassify = sys.includes('CLASSIFY_PASS');
      if (
        process.env.MOCK_FAIL_MAIN_ONCE &&
        !isClassify &&
        !global.__failedOnce
      ) {
        global.__failedOnce = true;
        fs.appendFileSync(
          LOG,
          JSON.stringify({
            t: Date.now(),
            classify: false,
            hasPacing: sys.includes('PACING_STATE'),
            failed500: true,
          }) + '\n',
        );
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end('{"error":{"message":"transient"}}');
        return;
      }
      fs.appendFileSync(
        LOG,
        JSON.stringify({
          t: Date.now(),
          url: req.url,
          stream: !!parsed.stream,
          classify: isClassify,
          hasPacing: sys.includes('PACING_STATE'),
          nmsg: parsed.messages?.length,
        }) + '\n',
      );
      const text = isClassify
        ? process.env.MOCK_BAD
          ? 'not json at all {{{'
          : '{"attempt_event":true,"mode":"LADDER"}'
        : 'MAIN_RESPONSE ok';
      if (parsed.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const mk = (delta, fin) =>
          `data: ${JSON.stringify({ id: 'x', object: 'chat.completion.chunk', created: 0, model: parsed.model, choices: [{ index: 0, delta, finish_reason: fin }] })}\n\n`;
        res.write(mk({ role: 'assistant', content: text }, null));
        res.write(mk({}, 'stop'));
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'x',
            object: 'chat.completion',
            created: 0,
            model: parsed.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: text },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      }
    });
  })
  .listen(8399, '127.0.0.1', () => console.log('mock up on 8399'));
