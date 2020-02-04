from flask import Flask
from os import path, chdir, getcwd

app = Flask(__name__)
app.config["DEBUG"] = True


print(f"CWD: {getcwd()}")
oldcwd = getcwd()
chdir('typescript') # change current directory for wallet

from app import routes
