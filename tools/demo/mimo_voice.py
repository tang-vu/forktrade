"""Generate only reviewed demo narration. Credentials are read once from stdin.

No credential files, payload/response logs, redirect forwarding or automatic retries.
Existing successful clips are reused only when their exact synthesis input matches.
"""

import base64
import getpass
import hashlib
import json
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / ".local" / "demo-2026-10-30" / "voice"
ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    storyboard = json.loads((Path(__file__).with_name("storyboard.json")).read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    print("Ready for the API key on stdin; it will not be echoed or saved.", flush=True)
    key = (getpass.getpass("MiMo API key (hidden): ") if sys.stdin.isatty() else sys.stdin.readline()).strip()
    if not key:
        raise SystemExit("No API key supplied.")
    opener = urllib.request.build_opener(NoRedirect())
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    for scene in storyboard["scenes"]:
        if only and scene["id"] not in only:
            continue
        verify = "--verify" in sys.argv
        audio_path = OUTPUT / (scene["id"] + ".wav")
        verification_path = OUTPUT / (scene["id"] + ".asr.json")
        if verify and "trimEndSeconds" in scene:
            trimmed_path = OUTPUT / (scene["id"] + ".edited.wav")
            with wave.open(str(audio_path), "rb") as source:
                with wave.open(str(trimmed_path), "wb") as destination:
                    destination.setparams(source.getparams())
                    destination.writeframes(source.readframes(round(scene["trimEndSeconds"] * source.getframerate())))
            audio_path = trimmed_path
            verification_path = OUTPUT / (scene["id"] + ".edited.asr.json")
        if verify and verification_path.exists():
            previous = json.loads(verification_path.read_text(encoding="utf-8"))
            if previous["audioSha256"] == hashlib.sha256(audio_path.read_bytes()).hexdigest():
                print(f"ASR already available: {scene['id']}", flush=True)
                continue
        payload = {
            "model": storyboard["model"],
            "messages": [
                {"role": "user", "content": scene.get("voiceStyle", storyboard["style"])},
                {"role": "assistant", "content": scene["narration"]},
            ],
            "audio": {"format": "wav", "voice": storyboard["voice"]},
            "stream": False,
        }
        if verify:
            payload = {
                "model": "mimo-v2.5-asr",
                "messages": [{"role": "user", "content": [{"type": "input_audio", "input_audio": {"data": "data:audio/wav;base64," + base64.b64encode(audio_path.read_bytes()).decode("ascii")}}]}],
                "asr_options": {"language": "en"},
                "stream": False,
            }
        data = json.dumps(payload, ensure_ascii=False).encode()
        fingerprint = hashlib.sha256(data).hexdigest()
        meta_path = audio_path.with_suffix(".json")
        if not verify and audio_path.exists() and meta_path.exists():
            previous = json.loads(meta_path.read_text(encoding="utf-8"))
            if previous.get("inputSha256") == fingerprint:
                print(f"Reusing {scene['id']}", flush=True)
                continue
        request = urllib.request.Request(
            ENDPOINT, data=data,
            headers={"Content-Type": "application/json", "api-key": key},
            method="POST",
        )
        try:
            with opener.open(request, timeout=180) as response:
                result = json.loads(response.read(32_000_000))
        except urllib.error.HTTPError as error:
            # Deliberately do not emit raw response bodies or request headers.
            raise SystemExit(f"MiMo request failed: HTTP {error.code}; no retry was sent.") from None
        except Exception:
            raise SystemExit("MiMo request failed or timed out; outcome uncertain, no automatic retry.") from None
        try:
            if verify:
                transcript = result["choices"][0]["message"]["content"]
                verification_path.write_text(json.dumps({"scene": scene["id"], "model": "mimo-v2.5-asr", "transcript": transcript, "usage": result.get("usage"), "audioSha256": hashlib.sha256(audio_path.read_bytes()).hexdigest()}, indent=2) + "\n", encoding="utf-8")
                print(f"ASR {scene['id']}: {transcript}", flush=True)
                continue
            audio = base64.b64decode(result["choices"][0]["message"]["audio"]["data"], validate=True)
            audio_path.write_bytes(audio)
            with wave.open(str(audio_path), "rb") as wav:
                duration = wav.getnframes() / wav.getframerate()
            metadata = {
                "provider": "Xiaomi MiMo", "endpoint": ENDPOINT,
                "model": storyboard["model"], "voice": storyboard["voice"],
                "scene": scene["id"], "inputSha256": fingerprint,
                "audioSha256": hashlib.sha256(audio).hexdigest(),
                "durationSeconds": duration,
                "usage": result.get("usage"),
            }
            meta_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
            print(f"Generated {scene['id']}: {duration:.2f}s", flush=True)
        except Exception:
            raise SystemExit("MiMo returned unusable audio; no raw response logged and no retry sent.") from None
    key = None
    print("Narration complete; no credential was persisted.", flush=True)


if __name__ == "__main__":
    main()
