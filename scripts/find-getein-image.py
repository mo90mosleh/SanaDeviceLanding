import re, urllib.request
url="https://www.getein.com/bha-3000-automatic-hematology-analyzer_p172.html"
req=urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
html=urllib.request.urlopen(req,timeout=30).read().decode("utf8")
links=re.findall(r"""(?:src|data-src|data-original)=["']([^"']+)["']|url\(["']?([^)"']+)""",html)
for a,b in links:
    link=a or b
    if re.search(r"\.(?:png|jpe?g|webp)",link,re.I): print("OFFICIAL_IMAGE_URL "+urllib.request.urljoin(url,link))
for text in re.findall(r".{0,200}(?:BHA|bha|banner_img|pro_pic|product_pic).{0,300}",html):
    print("OFFICIAL_CONTEXT "+text[:500])
