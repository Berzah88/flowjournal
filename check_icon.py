"""
Icon dosyalarını kontrol et ve adaptive icon için yeni bir tane oluştur
"""
from PIL import Image, ImageDraw
import os

assets_dir = "assets"

# Mevcut icon dosyalarını kontrol et
print("=== Mevcut Icon Dosyaları ===")
icon_files = ["logo-yeni.png", "adaptive-icon.png", "icon.png", "icon2.png"]

for icon_file in icon_files:
    icon_path = os.path.join(assets_dir, icon_file)
    if os.path.exists(icon_path):
        img = Image.open(icon_path)
        print(f"\n{icon_file}:")
        print(f"  Boyut: {img.size}")
        print(f"  Format: {img.format}")
        print(f"  Mode: {img.mode}")
    else:
        print(f"\n{icon_file}: BULUNAMADI")

# Yeni adaptive icon oluştur
print("\n\n=== Yeni Adaptive Icon Oluştur ===")
print("Android Adaptive Icon gereksinimleri:")
print("  - Toplam boyut: 1024x1024 px")
print("  - Safe zone: 672x672 px (merkezde)")
print("  - Kenarlardan 176px boşluk bırakılmalı")

try:
    # logo-yeni.png'yi yükle
    original_icon = Image.open(os.path.join(assets_dir, "logo-yeni.png"))
    print(f"\nOrijinal icon yüklendi: {original_icon.size}")
    
    # Yeni adaptive icon oluştur (1024x1024)
    adaptive_size = 1024
    safe_zone = 672  # %66 of 1024
    margin = (adaptive_size - safe_zone) // 2  # 176px
    
    # Beyaz arka plan
    new_icon = Image.new('RGBA', (adaptive_size, adaptive_size), (255, 255, 255, 0))
    
    # Orijinal icon'u safe zone'a sığacak şekilde yeniden boyutlandır
    # Biraz daha küçük yap ki kenarlardan margin olsun
    icon_size = int(safe_zone * 0.75)  # Safe zone'un %75'i
    original_icon.thumbnail((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    # Merkeze yerleştir
    x = (adaptive_size - original_icon.width) // 2
    y = (adaptive_size - original_icon.height) // 2
    new_icon.paste(original_icon, (x, y), original_icon if original_icon.mode == 'RGBA' else None)
    
    # Kaydet
    output_path = os.path.join(assets_dir, "adaptive-icon-new.png")
    new_icon.save(output_path)
    print(f"\n✅ Yeni adaptive icon oluşturuldu: {output_path}")
    print(f"   Icon boyutu: {original_icon.size}")
    print(f"   Canvas boyutu: {adaptive_size}x{adaptive_size}")
    print(f"   Safe zone: {safe_zone}x{safe_zone}")
    print(f"   Icon pozisyonu: ({x}, {y})")
    
    # Görselleştirme için safe zone çizgisi ekle (test amaçlı)
    test_icon = new_icon.copy()
    draw = ImageDraw.Draw(test_icon)
    # Safe zone sınırını çiz
    draw.rectangle([margin, margin, adaptive_size - margin, adaptive_size - margin], 
                   outline=(255, 0, 0, 128), width=3)
    test_output = os.path.join(assets_dir, "adaptive-icon-test.png")
    test_icon.save(test_output)
    print(f"\n📊 Test görselleştirmesi: {test_output}")
    print("   (Kırmızı çizgi safe zone sınırını gösterir)")
    
except Exception as e:
    print(f"\n❌ Hata: {e}")
    print("\nManuel çözüm:")
    print("1. logo-yeni.png dosyasını bir resim editöründe aç")
    print("2. 1024x1024 px boyutunda yeni bir canvas oluştur")
    print("3. Logo'yu merkeze yerleştir ve etrafında boşluk bırak")
    print("4. adaptive-icon.png olarak kaydet")
