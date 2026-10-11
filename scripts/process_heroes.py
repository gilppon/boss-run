import sys
import os
from PIL import Image, ImageFilter
import numpy as np

def process_sprite(input_path, output_path, target_max_dim=256):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)

    # Calculate distance to pure white (255, 255, 255)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    
    # White background detection: high brightness, low saturation
    brightness = (r + g + b) / 3.0
    saturation = np.max(arr[:, :, :3], axis=2) - np.min(arr[:, :, :3], axis=2)

    # Thresholds: very bright and very unsaturated is background
    # Smooth transition between 230 and 248
    is_white = (brightness > 230) & (saturation < 30)
    
    # Alpha mask: 0 for white bg, 255 for sprite
    alpha = np.ones((img.height, img.width), dtype=np.uint8) * 255
    
    # Let's use flood fill from borders to avoid eating internal white parts
    from scipy.ndimage import binary_fill_holes
    # Or simple connected component / flood fill from edges
    from collections import deque
    
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
                    
    # Edge feathering for smooth cartoon lines
    alpha_img = Image.fromarray(alpha, mode="L")
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.7))
    
    img.putalpha(alpha_img)
    
    # Crop to non-transparent bounding box with padding
    bbox = img.getbbox()
    if bbox:
        # add slight padding
        pad = 8
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
        img = img.crop(bbox)
        
    # Resize keeping aspect ratio
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
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\hero_scout_raw_1791610169007.jpg",
            r"e:\solarena\보스\public\sprites\hero_scout.webp"
        ),
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\hero_warden_raw_1791610193690.jpg",
            r"e:\solarena\보스\public\sprites\hero_warden.webp"
        ),
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\hero_breaker_raw_1791610215755.jpg",
            r"e:\solarena\보스\public\sprites\hero_breaker.webp"
        ),
        (
            r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\hero_duelist_raw_1791610239063.jpg",
            r"e:\solarena\보스\public\sprites\hero_duelist.webp"
        ),
    ]
    for inp, out in tasks:
        process_sprite(inp, out)
