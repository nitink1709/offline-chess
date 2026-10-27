// Runs Maia 3 inference off the main thread.
let session = null, ORT = null;
async function loadModel(parts, ortBase) {
  importScripts(ortBase + 'ort.wasm.min.js');
  ORT = self.ort;
  ORT.env.wasm.wasmPaths = ortBase;
  ORT.env.wasm.numThreads = 1;
  ORT.env.wasm.proxy = false;
  const chunks = []; let total = 0; const SIZE = 45683686;
  for (const p of parts) {
    const r = await fetch(p); if (!r.ok) throw new Error('model part missing: ' + p);
    const reader = r.body.getReader();
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); total += value.length; postMessage({ type: 'progress', value: total / SIZE }); }
  }
  const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
  session = await ORT.InferenceSession.create(buf.buffer, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
}
self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'init') { await loadModel(m.parts, m.ortBase); postMessage({ type: 'ready' }); }
    else if (m.type === 'run') {
      const out = await session.run({
        tokens: new ORT.Tensor('float32', m.tokens, [1, 64, 12]),
        elo_self: new ORT.Tensor('float32', Float32Array.of(m.eloSelf), [1]),
        elo_oppo: new ORT.Tensor('float32', Float32Array.of(m.eloOppo), [1]),
      });
      postMessage({ type: 'result', id: m.id, logitsMove: new Float32Array(out.logits_move.data), logitsValue: new Float32Array(out.logits_value.data) });
    }
  } catch (err) { postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) }); }
};
