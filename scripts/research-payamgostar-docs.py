import concurrent.futures,json,re,urllib.request
urls=["https://help.payamgostar.com/","http://help.payamgostar.com/","https://developer.payamgostar.com/soap-docs/","http://developer.payamgostar.com/soap-docs/","https://help.payamgostar.com/wp-json/","https://help.payamgostar.com/robots.txt"]
def fetch(url):
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=20) as r:
   data=r.read(2000000).decode("utf-8",errors="replace");final=r.url
  links=re.findall(r'(?:href|src)=["\']([^"\']+)',data)
  snippets=[data[max(0,m.start()-400):m.end()+800] for m in re.finditer("SearchForm|typeKey|developers|developer.payamgostar|query|wp-json|soap",data,re.I)]
  return {"url":url,"final":final,"links":links[:180],"snippets":snippets[:20],"sample":data[:1200] if not links else ""}
 except Exception as e:return {"url":url,"errorType":type(e).__name__,"error":str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(fetch,urls):print("RESEARCH_RESULT "+json.dumps(result,ensure_ascii=False))
