"""Decode and review the artifact; emit only nonsecret media QA evidence."""

import hashlib
import json
import re
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".local" / "demo-2026-10-30"
MANIFEST = ROOT / "evidence" / "narrated-demo-2026-10-30.json"


def call(args):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(result.stderr[-1500:])
    return result.stdout, result.stderr


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def srt_seconds(stamp):
    h, m, s, ms = map(int, re.split("[:,]", stamp))
    return h * 3600 + m * 60 + s + ms / 1000


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    video = ROOT / manifest["video"]
    storyboard = json.loads(Path(__file__).with_name("storyboard.json").read_text(encoding="utf-8"))
    assert manifest["sha256"] == sha(video), "Video hash changed"
    assert all(sha(ROOT / p) == expected for p, expected in manifest["sourceHashes"].items()), "Source capture changed"
    duration = float(manifest["probe"]["format"]["duration"])
    assert 30 < duration < 140, "Review expected duration"
    streams = manifest["probe"]["streams"]
    assert any(s.get("width") == 1920 and s.get("height") == 1080 and s["codec_name"] == "h264" for s in streams)
    assert any(s["codec_name"] == "aac" and s["sample_rate"] == "48000" for s in streams)
    call(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", video, "-f", "null", "NUL"])
    captions = {}
    for language in ["en", "vi"]:
        path = ROOT / "evidence" / f"forktrade-demo-2026-10-30.{language}.srt"
        text = path.read_text(encoding="utf-8")
        intervals = re.findall(r"(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})", text)
        last_end = 0
        for start, end in intervals:
            start, end = srt_seconds(start), srt_seconds(end)
            assert start >= last_end - 0.002 and start < end <= duration, "Invalid caption interval"
            last_end = end
        captions[language] = {"cues": len(intervals), "sha256": sha(path), "validNonoverlappingTimes": True}
    qa = WORK / "qa"
    qa.mkdir(exist_ok=True)
    contact = Image.new("RGB", (1920, 2240), "#e2e6d8")
    d = ImageDraw.Draw(contact)
    transcription = []
    for i, (scene, story) in enumerate(zip(manifest["scenes"], storyboard["scenes"])):
        t = scene["start"] + min(3, scene["duration"] / 2)
        path = qa / (scene["id"] + ".jpg")
        call(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", t, "-i", video, "-frames:v", "1", "-q:v", "2", path])
        im = Image.open(path).resize((960, 540))
        x, y = (i % 2) * 960, (i // 2) * 560
        contact.paste(im, (x, y))
        d.text((x + 12, y + 542), scene["id"], fill="#1d2c28")
        voice = WORK / "voice" / (scene["id"] + (".edited" if "trimEndSeconds" in story else "") + ".wav")
        asr_path = voice.with_suffix(".asr.json")
        asr = json.loads(asr_path.read_text(encoding="utf-8"))
        assert sha(voice) == asr["audioSha256"], "ASR belongs to a different audio clip"
        with wave.open(str(voice), "rb") as wav:
            assert abs(wav.getnframes() / wav.getframerate() - scene["voiceTrimEndSeconds"]) < 0.01
        transcription.append({"scene": scene["id"], "model": asr["model"], "sourceAudioSha256": asr["audioSha256"], "transcript": asr["transcript"], "expected": story["narration"]})
    contact_path = qa / "contact.jpg"
    contact.save(contact_path, quality=94)
    _, loudness = call(["ffmpeg", "-hide_banner", "-i", video, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "NUL"])
    loudness = json.loads(re.search(r'\{\s*"input_i".*?\}', loudness, re.S).group())
    assert -22 < float(loudness["input_i"]) < -12
    assert float(loudness["input_tp"]) < 0
    manifest["voice"]["transmitted"] = "Reviewed narration and generic voice instructions for TTS; generated narration audio only for ASR QA. No screenshots, repository source, addresses, wallet/session data uploaded."
    manifest["qa"] = {
        "fullDecode": "passed", "sourceHashesUnchanged": True,
        "formatAndDuration": "passed; 1080p H264/AAC stereo, below 140 seconds",
        "captions": captions, "loudness": {"integratedLUFS": float(loudness["input_i"]), "truePeakDBTP": float(loudness["input_tp"])},
        "asrReview": transcription,
        "visualReview": "Pending inspection of all eight decoded scene frames and subtitle placement",
        "contactSheet": contact_path.relative_to(ROOT).as_posix(),
        "externalPublication": "not performed",
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"duration": duration, "bytes": video.stat().st_size, "sha256": sha(video), "decode": "passed", "captionCues": {k: v["cues"] for k, v in captions.items()}, "loudness": manifest["qa"]["loudness"], "ASRClips": len(transcription)}, indent=2))


if __name__ == "__main__":
    main()
