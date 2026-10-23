import base64, io, hashlib, urllib.request
from pathlib import Path
from PIL import Image
url="https://www.getein.com/uploadfile/202609/18/1f6730533655b658aa9654bf7f4d5436_medium.png"
req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
raw=urllib.request.urlopen(req,timeout=40).read()
im=Image.open(io.BytesIO(raw))
print("OFFICIAL_REPLACEMENT "+str(im.size)+" "+im.mode)
out=io.BytesIO()
im.save(out,format="WEBP",lossless=True)
data=out.getvalue()
print("BHA_REPLACEMENT_BEGIN "+str(len(data))+" "+hashlib.sha256(data).hexdigest())
encoded=base64.b64encode(data).decode()
for i in range(0,len(encoded),8000): print("BHA_REPLACEMENT_CHUNK "+str(i//8000)+" "+encoded[i:i+8000])
im.thumbnail((800,900))
preview=io.BytesIO()
im.convert("RGB").save(preview,format="JPEG",quality=90)
print("SANA_ASSET_PREVIEW official-bha3000 "+base64.b64encode(preview.getvalue()).decode())
