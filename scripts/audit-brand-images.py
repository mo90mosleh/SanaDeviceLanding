import base64, io, json
from pathlib import Path
from PIL import Image
import fitz
out=Path("artifacts/brand-audit")
out.mkdir(parents=True,exist_ok=True)
def preview(name,image):
    image.thumbnail((900,1100))
    buf=io.BytesIO()
    image.convert("RGB").save(buf,format="JPEG",quality=85)
    print("SANA_ASSET_PREVIEW "+name+" "+base64.b64encode(buf.getvalue()).decode())
preview("bha3000-current",Image.open("public/product-assets/getein/images/bha3000.webp"))
doc=fitz.open("public/product-assets/getein/catalogs/GETEIN-BHA3000-Catalog.pdf")
print("CATALOG_TEXT "+doc[0].get_text()[:5000].replace("\n"," | "))
preview("bha3000-catalog",Image.open(io.BytesIO(doc[0].get_pixmap(matrix=fitz.Matrix(1.3,1.3)).tobytes("png"))))
for index,entry in enumerate(doc[0].get_images(full=True)):
    info=doc.extract_image(entry[0])
    image=Image.open(io.BytesIO(info["image"]))
    print("CATALOG_IMAGE "+json.dumps({"index":index,"size":image.size,"format":info["ext"]}))
    if image.width>=200 and image.height>=200:
        (out/("catalog-image-"+str(index)+"."+info["ext"])).write_bytes(info["image"])
        preview("catalog-image-"+str(index),image)
