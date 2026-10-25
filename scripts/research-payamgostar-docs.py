import json,urllib.request,fitz
urls=["https://developer.payamgostar.com/wp-content/uploads/2023/08/Form.pdf","https://developer.payamgostar.com/wp-content/uploads/2021/04/CrmObjectType.pdf"]
for url in urls:
 try:
  with urllib.request.urlopen(url,timeout=35) as r:data=r.read(15000000)
  pdf=fitz.open(stream=data,filetype="pdf")
  for i,p in enumerate(pdf):
   print("OFFICIAL_PDF "+json.dumps({"url":url,"page":i+1,"text":p.get_text()},ensure_ascii=False))
 except Exception as e:print("PDF_READ_ERROR "+json.dumps({"url":url,"error":str(e)}))
