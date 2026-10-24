import json, os, urllib.request, urllib.error, urllib.parse
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor
origin="https://cbc.ortanes.com"
def get(url, head=False):
    req=urllib.request.Request(url,method="HEAD" if head else "GET",headers={"User-Agent":"SANA-site-audit/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=15) as r:
            body="" if head else r.read(700000).decode("utf8","replace")
            return {"url":url,"final":r.url,"status":r.status,"type":r.headers.get("Content-Type"),"server":r.headers.get("Server"),"body":body}
    except urllib.error.HTTPError as e:
        return {"url":url,"status":e.code,"type":e.headers.get("Content-Type"),"body":""}
    except Exception as e:return {"url":url,"error":str(e)}
class Parser(HTMLParser):
    def __init__(self): super().__init__();self.assets=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("script","img","image","link"):
            v=a.get("src") or a.get("href")
            if v and not v.startswith(("data:","#")): self.assets.append(v)
        if tag=="a" and a.get("href"):self.links.append(a["href"])
root=get(origin+"/")
html=root.pop("body","")
print("CRAWL_ROOT "+json.dumps(root))
p=Parser();p.feed(html)
print("CRAWL_REFERENCES "+json.dumps({"assets":p.assets,"links":p.links},ensure_ascii=False))
urls=list(dict.fromkeys(urllib.parse.urljoin(origin+"/",v) for v in p.assets))
urls=[u for u in urls if urllib.parse.urlsplit(u).netloc=="cbc.ortanes.com"][:60]
pairs=[]
for u in urls:
    pairs.append(u)
    if "/SanaDeviceLanding/" in u:pairs.append(u.replace("/SanaDeviceLanding/","/",1))
with ThreadPoolExecutor(max_workers=8) as pool:
    for result in pool.map(lambda u:get(u,True),list(dict.fromkeys(pairs))):
        print("CRAWL_ASSET "+json.dumps(result))
paths=["/cbc/bha3000/","/cbc/bha5000/","/cbc/bha5100/","/poct/fs-114/","/poct/fs-205/","/SanaDeviceLanding/"]
for path in paths:
    r=get(origin+path);r.pop("body",None);print("CRAWL_ROUTE "+json.dumps(r))
r=get("https://mo90mosleh.github.io/SanaDeviceLanding/");r.pop("body",None);print("CRAWL_OLD_URL "+json.dumps(r))
try:
    req=urllib.request.Request("https://api.github.com/repos/mo90mosleh/SanaDeviceLanding/pages",headers={"Authorization":"Bearer "+os.environ["GITHUB_TOKEN"],"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"})
    with urllib.request.urlopen(req,timeout=15) as r:
        d=json.load(r)
    print("PAGES_SETTINGS "+json.dumps({k:d.get(k) for k in ["html_url","cname","build_type","status","https_enforced"]}))
except Exception as e:print("PAGES_SETTINGS_ERROR "+str(e))
