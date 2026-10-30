"""Compose an honest narrated demo from existing, dated real captures.

Requires Python 3.11+, Pillow 12.3.0 and FFmpeg/FFprobe 9.0.2 on PATH.
No app/wallet/network access. Source screenshots remain unchanged on disk.
"""

import hashlib
import json
import math
import re
import subprocess
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".local" / "demo-2026-10-30"
OUT = ROOT / "evidence"
W, H, FPS = 1920, 1080, 30
CREAM, INK, MUTED, LIME = "#F5F6ED", "#1D2C28", "#69766C", "#D3F35B"
FONT_DIR = Path("C:/Windows/Fonts")


def run(args):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode:
        raise RuntimeError(result.stderr[-2400:])
    return result.stdout


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font(size, bold=False, serif=False):
    name = "georgia.ttf" if serif else ("seguisb.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(FONT_DIR / name), size)


def lines(draw, text, xy, size, color=INK, bold=False, gap=1.23, serif=False):
    x, y = xy
    for line in text.splitlines():
        draw.text((x, y), line, font=font(size, bold, serif), fill=color)
        y += size * gap
    return y


def pill(draw, text, xy, fill=LIME, color=INK, size=18):
    x, y = xy
    f = font(size, True)
    box = draw.textbbox((0, 0), text, font=f)
    width = box[2] + 32
    draw.rounded_rectangle((x, y, x + width, y + 38), radius=8, fill=fill)
    draw.text((x + 16, y + 6), text, font=f, fill=color)


def screenshot(canvas, path, box, crop=None):
    image = Image.open(path).convert("RGB")
    if crop:
        image = image.crop(crop)
    fitted = ImageOps.contain(image, (box[2], box[3]), Image.Resampling.LANCZOS)
    x, y = box[0] + (box[2] - fitted.width) // 2, box[1] + (box[3] - fitted.height) // 2
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((x - 9, y - 9, x + fitted.width + 9, y + fitted.height + 9), radius=18, fill="#FFFFFF", outline="#DDE3D2", width=2)
    canvas.paste(fitted, (x, y))


def base(index):
    image = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, W, 8), fill=INK)
    lines(d, "forktrade.", (66, 27), 40, bold=True)
    pill(d, "TESTNET / PAPER FUNDS", (1566, 36), size=17)
    d.line((64, 103, 1856, 103), fill="#D9DFD0", width=2)
    lines(d, "TESTNET DEMO · CAPTURES: 23 OCT 2026 · AFTER EXECUTION", (66, 920), 18, MUTED, bold=True)
    lines(d, f"{index + 1:02d} / 08", (1770, 920), 18, MUTED, bold=True)
    d.rectangle((64, 957, 1856, 1060), fill=INK)
    d.rectangle((64, 957, 64 + int(1792 * (index + 1) / 8), 962), fill=LIME)
    return image


def draw_scene(scene, index):
    image = base(index)
    d = ImageDraw.Draw(image)
    layout = scene["layout"]
    lines(d, scene["eyebrow"], (68, 145), 19, MUTED, bold=True)
    if layout in ("intro", "outro"):
        size = 78 if layout == "outro" else 92
        lines(d, scene["title"], (65, 235), size, bold=True, gap=1.14)
        lines(d, scene["description"], (70, 505 if layout == "intro" else 490), 32, MUTED, gap=1.45)
        if layout == "intro":
            for j, (number, title, detail) in enumerate([
                ("01", "Save a thesis", "Version the reasoning"),
                ("02", "Review an order", "Approve an exact decision"),
                ("03", "Remix independently", "Keep your own judgment"),
            ]):
                y = 220 + j * 181
                d.rounded_rectangle((1210, y, 1840, y + 150), radius=21, fill=INK)
                lines(d, number, (1245, y + 29), 22, LIME, True)
                lines(d, title, (1310, y + 24), 35, "#FFFFFF", True)
                lines(d, detail, (1310, y + 79), 23, "#CBD6C5")
        else:
            d.rounded_rectangle((1230, 230, 1835, 694), radius=24, fill=INK)
            lines(d, "Recorded evidence", (1270, 268), 27, LIME, True)
            lines(d, "Actual root + remix\nConfirmed / filled\nLocal share cards\nVisible parameter differences", (1270, 340), 29, "#FFFFFF", gap=1.65)
            lines(d, "Wallet signing and order approvals\nare not shown in this film.", (72, 690), 27, MUTED)
            lines(d, "AI narration · Xiaomi MiMo", (72, 775), 19, MUTED)
        pill(d, scene["label"], (70, 820), size=17)
    elif layout == "proof":
        lines(d, scene["title"], (64, 235), 81, bold=True, gap=1.13)
        lines(d, "Two wallets · same human\nRoot: manually approved\nRemix: agent-operated under delegation", (70, 480), 29, MUTED, gap=1.6)
        for j, (title, price) in enumerate([("ORIGINAL / V1", "82,027.6"), ("REMIX / V2", "82,027.5")]):
            x = 930 + j * 465
            d.rounded_rectangle((x, 235, x + 425, 737), radius=24, fill=INK)
            lines(d, title, (x + 32, 273), 23, LIME, True)
            lines(d, "0.00013", (x + 28, 346), 65, "#FFFFFF", True)
            lines(d, "BTC FILLED", (x + 32, 432), 23, "#C6D1C3", True)
            lines(d, "Limit price · USDso", (x + 32, 506), 23, "#C6D1C3")
            lines(d, price, (x + 32, 546), 43, "#FFFFFF", True)
            pill(d, "REMAINDER 0", (x + 32, 646), size=18)
        lines(d, "SUMMARY OF VERIFIED HISTORICAL RECEIPTS", (932, 775), 17, MUTED, True)
        pill(d, scene["label"], (70, 820), size=17)
    else:
        lines(d, scene["title"], (64, 235), 63, bold=True, gap=1.17)
        lines(d, scene["description"], (70, 450), 26, MUTED, gap=1.7)
        # Editorial labels are outside the evidence screenshot, never painted over it.
        label = textwrap.fill(scene["label"], width=43)
        lines(d, label, (70, 790), 17, MUTED, True)
        d.rounded_rectangle((735, 145, 1854, 882), radius=28, fill="#E9EDDF")
        if layout == "root-detail":
            screenshot(image, ROOT / scene["image"], (815, 170, 960, 687), crop=(108, 264, 486, 862))
        elif layout == "comparison":
            screenshot(image, ROOT / scene["image"], (762, 210, 1065, 620), crop=(141, 447, 1108, 836))
        elif layout == "mobile":
            for j, path in enumerate(scene["images"]):
                screenshot(image, ROOT / path, (850 + j * 410, 163, 332, 697))
        else:
            screenshot(image, ROOT / scene["image"], (761, 164, 1067, 699))
    path = WORK / "plates" / (scene["id"] + ".png")
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)
    return path


def stamp(seconds, srt=False):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{',' if srt else '.'}{ms:03}"


def caption_blocks(text, max_chars=98):
    sentences = re.split(r"(?<=[.!?])\s+", text)
    result = []
    for sentence in sentences:
        words, chunk = sentence.split(), []
        for word in words:
            if len(" ".join(chunk + [word])) > max_chars and chunk:
                result.append(" ".join(chunk))
                chunk = []
            chunk.append(word)
        if chunk:
            result.append(" ".join(chunk))
    return result


def ass_stamp(t):
    cent = round(t * 100)
    h, cent = divmod(cent, 360000)
    m, cent = divmod(cent, 6000)
    s, cent = divmod(cent, 100)
    return f"{h}:{m:02}:{s:02}.{cent:02}"


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    storyboard = json.loads(Path(__file__).with_name("storyboard.json").read_text(encoding="utf-8"))
    scenes = storyboard["scenes"]
    metadata = [json.loads((WORK / "voice" / (s["id"] + ".json")).read_text()) for s in scenes]
    # Keep the social cut below 140 seconds without shortening the spoken script.
    raw_duration = sum(min(m["durationSeconds"], s.get("trimEndSeconds", m["durationSeconds"])) for s, m in zip(scenes, metadata))
    speed = max(1.12, raw_duration / 124)
    if speed > 1.65:
        raise RuntimeError("Narration is too long for a natural social cut; review script before rendering.")
    ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 0", "", "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding", "Style: Default,Segoe UI,30,&H00FFFFFF,&H00FFFFFF,&H00282C1D,&H00282C1D,0,0,0,0,100,100,0,0,1,0,0,2,110,110,35,1", "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    cues_en, cues_vi, time, scene_records = [], [], 0.0, []
    for i, (scene, meta) in enumerate(zip(scenes, metadata)):
        plate = draw_scene(scene, i)
        voice_duration = min(meta["durationSeconds"], scene.get("trimEndSeconds", meta["durationSeconds"]))
        duration = math.ceil((voice_duration / speed + 0.8) * FPS) / FPS
        voice = WORK / "voice" / (scene["id"] + ".wav")
        clip = WORK / (scene["id"] + ".mp4")
        fade_out = duration - 0.25
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-framerate", FPS, "-i", plate,
             "-i", voice, "-vf", f"fade=t=in:st=0:d=0.22,fade=t=out:st={fade_out}:d=0.25,format=yuv420p",
             "-af", f"atrim=end={voice_duration:.7f},asetpts=PTS-STARTPTS,atempo={speed:.7f},loudnorm=I=-16:TP=-1.5:LRA=11,adelay=200:all=1,apad",
             "-t", f"{duration:.6f}", "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-r", FPS,
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", clip])
        chunks = caption_blocks(scene["narration"])
        weights = [len(c) for c in chunks]
        cursor = time + 0.2
        available = voice_duration / speed
        for chunk, weight in zip(chunks, weights):
            end = cursor + available * weight / sum(weights)
            cues_en.append((cursor, end, chunk))
            wrapped = "\\N".join(textwrap.wrap(chunk, width=104))
            ass.append(f"Dialogue: 0,{ass_stamp(cursor)},{ass_stamp(end)},Default,,0,0,0,,{wrapped}")
            cursor = end
        for j, chunk in enumerate(caption_blocks(scene["vi"], 100)):
            vi_chunks = caption_blocks(scene["vi"], 100)
            cues_vi.append((time + 0.2 + j * available / len(vi_chunks), time + 0.2 + (j + 1) * available / len(vi_chunks), chunk))
        scene_records.append({"id": scene["id"], "start": round(time, 3), "duration": duration, "narrationSha256": meta["audioSha256"], "voiceTrimEndSeconds": voice_duration, "sources": [scene["image"]] if "image" in scene else scene.get("images", []), "editing": "Editorial layout and labelled summary; evidence crops only in original-receipt and comparison scenes. No screenshot text replaced."})
        time += duration
        print(f"Rendered {scene['id']}: {duration:.2f}s", flush=True)
    concat = WORK / "clips.txt"
    concat.write_text("\n".join(f"file '{(WORK / (s['id'] + '.mp4')).as_posix()}'" for s in scenes), encoding="utf-8")
    joined = WORK / "joined.mp4"
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", joined])
    captions = WORK / "captions.ass"
    captions.write_text("\n".join(ass) + "\n", encoding="utf-8-sig")
    video = OUT / "forktrade-demo-narrated-2026-10-30.mp4"
    # Relative filter path avoids Windows drive-letter escaping in libass.
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", joined, "-vf", "ass=.local/demo-2026-10-30/captions.ass", "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-c:a", "copy", "-movflags", "+faststart", video])
    for language, cues in [("en", cues_en), ("vi", cues_vi)]:
        (OUT / f"forktrade-demo-2026-10-30.{language}.srt").write_text("\n\n".join(f"{i+1}\n{stamp(a, True)} --> {stamp(b, True)}\n{text}" for i, (a, b, text) in enumerate(cues)) + "\n", encoding="utf-8")
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate,channels", "-of", "json", video]))
    manifest = {"kind": "Narrated editorial walkthrough using actual 2026-10-23 captures; not a new live execution", "createdAt": datetime.now(timezone.utc).isoformat(), "video": video.relative_to(ROOT).as_posix(), "sha256": sha(video), "probe": probe,
                "voice": {"provider": "Xiaomi MiMo", "model": storyboard["model"], "voice": storyboard["voice"], "speed": round(speed, 7), "transmitted": "Only the reviewed English narration and generic delivery instructions; no source screenshots, addresses, wallet/session data or repository uploaded", "credentialStorage": "None; hidden terminal input, in-memory requests only"},
                "toolVersions": {"Pillow": "12.3.0", "FFmpeg": "9.0.2"}, "captionTiming": "Paragraph clips measured from generated WAVs; sentence cues estimated proportionally, not word-aligned ASR", "scenes": scene_records,
                "sourceHashes": {path: sha(ROOT / path) for path in sorted({p for s in scene_records for p in s["sources"]})},
                "limitations": ["Original recordings are from 2026-10-23 after the executions, not a fresh 2026-10-30 account read", "Wallet signing and order approvals are not shown", "Two distinct EOAs belong to the same human; root manual, exact remix agent-operated under explicit delegation", "Editorial title cards and receipt summaries are explanatory graphics, not app screenshots", "No profit or controlled strategy-performance comparison", "Local source/media only; public publication and submission remain pending"], "qa": "Pending decoded-frame and audio verification"}
    (OUT / "narrated-demo-2026-10-30.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Demo complete: {video.relative_to(ROOT)} ({time:.2f}s)", flush=True)


if __name__ == "__main__":
    main()
