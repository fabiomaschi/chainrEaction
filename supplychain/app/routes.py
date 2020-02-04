from flask import render_template, jsonify, request, redirect, url_for
from app import app #, root_path, instance_path
from subprocess import check_output
from os import path, chdir, getcwd
from random import randint

DIST_FOLDER = '../typescript/dist/'


def getRandomIdx():
    l = [str(randint(0,10)) for i in range(3)]
    return ''.join(l)

# Run a command and return output
def run_node_cmd(cmd_name, rst = []):
    # Name of executable
    basic_cmd = path.join(app.root_path, DIST_FOLDER, "client")

    # Build program and arguments
    cmd_list = [
        "node", basic_cmd,
        "--cmd", cmd_name
    ] + rst

    # Some debugging hints
    cmd_string_dbg = ' '.join(cmd_list)
    print(f"Running: {cmd_string_dbg}")

    #print(f"CWD: {getcwd()}")
    #oldcwd = getcwd()
    #chdir('typescript') # change current directory for wallet

    # Run command
    rslt =  check_output(cmd_list)

    #chdir(oldcwd)

    return rslt

def render_with_user(filename):
    user = request.args.get("user", "0")
    success_str = request.args.get("success_str", "")
    return render_template(
        filename,
        user = user, 
        success_str = success_str)

@app.route('/')
@app.route('/index')
def index():
    return '<html><body>Please go to <a href="/farmer">/farmer</a>, <a href="/shipper">/shipper</a> or <a href="/evaluator">/evaluator</a></body></html>'
    #success_str = request.args.get("success_str", "")
    #return render_template(
    #    'index.html', 
    #    success_str = success_str)

@app.route('/manufacturer')
def manufacturer():
    return render_template('ManufacturerMain.html')

@app.route('/supplier')
def supplier():
    return render_template('supplier.html')

@app.route('/user')
def user():
    return render_template('UserProf.html')

@app.route('/manufacturer/apple')
def apple():
    return render_template('Apple.html')

@app.route('/phones/iphone')
def iphone():
    return render_template('iPhone.html')







@app.route('/farmer')
def farmer():
    return render_with_user('farmer.html')

@app.route('/shipper')
def shipper():
    return render_with_user('shipper.html')

@app.route('/evaluator')
def evaluator():
    return render_template('evaluator.html')

@app.route('/myitems')
def items():
    user = request.args.get("complete_user", "F0") # F0 is our default
    return run_node_cmd('queryItemInfosBySrc', 
        ["--src", user] )

@app.route('/queryItemInfoByIdx')
def itemsByIdx():
    idx = request.args.get("idx","")
    return run_node_cmd('queryItemInfoByIdx', ["--idx", idx])

@app.route('/mypendingitems')
def pendingitems():
    user = request.args.get("complete_user", "F0") # F0 is our default
    return run_node_cmd('queryPendingItemInfos', 
        ["--user", user] )

@app.route('/itemstoeval')
def itemstoeval():
    return run_node_cmd('queryItemsWaitingEval');

@app.route('/evalitem', methods = ['POST'])
def evalitem():
    item = request.form.get('tag')
    rst = [ "--item", item ]
    output = run_node_cmd('updateEvaluation', rst)
    return redirect(url_for("evaluator"))

@app.route('/evaluations')
def evaluations():
    return run_node_cmd('queryAllEvaluations')

@app.route('/newiteminfo', methods = ['POST'])
def newiteminfo():
    idx = getRandomIdx()

    item = request.form.get('tag')
    footprint = request.form.get('val')

    curUser = request.form.get('user')

    infosrc = curUser
    infodst = request.form.get('infodst')
    
    rst = [
        "--idx", idx,
        "--item", item,
        "--footprint", footprint,
        "--src", infosrc,
        "--dst", infodst,
        ]
    output = run_node_cmd('addItemInfo', rst)

    # What page to get back to?
    return_point = "NA"
    if curUser[0] == "F":
        return_point = 'farmer'
    elif curUser[0] == "S":
        return_point = 'shipper'
    else:
        # Should not happen
        print("Can't figure out user")
    return redirect(url_for(return_point, user=curUser[-1], success_str=output))
