import os
from PIL import Image

output_dir = r"e:\solarena\보스\public\sprites"
os.makedirs(output_dir, exist_ok=True)

ground_src = r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\dungeon_ground_tile_1791536812646.jpg"
pillars_src = r"C:\Users\PC\.gemini\antigravity-ide\brain\0ba5f71a-5042-49ce-9e56-a2efaf7186ad\dungeon_mid_pillars_1791536837014.jpg"

# 1. Process Ground Tile
img_g = Image.open(ground_src)
# Crop slightly top/bottom if needed, resize to seamless width e.g. 512 x 200
w, h = img_g.size
# Crop top edge if there is any black letterbox
img_g_cropped = img_g.crop((0, int(h * 0.04), w, h))
img_g_resized = img_g_cropped.resize((512, 180), Image.Resampling.LANCZOS)
dest_ground = os.path.join(output_dir, "tile_ground.webp")
img_g_resized.save(dest_ground, "WEBP", quality=85)
print(f"[OK] Saved {dest_ground} ({os.path.getsize(dest_ground) / 1024:.1f} KB)")

# 2. Process Pillars Parallax (Black background transparency)
img_p = Image.open(pillars_src).convert("RGBA")
datas = img_p.getdata()
new_data = []

for item in datas:
    # item: (r, g, b, a)
    brightness = max(item[0], item[1], item[2])
    if brightness < 14:
        new_data.append((0, 0, 0, 0))
    elif brightness < 32:
        alpha = int((brightness - 14) / 18 * 255)
        new_data.append((item[0], item[1], item[2], alpha))
    else:
        new_data.append(item)

img_p.putdata(new_data)
# Resize to 960 x 540 for lightweight high performance parallax
img_p_resized = img_p.resize((960, 540), Image.Resampling.LANCZOS)
dest_pillars = os.path.join(output_dir, "pillars_hd.webp")
img_p_resized.save(dest_pillars, "WEBP", quality=85)
print(f"[OK] Saved {dest_pillars} ({os.path.getsize(dest_pillars) / 1024:.1f} KB)")

print("Background assets processed successfully!")
