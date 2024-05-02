"use strict";

const _URL = ""
const MAPS_URL = "https://maps.googleapis.com/maps/api"
const JSONSERVER_URL = "http://localhost:3000"
const MAP_KEY = "AIzaSyBZKYgxbiyRE7DknUpnRP2QHCBVjvLgH7g";

// Se vuota viene assegnata in automatico l'origine da cui è stata scaricata la pagina

// Configurazione degli interceptors di axios
axios.interceptors.request.use((config) => {
	let token = localStorage.getItem("token");
	if (token) {
		console.log(`Token sent: ${token}`);
		config.headers["authorization"] = token;
	}
	return config;
});

axios.interceptors.response.use((response) => {
	let token = response.headers["authorization"];
	console.log(`Token received: ${token}`);
	localStorage.setItem("token", token);
	return response;
});

function inviaRichiesta(method, url, parameters = {}) {
	let config = {
		"baseURL": _URL,
		"url": url,
		"method": method.toUpperCase(),
		"headers": {
			"Accept": "application/json",
		},
		"timeout": 15000,
		"responseType": "json",
	}

	if (parameters instanceof FormData) {
		config.headers["Content-Type"] = 'multipart/form-data;'
		config["data"] = parameters     // Accept FormData, File, Blob
	}
	else if (method.toUpperCase() == "GET") {
		config.headers["Content-Type"] = 'application/x-www-form-urlencoded;charset=utf-8'
		config["params"] = parameters
	}
	else {
		config.headers["Content-Type"] = 'application/json; charset=utf-8'
		config["data"] = parameters
	}
	return axios(config)
}

function errore(err) {
	if (!err.response)
		alert("Connection Refused or Server timeout");
	else if (err.response.status == 200)
		alert("Formato dei dati non corretto : " + err.response.data);
	else if (err.response.status == 403) {
		alert("Sessione scaduta");
		window.location.href = "login.html"	
	}
	else {
		alert("Server Error: " + err.response.status + " - " + err.response.data);
	}
}


//MAPS


function caricaGoogleMaps(){
	let promise =  new Promise(function(resolve, reject){
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = MAPS_URL + '/js?v=3&key=' + MAP_KEY;
		document.body.appendChild(script);
		script.onload = resolve;  // onload non inietta alcun dato
		script.onerror = function (){
		    reject("Errore caricamento GoogleMaps")
		}
	})
	return promise
}

function geocode(address) {
	let promise = new Promise(function(resolve, reject) {
		let geocoder = new google.maps.Geocoder();
		//let option = {"address": address};
		let option = {address};
		geocoder.geocode(option, function(results, status) {
			if(status  == google.maps.GeocoderStatus.OK)
			{
				let position = results[0].geometry.location;
				// No RETURN perchè si è dentro una CALLBACK
				//return position;
				resolve(position);
			}
			else
			{
				reject("Indirizzo non valido");
			}
		});
	});
	return promise;
}

function disegnaPercorsoSingolo(posPartenza, posArrivo, mapContainer) {
	let routeOptions = {
		"origin": posPartenza,
		"destination": posArrivo,
		"travelMode": google.maps.TravelMode.DRIVING,
		"provideRouteAlternatives": false,
		"avoidTolls": false
	}
	let directionsService = new google.maps.DirectionsService();
	let promise = directionsService.route(routeOptions);
	promise.then((result) => {
		if(result.status == google.maps.DirectionsStatus.OK)
		{
			console.log(result.routes[0]);
			let mapOptions = {};
			let map = new google.maps.Map(mapContainer, mapOptions);
			let rendererOptions = {
				"polylineOptions": {
					"strokeColor": "#44F", //Colore percorso
					"strokeWeight": 6,		//Spessore percorso
					//'zIndex':100					//Livello di posizionamento
				}
			}
			let directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions);
			directionsRenderer.setMap(map);
			//Tracciamento del percorso
			directionsRenderer.setDirections(result);
			//Calcolo distanza e tempo
			let distanza = result.routes[0].legs[0].distance.text;
			let tempo = result.routes[0].legs[0].duration.text;
			setTimeout(function() {
				Swal.fire("TEMPO: " + tempo + "\nDISTANZA: " + distanza)
			}, 2000);
		}
	}).catch((err) => {
		console.log(err);
		alert("Errore: " + err.message);
	})
}
