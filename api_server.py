from flask import Flask, request
from flask_cors import CORS
from skeleton import ArXiv, Wiki, Medium, Website, PDF

app = Flask(__name__)
CORS(app)
@app.route("/link/", methods=['GET'])
def link():
    url = request.args.get('url')
    print(url)
    if('en.wikipedia.org' in url):
        return Wiki(url).getJSONString()
    elif('arxiv.org' in url):
        return ArXiv(url).getJSONString()
    elif('medium.com' in url):
        return Medium(url).getJSONString()
    elif('.pdf' in url):
        return PDF(url).getJSONString()
    else:
        return Website(url).getJSONString()

if(__name__=="__main__"):
    print("running app directly")
    app.run(host="127.0.0.1",port=5000,debug=False,threaded=True)

# wiki = Wiki('https://en.wikipedia.org/wiki/Quantum_field_theory#:~:text=In%20theoretical%20physics%2C%20quantum%20field,to%20construct%20models%20of%20quasiparticles.')
# print(wiki.getTitle())
# print(wiki.getURL())
# print(wiki.getSummary())
# text.headers.date
# text.url
# text.html.absolute_links
