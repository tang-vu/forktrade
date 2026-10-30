# Narrated ForkTrade demo

The 2026-10-30 film uses actual 2026-10-23 public-card captures and clearly labelled editorial graphics. It does not recreate wallet approvals, order submission or a fill lifecycle. The original 27.1-second walkthrough remains unchanged.

Output: [1080p narrated MP4](../../evidence/forktrade-demo-narrated-2026-10-30.mp4), [English subtitles](../../evidence/forktrade-demo-2026-10-30.en.srt), [Vietnamese subtitles](../../evidence/forktrade-demo-2026-10-30.vi.srt), [provenance and QA](../../evidence/narrated-demo-2026-10-30.json).

Local authoring tools: Python 3.15, Pillow **12.3.0**, FFmpeg/FFprobe **9.0.2**, and existing Windows Segoe UI fonts. No application dependency or lockfile change. Run from the repository root:

```powershell
# Optional regeneration: paid/provider usage; requires your own authorized MiMo API key.
# Enter the credential at the hidden terminal prompt; never put it in a file/command.
python tools/demo/mimo_voice.py
python tools/demo/mimo_voice.py --verify

# Local-only composition and media checks:
python tools/demo/render_demo.py
python tools/demo/verify_demo.py
```

Successful voice WAVs and minimal usage/hash metadata stay in ignored `.local/demo-2026-10-30/voice`. Cached clips are reused only when the synthesis-input hash matches. `--only 01-intro,07-provenance` limits a generation/verification to named scenes. ASR results are reused only for identical audio bytes. No automatic retry occurs after an API error or uncertain timeout.

`storyboard.json` fixes the reviewed narration and evidence inputs. The original thesis narration had unwanted trailing generated speech; the explicit `trimEndSeconds` retains only the reviewed sentence content, verified again with ASR. Narration models are probabilistic: regenerating audio requires another transcript/timing review; the measured cutoff is specific to the existing recorded WAV. Regeneration is not bit-for-bit reproducibility.

The renderer leaves all original screenshots unchanged. Two scenes crop the original receipt/comparison for readability. Other graphics are summaries, not application screenshots. Voice is AI-generated with `mimo-v2.5-tts`, preset `Chloe`; only reviewed narration/instructions and generated narration audio for ASR were transmitted to `api.xiaomimimo.com`. The API key is held in memory, never saved. No source repository, screenshots, wallet/session data or private account payload is uploaded.

The final media check fully decodes the film, validates H264/AAC format, duration, source hashes, subtitle intervals, ASR-audio hash binding and loudness, and extracts all eight decoded scene frames. Visually inspect those frames and subtitles before changing the QA marker to reviewed. Sentence caption timing is proportional within measured audio clips and is not word-level alignment. Vietnamese SRT is a manually translated companion; burned-in captions are English.

Creating media/private Git storage does not publish it externally, post to X or submit a Build. The reviewed public-release ZIP from 2026-10-23 remains an older immutable package and does not yet contain this narrated edition.
