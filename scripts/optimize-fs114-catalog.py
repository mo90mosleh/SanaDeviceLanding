import base64, hashlib, json, os, re, subprocess, unicodedata, urllib.request
from pathlib import Path
import fitz
from PIL import Image, ImageChops, ImageStat
source=Path("public/product-assets/wondfo/catalogs/fs-114-catalog.pdf")
out=Path("artifacts/fs114-compression")
out.mkdir(parents=True,exist_ok=True)
before=fitz.open(source)
print("PDF_SOURCE "+json.dumps({"bytes":source.stat().st_size,"pages":len(before),"textCharacters":sum(len(p.get_text()) for p in before)},ensure_ascii=False),flush=True)
selected=None
for dpi in (300,225,180,150):
    target=out/f"fs-114-{dpi}dpi.pdf"
    args=["gs","-sDEVICE=pdfwrite","-dCompatibilityLevel=1.6","-dNOPAUSE","-dBATCH","-dSAFER","-dAutoRotatePages=/None","-dDetectDuplicateImages=true","-dCompressFonts=true","-dSubsetFonts=true","-dPassThroughJPEGImages=false","-dPassThroughJPXImages=false","-dAutoFilterColorImages=false","-dColorImageFilter=/DCTEncode","-dAutoFilterGrayImages=false","-dGrayImageFilter=/DCTEncode","-dJPEGQ=90"]
    for kind in ("Color","Gray"):
        args += [f"-dDownsample{kind}Images=true",f"-d{kind}ImageDownsampleType=/Bicubic",f"-d{kind}ImageResolution={dpi}",f"-d{kind}ImageDownsampleThreshold=1.0"]
    args+=["-dDownsampleMonoImages=true","-dMonoImageResolution=600",f"-sOutputFile={target}",str(source)]
    subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
    print("PDF_CANDIDATE "+json.dumps({"dpi":dpi,"bytes":target.stat().st_size}),flush=True)
    if target.stat().st_size < 4_800_000:
        selected=target
        break
assert selected is not None,"No acceptable sub-5 MB version; do not publish unreadable low quality."
subprocess.run(["qpdf","--check",str(selected)],check=True)
after=fitz.open(selected)
assert len(before)==len(after),"Page count changed"
normalize=lambda s:re.sub(r"\s+","",unicodedata.normalize("NFKC",s))
diffs=[]
for i,(a,b) in enumerate(zip(before,after)):
    assert abs(a.rect.width-b.rect.width)<0.01 and abs(a.rect.height-b.rect.height)<0.01,(i,"Page size changed")
    assert normalize(a.get_text())==normalize(b.get_text()),(i,"Extractable text changed")
    assert len(a.get_links())==len(b.get_links()),(i,"Link count changed")
    pix_a=a.get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False)
    pix_b=b.get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False)
    im_a=Image.frombytes("RGB",(pix_a.width,pix_a.height),pix_a.samples)
    im_b=Image.frombytes("RGB",(pix_b.width,pix_b.height),pix_b.samples)
    if im_a.size!=im_b.size:im_b=im_b.resize(im_a.size)
    mean=sum(ImageStat.Stat(ImageChops.difference(im_a,im_b)).mean)/3
    diffs.append(round(mean,4))
    assert mean<7,(i,"Excessive visual change",mean)
    if i in {0,len(before)-1,max(range(len(before)),key=lambda j:len(before[j].get_text()))}:
        for label,im in [("before",im_a),("after",im_b)]:
            im.thumbnail((1000,1400))
            im.save(out/f"page-{i+1}-{label}.jpg",quality=88)
            preview=im.copy()
            preview.thumbnail((700,1100))
            import io
            buf=io.BytesIO()
            preview.save(buf,format="JPEG",quality=72)
            encoded=base64.b64encode(buf.getvalue()).decode()
            name=f"fs114-page-{i+1}-{label}"
            print("PDF_PREVIEW_BEGIN "+json.dumps({"name":name,"bytes":len(buf.getvalue())}),flush=True)
            for index in range(0,len(encoded),8000):print(f"PDF_PREVIEW_CHUNK {name} {index//8000} {encoded[index:index+8000]}",flush=True)
result={"originalBytes":source.stat().st_size,"compressedBytes":selected.stat().st_size,"pages":len(after),"dpi":dpi,"reductionPercent":round(100*(1-selected.stat().st_size/source.stat().st_size),2),"textPreserved":True,"linksPreserved":True,"pageRenderMeanDifference":diffs,"sha256":hashlib.sha256(selected.read_bytes()).hexdigest()}
(out/"verification.json").write_text(json.dumps(result,indent=2))
(out/"fs-114-catalog.pdf").write_bytes(selected.read_bytes())
print("PDF_VERIFICATION "+json.dumps(result),flush=True)
payload=json.dumps({"encoding":"base64","content":base64.b64encode(selected.read_bytes()).decode()}).encode()
req=urllib.request.Request("https://api.github.com/repos/"+os.environ["GITHUB_REPOSITORY"]+"/git/blobs",data=payload,method="POST",headers={"Authorization":"Bearer "+os.environ["GH_TOKEN"],"Accept":"application/vnd.github+json","Content-Type":"application/json","X-GitHub-Api-Version":"2022-11-28"})
with urllib.request.urlopen(req,timeout=90) as response:blob=json.load(response)
print("PDF_OPTIMIZED_BLOB "+json.dumps({"sha":blob["sha"],"bytes":selected.stat().st_size}),flush=True)
