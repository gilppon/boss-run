import os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

def process_sprite(input_path, output_path, target_max_dim=320):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    
    brightness = (r + g + b) / 3.0
    saturation = np.max(arr[:, :, :3], axis=2) - np.min(arr[:, :, :3], axis=2)

    is_white = (brightness > 232) & (saturation < 30)
    alpha = np.ones((img.height, img.width), dtype=np.uint8) * 255
    
    visited = np.zeros((img.height, img.width), dtype=bool)
    q = deque()
    
    # Add borders
    for x in range(img.width):
        if is_white[0, x]: q.append((0, x)); visited[0, x] = True
        if is_white[img.height - 1, x]: q.append((img.height - 1, x)); visited[img.height - 1, x] = True
    for y in range(img.height):
        if is_white[y, 0]: q.append((y, 0)); visited[y, 0] = True
        if is_white[y, img.width - 1]: q.append((y, img.width - 1)); visited[y, img.width - 1] = True
        
    while q:
        cy, cx = q.popleft()
        alpha[cy, cx] = 0
        for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < img.height and 0 <= nx < img.width:
                if not visited[ny, nx] and is_white[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
                    
    alpha_img = Image.fromarray(alpha, mode="L")
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.7))
    img.putalpha(alpha_img)
    
    bbox = img.getbbox()
    if bbox:
        pad = 8
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
        img = img.crop(bbox)
        
    w, h = img.size
    scale = target_max_dim / max(w, h)
    new_size = (int(round(w * scale)), int(round(h * scale)))
    img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "WEBP", quality=90)
    print(f"Saved {output_path}: {img.size}")

if __name__ == "__main__":
    tasks = [
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\boss_hell_king_raw_1791611727509.jpg",
            r"e:\solarena\보스\public\sprites\boss_hell_king.webp"
        ),
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\boss_abyss_lord_raw_1791611759388.jpg",
            r"e:\solarena\보스\public\sprites\boss_abyss_lord.webp"
        ),
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\boss_last_emperor_raw_1791611803736.jpg",
            r"e:\solarena\보스\public\sprites\boss_last_emperor.webp"
        ),
    ]
    for inp, out in tasks:
        process_sprite(inp, out)
