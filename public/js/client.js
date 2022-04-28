//const req = require("express/lib/request");
//const { json } = require("express/lib/response");

const opts = ["Genre","Publisher"]; 

let body = document.getElementById("body");
body.onload = getBundles;

let btn = document.getElementById("refresh");
btn.onclick = queryResults;

function getBundles(){
	//generates dropdown menu options
    genDropDown();
    //gets all the bundles in the store loaded
    getAllBundleData();
}

function genDropDown(){
    let o = document.getElementById("choice");
    for(const x of opts){
        let element = document.createElement('option');
        element.value = x;
        element.text = x;
        o.appendChild(element);
    }
}


function queryResults(){
	let text = document.getElementById("userInput").value.toLowerCase();
    let searchBy = document.getElementById("choice").value.toLowerCase();

    if(text == ""){
        alert("Search Field Can't be empty!");
        return;
    }

    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
		//If the response is available and was successful
		if (this.readyState == 4 && this.status == 200) {
			let responseObject = JSON.parse(xhttp.responseText);
			//Update our page
			cleanBundles();
			updateBundles(responseObject);
		}
        if (this.readyState == 4 && this.status == 404) {
			let responseObject = JSON.parse(xhttp.responseText);
			//Update our page
			alert(`No Bundles matched your search words: ${responseObject}`);
            
            //updateBundles(responseObject);
		}
	};
	//Create the request
	xhttp.open("GET", `http://localhost:3000/bundleSearch?type=${searchBy}&words=${text}`, true);
        //send request
	xhttp.send();
}


function cleanBundles(){
	document.getElementById("userInput").value = "";
    let div = document.getElementById("results");
	div.innerHTML = "";
}




function updateBundles(bundles){
	
	//generate dropDown
    let div = document.getElementById("results");
    // //make a link to go to /bundles/bundleId
	for (let i = 0; i < bundles.length; i++) {
        	let newDiv = document.createElement("div");
            newDiv.classList.add("boxes");
            let priceTag =  document.createElement("p");
            priceTag.textContent = `Bundle Price: $${bundles[i].price}`;
            let dateTag =  document.createElement("p");
            dateTag.textContent = `Bundle Publish Date: ${bundles[i].bundle_date}`;
            let link  = document.createElement('a');
	    	let space = document.createElement('br');
	    	link.href = `http://localhost:3000/bundle/${bundles[i].bundleId}`;
	    	link.text = bundles[i].bundle_title;
	    	//adding an event listener button to buy a game only if user is logged in
            let btn = document.createElement("button");
            btn.textContent = "Buy Bundle";
            btn.value = `${bundles[i].bundleId}`;
			//btn.id = `${bundles[i].bundleId}`;
            //add event listener
            btn.onclick = buyBundle;
            newDiv.appendChild(link);
            newDiv.appendChild(priceTag);
            newDiv.appendChild(dateTag);
            newDiv.appendChild(btn);
            div.appendChild(newDiv);
    }
}


function buyBundle(event){
	let b = event.target;
	let info = {};
	info.bId = b.value;
	req = new XMLHttpRequest();
	req.onreadystatechange = function() {
		if(this.readyState==4 && this.status==200){
			alert("Bundle purchased!")
		}
		if(this.readyState==4 && this.status==403){
			alert(this.responseText);
		}
		if(this.readyState==4 && this.status==404){
			alert(`${this.responseText}`)
		}
		
	};			
	req.open("POST", `http://localhost:3000/buy`);
	req.setRequestHeader("Content-Type", "application/json");
	req.send(JSON.stringify(info));

}

function getClassData(){
	let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
		//If the response is available and was successful
		if (this.readyState == 4 && this.status == 200) {
			let responseObject = JSON.parse(xhttp.responseText);
			let options = document.getElementById("class");
			for(const x of responseObject){
				let element = document.createElement('option');
				element.value = x;
				element.text = x;
				options.appendChild(element);
			}
			//Update our page
            
		}
	};
	//Create the request
	xhttp.open("GET", "http://localhost:3000/cardClass", true);
        //send request
	xhttp.send();
}


function getAllBundleData(){
	let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
		//If the response is available and was successful
		if (this.readyState == 4 && this.status == 200) {
			let responseObject = JSON.parse(xhttp.responseText);
            cleanBundles();
			updateBundles(responseObject);
		}
	};
	//Create the request
	xhttp.open("GET", "http://localhost:3000/bundles", true);
        //send request
	xhttp.send();
}