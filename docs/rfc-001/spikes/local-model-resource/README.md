# Spike: local model resource envelope

**Run date:** 2026-07-23

**Question:** Can the RFC-001 development path install pinned vLLM-Metal,
pull a pinned MLX artifact from Hugging Face, and serve an OpenAI-compatible
endpoint on the actual 16 GB M1 development Mac? If the canary works, does the
4.28 GB 7B instruct candidate fit and respond at a useful development speed?

This is a resource and integration spike. It does not establish teaching
quality, diagnosis accuracy, production parity, or cohort capacity.

## Environment

| Item                  | Observed                                        |
| --------------------- | ----------------------------------------------- |
| Machine               | MacBookPro17,1, Apple M1, 8 cores               |
| Unified memory        | 16 GB (17,179,869,184 bytes)                    |
| OS                    | macOS 14.6.1 (23G93)                            |
| Toolchain             | arm64 Python 3.12.13, uv 0.11.7, Apple clang 16 |
| Disk before install   | 15-16 GiB available on the data volume          |
| Memory before install | `memory_pressure -Q`: 53% free                  |

The disk and memory figures are system-wide snapshots from a working laptop,
not controlled benchmark conditions.

## Pins

| Artifact                          | Immutable pin                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| vLLM-Metal source                 | `55a97b9a7b3dd84c69e91fb1872abcb769336070`                                                       |
| vLLM-Metal source archive SHA-256 | `cc5875cbe2c4fa4771ca4cce365a1d24394609b2036385d48a20b7056492b443`                               |
| Pinned installer SHA-256          | `6bf4136a7e7b9496ffe0a11d0c66bab9ae44611a5e1b9dd20912fee8efdc8d01`                               |
| Installed vLLM                    | `0.22.0+cpu`                                                                                     |
| Installed vLLM-Metal              | `0.2.0`                                                                                          |
| Installed MLX                     | `0.31.2`                                                                                         |
| Canary                            | `mlx-community/DeepSeek-R1-Distill-Qwen-1.5B-4bit` at `933185be1b8f81d9a21dcfa15ff73470d3545240` |
| 7B candidate                      | `mlx-community/Qwen2.5-Coder-7B-Instruct-4bit` at `019cc73c45c770444708a6dd8690c66243cc5c80`     |

Hugging Face reported 1.00 GB for the canary weights and 4,284,346,255
bytes of storage for the 7B artifact at the pinned revisions.

The source-archive checksum was recorded immediately after download. The
archive itself was not retained; rerun the pinned fetch and `shasum` command
above to verify it independently.

## Reproduction

The run used an isolated source directory, virtual environment, uv cache, and
Hugging Face cache under `/private/tmp/roads-rfc001-local-model-spike`. The
installer still compiled a 312 KiB native Metal extension under the default
`~/.cache/vllm-metal` path during first paged-attention warm-up.

Fetch and verify the pinned vLLM-Metal source, then run its installer from the
extracted directory:

```bash
export SPIKE_DIR=/private/tmp/roads-rfc001-local-model-spike
export VLLM_METAL_PIN=55a97b9a7b3dd84c69e91fb1872abcb769336070
export UV_CACHE_DIR="$SPIKE_DIR/uv-cache"
mkdir -p "$SPIKE_DIR"

curl -L \
  "https://github.com/vllm-project/vllm-metal/archive/$VLLM_METAL_PIN.tar.gz" \
  -o "$SPIKE_DIR/vllm-metal.tar.gz"
shasum -a 256 "$SPIKE_DIR/vllm-metal.tar.gz"
tar -xzf "$SPIKE_DIR/vllm-metal.tar.gz" -C "$SPIKE_DIR"
(
  cd "$SPIKE_DIR/vllm-metal-$VLLM_METAL_PIN"
  ./install.sh
)
```

The install ran from `09:47:07` to `10:08:19` local time: 21m12s total.
The log separately reports 9m31s to prepare the source-built vLLM package and
3m08s to prepare the plugin/dependency set. The isolated directory occupied
about 3.9 GB before model download.

Serve a single-sequence development model through the contiguous MLX cache:

```bash
export SPIKE_DIR=/private/tmp/roads-rfc001-local-model-spike
export HF_HOME="$SPIKE_DIR/hf-home"
export VLLM_HOST_IP=127.0.0.1
export VLLM_METAL_USE_PAGED_ATTENTION=0
export VLLM_METAL_MEMORY_FRACTION=auto
export VLLM="$SPIKE_DIR/vllm-metal-55a97b9a7b3dd84c69e91fb1872abcb769336070/.venv-vllm-metal/bin/vllm"

"$VLLM" serve mlx-community/Qwen2.5-Coder-7B-Instruct-4bit \
  --revision 019cc73c45c770444708a6dd8690c66243cc5c80 \
  --host 127.0.0.1 \
  --port 8001 \
  --max-model-len 2048 \
  --max-num-seqs 1 \
  --gpu-memory-utilization 0.5
```

`VLLM_HOST_IP=127.0.0.1` is required on the observed machine because automatic
interface selection chose the Surfshark/VPN address for vLLM's internal
single-process Gloo socket and stalled in `SYN_SENT`. This is an
environment-specific finding, not a general vLLM-Metal requirement.

`VLLM_METAL_USE_PAGED_ATTENTION=0` is an observed development configuration
for this M1 and single-sequence workload. The plugin documents paged attention
as experimental even though it defaults to enabled. Do not generalize this
control result to production concurrency or newer Apple hardware.

## Canary results

| Measurement                        |            Paged default | Contiguous MLX control |
| ---------------------------------- | -----------------------: | ---------------------: |
| Engine initialization after load   |                   90.84s |                  0.11s |
| Reported KV capacity               | 8.59 GB / 299,456 tokens | 0.06 GB / 2,048 tokens |
| 64-token request                   |                  163.10s |                  5.72s |
| Approx. generated tokens/s         |                     0.39 |                  11.18 |
| `memory_pressure -Q` after request |                 53% free |               67% free |

The 8-token post-warm-up paged control still took 20.79s, disproving
first-request warm-up as the explanation for the 64-token result. Changing
only `VLLM_METAL_USE_PAGED_ATTENTION` reduced the direct 64-token comparison
by 28.5x.

The canary returned HTTP 200 from `/v1/chat/completions`, but it did not obey
the exact-output instruction. It is a reasoning model and exhausted the
64-token limit on self-talk. This proves endpoint mechanics and measures the
resource path only; it is not evidence of instruction following or teaching
quality.

## 7B candidate results

| Measurement                                         | Observed                     |
| --------------------------------------------------- | ---------------------------- |
| Artifact reconstruction                             | 4.28 GB, completed           |
| Model load, including resumed transfer              | 185.94s                      |
| Engine initialization and warm-up after load        | 0.98s                        |
| Reported contiguous-cache admission                 | 0.12 GB / 2,048 tokens       |
| Maximum 2,048-token request concurrency             | 1.00x                        |
| `/v1/models`                                        | HTTP 200 in 45.70ms          |
| Exact-output control                                | HTTP 200 in 3.99s            |
| Exact-output result                                 | `READY`, 2 completion tokens |
| `memory_pressure -Q` after control                  | 31% free                     |
| `memory_pressure -Q` after ten classification calls | 30% free                     |
| `memory_pressure -Q` after clean shutdown           | 66% free                     |

The server identified the pinned 7B model at `/v1/models`, used the MLX GPU
worker, completed warm-up, and served the deterministic exact-output control.
All eleven subsequent classification and control requests returned HTTP 200;
the server reported no queued requests in this sequential run.

The successful cache contained a 4.0 GiB weight blob. The interrupted transfer
also left a stale 2.6 GiB `.incomplete` blob, so the model cache directory
occupied 6.6 GiB before cleanup. The stale partial was not used by the
successful snapshot or server.

These observations establish fit for one 2,048-token sequence on this M1
development machine under the recorded workload. They do not establish an
acceptable end-to-end learner latency, production capacity, or headroom for
concurrent requests.

## Synthetic classification curiosity probe

`run-classification-probe.ts` used the reviewed ten-case, label-blind prompt
and recorded invalid output separately from a valid wrong classification.

| Result                |     Observed |
| --------------------- | -----------: |
| Valid JSON verdicts   |        10/10 |
| Label agreements      |         7/10 |
| False resets          |            3 |
| Missed resets         |            0 |
| Invalid outputs       |            0 |
| Mean request latency  |       26.28s |
| Request latency range | 21.34-36.38s |

The three disagreements all reset on a labeled continuation:

1. an off-by-one discussion followed by a function returning `None`;
2. a `fetch()` result followed by a click-handler question;
3. a `KeyError` discussion followed by tests crashing.

The conservative prompt therefore did not reliably preserve state across
plausible consequence chains in this fixture. The cases summarize prior
context rather than supplying real conversation history, and the labels were
assigned during fixture authoring. This is single-run anecdotal
synthetic-summary behavior with zero model-selection or RFC design weight.

## RFC proof boundary

Proven:

- Pinned vLLM-Metal installs and activates physical Metal on the actual M1.
- A pinned MLX artifact can be pulled through the Hugging Face path and served
  through the OpenAI-compatible endpoint.
- A single-sequence contiguous-cache configuration produces a usable
  mechanical development baseline on the 1.5B canary.
- The pinned 7B candidate fits, warms, identifies itself, and completes a
  deterministic chat request on the same 16 GB M1.
- Launcher/backend/network settings must be pinned and acceptance-tested on the
  target development machine; plugin defaults are not a portable assumption.

Not proven:

- the complete milestone-0 path through pi;
- diagnosis, routing, tutoring, or instruction-following quality;
- acceptable end-to-end learner latency or conservative reset behavior;
- production Linux/CUDA parity, concurrency, or capacity.

## Evidence files

| File                                   | Purpose                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `install.log`                          | Pinned installer output and component timings         |
| `canary-server.log`                    | Failed automatic-interface launch                     |
| `canary-server-loopback.log`           | Paged canary download, load, and requests             |
| `canary-server-contiguous.log`         | Contiguous-cache control                              |
| `canary-*.json`                        | Raw OpenAI-compatible responses                       |
| `qwen7b-server-contiguous.log`         | Interrupted 7B transfer and clean pause               |
| `qwen7b-server-contiguous-resumed.log` | Resumed transfer, load, requests, and clean shutdown  |
| `qwen7b-models.json`                   | Raw `/v1/models` response                             |
| `qwen7b-models-curl.log`               | `/v1/models` HTTP and timing result                   |
| `qwen7b-control-response.json`         | Raw deterministic control response                    |
| `qwen7b-control-curl.log`              | Control HTTP and timing result                        |
| `qwen7b-memory-pressure-*.log`         | Post-control, post-probe, and post-shutdown snapshots |
| `qwen7b-process-*.log`                 | API and engine process snapshots                      |
| `qwen7b-vm-stat-post-control.log`      | Post-control VM snapshot                              |
| `run-classification-probe.ts`          | Reviewed synthetic-summary probe runner               |
| `classification-probe.jsonl`           | Raw per-case verdicts and recomputed summary          |
| `checksums.txt`                        | SHA-256 manifest for raw evidence + the exact runner  |

The repository's root `*.log` rule ignores fourteen files named above. Before
committing this evidence set, force-add those exact logs and verify both
`checksums.txt` and the staged filenames with `git ls-files --stage`. The
manifest intentionally excludes this living README; Git records documentation
changes. Until then, the complete evidence set exists only in the working tree.

## References

- [vLLM-Metal at the tested commit](https://github.com/vllm-project/vllm-metal/tree/55a97b9a7b3dd84c69e91fb1872abcb769336070)
- [vLLM-Metal configuration](https://docs.vllm.ai/projects/vllm-metal/en/latest/configuration/)
- [vLLM-Metal paged-KV roadmap](https://github.com/vllm-project/vllm-metal/issues/148)
- [Canary artifact at the tested revision](https://huggingface.co/mlx-community/DeepSeek-R1-Distill-Qwen-1.5B-4bit/tree/933185be1b8f81d9a21dcfa15ff73470d3545240)
- [7B artifact at the tested revision](https://huggingface.co/mlx-community/Qwen2.5-Coder-7B-Instruct-4bit/tree/019cc73c45c770444708a6dd8690c66243cc5c80)
