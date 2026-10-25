import json,re,urllib.request
from pathlib import Path
from html import unescape
out=Path("artifacts/payamgostar-contract");out.mkdir(parents=True,exist_ok=True)
urls=["https://developer.payamgostar.com/soap-docs/"]
for index,url in enumerate(urls):
    try:
        with urllib.request.urlopen(url,timeout=40) as r:html=r.read().decode("utf-8")
        (out/f"docs-{index}.html").write_text(html)
        links=re.findall(r'(?:href|src)=["\']([^"\']+)',html)
        print("PG_DOC_LINKS "+json.dumps({"url":url,"links":links},ensure_ascii=False))
        text=re.sub(r"<script\b[\s\S]*?</script>|<style\b[\s\S]*?</style>","",html,flags=re.I)
        text=unescape(re.sub(r"<[^>]+>"," ",text))
        text=re.sub(r"[ \t]+"," ",text)
        (out/f"docs-{index}.txt").write_text(text)
        for start in range(0,min(len(text),130000),7000):print("PG_DOC_TEXT "+json.dumps({"part":start//7000,"text":text[start:start+7000]},ensure_ascii=False))
    except Exception as e:print("PG_DOC_ERROR "+json.dumps({"url":url,"type":type(e).__name__,"message":str(e)}))
