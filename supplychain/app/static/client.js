 
function loadFromUrl(handle, d, id, f) {
    $.ajax({url: handle, data : d, success: function(result){
        const content = f(JSON.parse(result));
        //console.log(content)
        $(id).html(content);
    }});
}

function loadFromUrlNoParse(handle, d, id, f) {
    $.ajax({url: handle, data : d, success: function(result){
        const content = f(result);
        //console.log(content)
        $(id).html(content);
    }});
}



function showItemInfo(iteminfo) { 
    //let iteminfo = JSON.parse(iteminfoStr);

    const fp = iteminfo.footprint.slice(0,7) +'...' + iteminfo.footprint.slice(-7);
    return `<li>Item <b>"${iteminfo.item}"</b>:  <b>${iteminfo.src} &rarr; ${iteminfo.dst}</b> with (encrypted) footprint <b>${fp}</b></li>`;
}

function mkShipperForm(shipperIdx, rslt) {
    let tag = rslt.item;
    
    let otherShipper = 1-Number(shipperIdx);

    let html_string = `
    <li><form action="newiteminfo" method="post">
                <input type="hidden"  name="user" value="S${shipperIdx}">
                <input class="keepgray"  type="text"  name="tag" id="tag-text" value="${tag}" readonly>
                <input type="number"  class="small-input" name="val" id="val-text" value="">
                <select name="infodst">
                    <option value="S${otherShipper}">To Shipper #${otherShipper}</option>
                    <option value="D">To Distributor</option>
                  </select>            
                <input type="submit" value="&#10133;"><br>
            </form></li>
      `

      return html_string;

}

function load_shipper_pending_items(shipperIdx)
{
    user_str = "S" + shipperIdx;
    loadFromUrlNoParse("/mypendingitems",  {complete_user : user_str }, "#pending-items",  
        function (rslt) {
            rslt = JSON.parse(rslt);   
            if (rslt.length == 0) { return "<p>I have no pending items at the moment</p>"; }

            let mapFn = function (r) { return mkShipperForm(shipperIdx, r); };
            const mappedVals = rslt.map(mapFn);
            return  "<ul>" +  mappedVals.join("\n")+ "</ul>"; }
        
    );

    //form = mkShipperForm();
}

function showItemEvaled(e) {
    return "<li> "+ e[0] +  "  " + e[1] + "</li>";
}

function showItemToEval(tag) {
    const ret = `
    <li>
        <form action="/evalitem" method="post">
            <span>${tag}</span>
            <input type="submit" value="Evaluate!">
            <input type="hidden" name="tag" value="${tag}">
        </form>
    </li>`;
    return ret;
}

function loadEvaluatorPage() {
    loadFromUrlNoParse("/evaluations",  { }, "#log-items", 
        function (rslt) {
            rslt = JSON.parse(rslt);  
            if (rslt.length == 0) { return "<p>No evaluated items at the moment</p>"; }
       
            const mappedVals = rslt.map(showItemEvaled);
            return "<ul>" + mappedVals.join(' ') + "</ul>"; }
    );    

    loadFromUrlNoParse("/itemstoeval",  { }, "#pending-items", 
        function (rslt) {
            rslt = JSON.parse(rslt);
            if (rslt.length == 0) { return "<p>No items to evaluate at the moment</p>"; }
         
            const mappedVals = rslt.map(showItemToEval);
            return "<ul>" + mappedVals.join(' ') + "</ul>"; }
    );    
}

function reloadAll(isFirstReload) {

    // this is the evaluator page if there is no #userid element
    if ( ! $("#userid").length ) {
        loadEvaluatorPage();
        return;
    }

    let user_str = $("#userid").attr('value');

    // My items
    loadFromUrlNoParse("/myitems",  {complete_user : user_str }, "#log-items", 
        function (rslt) {
            rslt = JSON.parse(rslt);
            if (rslt.length == 0) { return "<p>I have no items at the moment</p>"; }
           
            const mappedVals = rslt.map(showItemInfo);
            return "<ul>" + mappedVals.join(' ') + "</ul>"; }
    );

    // Pending items for shipper
    if (user_str[0] == 'S' && isFirstReload) {
        load_shipper_pending_items(user_str[1]);
    }

}


let intervalID = setInterval( function() { reloadAll(false); }, 5000);
$(document).ready( function() {reloadAll(true); } );
