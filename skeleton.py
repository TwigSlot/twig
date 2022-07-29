# from bs4 import BeautifulSoup
from requests_html import HTMLSession
import json
from dotenv import dotenv_values
import os
from pymongo import MongoClient
import PyPDF2, io

dotenv_values(".env")
client = MongoClient(os.environ.get("MONGO_URL"))
infoDB, infoCollection = None, None
try:
    infoDB = client['info-db']
    infoCollection = infoDB['info-collection']
except:
    print("cannot connect to DB")

class Website:
    def __init__(self, url):
        self.url = url 
        self.title = None
        self.summary = None
        self.paragraphs = None
        self.links = None
        self.saved = False
        # try to retrieve info from database
        info = None
        if(infoCollection != None): info = infoCollection.find_one({'url':self.url})
        if(info): 
            self.saved = True
            self.title = info['title']
            self.url = info['url']
            self.summary = info['summary']
            self.links = info['links']
            self.paragraphs = info['paragraphs']
            return
        self.html = self.render()
    def getURL(self):
        return self.url
    def getTitle(self): 
        if(self.title == None):
            try:
                self.title = self.html.find('title')[0].text
            except:
                self.title = f"title for {self.url}"
        return self.title
    def getSummary(self): 
        if(self.summary == None):
            try:
                attempts = 0
                while(attempts < 30): 
                    try: self.summary = self.html.find('p')[attempts].text
                    except: self.summary = super().getSummary()
                    attempts += 1
                    if(len(self.summary) > 100): return self.summary
                self.summary = f"summary for {self.url}"
            except:
                self.summary = f"summary for {self.url}"
        return self.summary
    def getJSON(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary()}
    def getJSONString(self):
        info = self.getJSON()
        return json.dumps(info)

    def render(self):
        session = HTMLSession()
        response = session.get(self.url)
        return response.html
        
class PDF(Website):
    def __init__(self, url):
        super().__init__(url)
        if(self.saved == False):
            self.save()
    def exportToDB(self):
        self.pdfReader = PyPDF2.PdfFileReader(io.BytesIO(self.html._html))
        self.getParagraphs()
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary(),
             'paragraphs': self.getParagraphs(), 
             'links': self.getLinks() }
    def save(self):
        self.saved = True
        if(infoCollection != None): infoCollection.insert_one(self.exportToDB())       
    def getTitle(self):
        if(self.title == None):
            try: self.title = self.pdfReader.getDocumentInfo().title
            except: self.title = super().getTitle()
        return self.title
    def getURL(self):
        return self.url
    def getLinks(self):
        return []
    def getParagraphs(self):
        if(self.paragraphs == None):
            try: self.paragraphs = [self.pdfReader.getPage(i).extractText() for i in range(self.pdfReader.numPages)]
            except: self.paragraphs = ['error occured']
        return self.paragraphs
    def getSummary(self):
        if(self.summary == None):
            try: self.summary = self.paragraphs[0]
            except: self.summary = 'error occured'
        return self.summary
    def getJSON(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary()}
    def getJSONString(self):
        info = self.getJSON()
        return json.dumps(info)
class Wiki(Website):
    def __init__(self, url):
        url = url.split('#')[0]
        super().__init__(url)
        # if unsaved yet
        if(self.saved == False): 
            # save() generates json for the first time
            self.save()
    def save(self):
        self.saved = True
        if(infoCollection != None): infoCollection.insert_one(self.exportToDB())
    def exportToDB(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary(),
             'paragraphs': self.getParagraphs(), 
             'links': self.getLinks() }

    def getTitle(self):
        if(self.title == None): 
            try: self.title = self.html.find('#firstHeading')[0].text
            except: self.title = super().getTitle()
        return self.title
    def getURL(self): 
        return self.url
    def getSummary(self): # 
        if(self.summary == None): 
            attempts = 1
            while(attempts < 10): 
                try: self.summary = self.html.find('p')[attempts].text
                except: self.summary = super().getSummary()
                attempts += 1
                if(len(self.summary) > 100): break
        return self.summary
    def getParagraphs(self):
        if(self.paragraphs == None): 
            self.paragraphs = [i.text for i in self.html.find('p')]
        return self.paragraphs
    def getLinks(self):
        if(self.links == None):
            self.links = list(self.html.absolute_links)
        return self.links
    def getJSON(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary()}
    def getJSONString(self):
        info = self.getJSON()
        return json.dumps(info)

class ArXiv(Website):
    def __init__(self, url):
        url = url.replace('.pdf', '').replace('pdf','abs') # in case url comes in the form of pdf
        self.url = url
        self.authors = None
        super().__init__(url)
        if(self.saved == False):
            self.save()
    def getTitle(self):
        if(self.title == None): 
            self.title = self.html.find('title')[0].text.split('\n')[0]
        return self.title
    def getAuthors(self):
        if(self.authors == None): 
            self.authors = self.html.find('.authors')[0].text.split('\n')[0].replace('Authors:','').split(',')
        return self.authors
    def getAbstract(self):
        return self.html.find('.abstract')[0].text.split('\n')[0]
    def getSummary(self): # summary is just abstract
        if(self.summary == None): 
            self.summary = self.getAbstract()
        return self.summary
    def getURL(self):
        return self.url
    def save(self):
        return 
    def getJSONString(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary()}

class Medium(Website):
    def __init__(self, url):
        url = url.split('#')[0]
        super().__init__(url)
        # if unsaved yet
        if(self.saved == False): 
            # save() generates json for the first time
            self.save()
    def save(self):
        self.saved = True
        if(infoCollection != None): infoCollection.insert_one(self.exportToDB())
    def exportToDB(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary(),
             'paragraphs': self.getParagraphs(), 
             'links': self.getLinks() }

    def getTitle(self):
        if(self.title == None): 
            try: self.title = self.html.find('.pw-post-title')[0].text
            except: self.title = super().getTitle()
        return self.title
    def getURL(self): 
        return self.url
    def getSummary(self): # 
        if(self.summary == None): 
            attempts = 0
            while(attempts < 10): 
                try: self.summary = self.html.find('.pw-post-body-paragraph')[attempts].text
                except: self.summary = super().getSummary()
                attempts += 1
                if(len(self.summary) > 100): break
        return self.summary
    def getParagraphs(self):
        if(self.paragraphs == None): 
            self.paragraphs = [i.text for i in self.html.find('p')]
        return self.paragraphs
    def getLinks(self):
        if(self.links == None):
            self.links = list(self.html.absolute_links)
        return self.links
    def getJSON(self):
        return {'title': self.getTitle(),
             'url': self.getURL(),
             'summary': self.getSummary()}
    def getJSONString(self):
        info = self.getJSON()
        return json.dumps(info)

class Edge:
    def __init__(self, A, B):
        self.A = A
        self.B = B
class Node:
    def __init__(self, url):
        self.url = url
        self.obj = None
        self.edgesOut = []
        self.edgesIn = []
        if('en.wikipedia.org' in self.url): self.obj = Wiki(self.url)
    def addEdge(self, B):
        self.edgesOut.append(Edge(self,B))
        self.edgesIn.append(Edge(B,self))
class WikiCrawler:
    def __init__(self):
        self.nodes = []
        self.queue = []
    def stepBFS(self, node = None):
        if(node == None): node = self.queue[0]
        if(node in self.queue): self.queue.remove(node)
        if(node.obj == None): return
        print(f'bfs @ {node.url}')
        for nextLink in node.obj.links:
            next = Node(nextLink)
            node.addEdge(next)
            self.nodes.append(next)
            self.queue.append(next)
if(__name__ == "__main__"):
    pass
    # wc = WikiCrawler()
    # wc.stepBFS(Node('https://en.wikipedia.org/wiki/Quantum_field_theory'))

    # for i in range(10):
    #     wc.stepBFS()