import os
from PIL import Image

output_dir = r"e:\solarena\보스\public\sprites"
os.makedirs(output_dir, exist_ok=True)

files = [
    {
        "src": r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\lil_demon_boss_1791533740335.jpg",
        "dest": os.path.join(output_dir, "boss_demon.webp"),
        "bg_type": "black",
        "crop_margin": 40,
    },
    {
        "src": r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\dungeon_apprentice_hero_1791533760487.jpg",
        "dest": os.path.join(output_dir, "hero_apprentice.webp"),
        "bg_type": "white",
        "crop_margin": 40,
    },
    {
        "src": r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\demon_minion_sprite_1791533786244.jpg",
        "dest": os.path.join(output_dir, "minion_imp.webp"),
        "bg_type": "black",
        "crop_margin": 40,
    },
]

def make_transparent(img, bg_type):
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []

    # Flood fill or threshold based transparency
    # For black background:
    if bg_type == "black":
        for item in datas:
            # item is (r, g, b, a)
            # if very close to black
            brightness = max(item[0], item[1], item[2])
            if brightness < 20:
                new_data.append((0, 0, 0, 0))
            elif brightness < 40:
                # smooth edge
                alpha = int((brightness - 20) / 20 * 255)
                new_data.append((item[0], item[1], item[2], alpha))
            else:
                new_data.append(item)
    elif bg_type == "white":
        for item in datas:
            min_val = min(item[0], item[1], item[2])
            if min_val > 240:
                new_data.append((255, 255, 255, 0))
            elif min_val > 220:
                alpha = int((240 - min_val) / 20 * 255)
                new_data.append((item[0], item[1], item[2], alpha))
            else:
                new_data.append(item)

    img.putdata(new_data)
    
    # Auto-crop to content bounding box
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    return img

for item in files:
    src_path = item["src"]
    dest_path = item["dest"]
    bg_type = item["bg_type"]
    
    print(f"Processing {src_path} -> {dest_path}...")
    img = Image.open(src_path)
    processed = make_transparent(img, bg_type)
    
    # Resize to high-resolution game sprite size (e.g., 256x256 or 192x192)
    processed.thumbnail((256, 256), Image.Resampling.LANCZOS)
    processed.save(dest_path, "WEBP", quality=90)
    
    size_kb = os.path.getsize(dest_path) / 1024
    print(f"[OK] Saved {dest_path} ({size_kb:.1f} KB, dimensions: {processed.size})")

print("All sprites processed successfully!")
