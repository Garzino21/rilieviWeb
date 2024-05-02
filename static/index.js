//Fossano, Via San Michele, 68
//permettere accesso solo a admin 
//prendere immagini giuste a seconda della perizia
//media query per qualche elemento della pagina
//utente admin non cancellabile

$(document).ready(async function () {

	let mappa;
	let strutture;
	let _logOut = $(".logOut");
	let _cercaUtente = $("#cercaUtente");
	let _submit = $("#submit");
	let _btnAdd = $("#btnAdd");
	let _creaUtente = $("#creaUtente");
	let _btnCancelUtente = $("#btnCancelUtente");
	let _btnCreaNuovoUtente = $("#btnCreaNuovoUtente");
	let _username = $("#username");
	let _mail = $("#mail");
	let _selectUtenti = $("#selectUtenti");
	let cerca = $("#btnCerca");
	let mapContainer = $(".mapContainer").get(0);
	let _mapPanel = $(".mapPanel").get(0);
	let _divMsg = $("#divMsg");
	let _apriDettagli = $("#apriDettagli");
	let _directions = $(".adp-directions").css("text-align", "center");



	if (_mapPanel) {
		_mapPanel.innerHTML = "";
		_mapPanel.style.display = "none";
	}



	_apriDettagli.prop("disabled", true);
	_apriDettagli.hide();
	_creaUtente.hide();

	await caricaUtenti();
	await caricaDropDown();
	await caricaGoogleMaps();

	creaMappa();

	_logOut.on("click", async function () {
		localStorage.removeItem("token")
		window.location.href = "login.html"
	});

	_apriDettagli.on("click", async function () {
		if (_mapPanel.style.display == "block") {
			_divMsg.show();
			_mapPanel.style.display = "none";
			_apriDettagli.text("Apri Dettagli Percorso");
		}
		else {
			_divMsg.hide();
			_mapPanel.style.display = "block";
			_apriDettagli.text("Chiudi Dettagli Percorso");
		}
	});

	_cercaUtente.on("input", async function () {

	});

	_btnAdd.on("click", async function () {
		_creaUtente.show();
	});

	_btnCancelUtente.on("click", async function () {
		_creaUtente.hide();
	});

	_selectUtenti.on("change", async function () {
		if (_selectUtenti.find(":selected").val() == 0) {
			caricaUtenti();
		}
		else {
			console.log(_selectUtenti.find(":selected").prop("name"));
			let id = _selectUtenti.find(":selected").prop("name");
			let rq = inviaRichiesta('POST', '/api/prendiUtente', { id });
			rq.then(function (response) {
				console.log(response);
				response.data = [response.data];
				tabellaUtenti(response);
			});
			rq.catch(errore);
		}
	});


	_btnCreaNuovoUtente.on("click", async function () {
		if (_username.val() == "" || _mail.val() == "") {
			swal("Inserire tutti i campi", "", "error");
		}
		else {
			let utente = { "name": _username.val(), "mail": _mail.val() };
			let rq = inviaRichiesta('POST', '/api/creaUtente', utente);
			rq.then(function (response) {
				console.log(response);
				response.data = [response.data];
				if (response.data == "") {
					swal("Utente non trovato", "", "error");
				}
				else {
					caricaUtenti();
					caricaDropDown();
					_creaUtente.hide();
					swal(`Utente ${_username.val()} creato`, "", "success");
				}
			});
			rq.catch(errore);
		}
	});



	_submit.on("click", async function () {
		let utente = _cercaUtente.val();
		console.log(utente);
		let rq = inviaRichiesta('POST', '/api/trovaUtente', { "utente": utente });
		rq.then(function (response) {
			console.log(response);
			response.data = [response.data];
			if (response.data == "") {
				swal("Utente non trovato", "", "error");
			}
			else
				tabellaUtenti(response);
		});
		rq.catch(errore);
	});

	cerca.on("click", async function () {
		_apriDettagli.show();
		_apriDettagli.prop("disabled", true);
		_apriDettagli.text("Apri Dettagli Percorso");
		_mapPanel.style.display = "none";
		_divMsg.show();
		_divMsg.text("");
		let position = await geocode("Fossano, Via San Michele, 68");
		let mapOptions = {
			"center": position,
			"zoom": 8,
			"styles": [{
				"featureType": "poi",
				"stylers": [{ "visibility": "off" }]
			}]
		}
		mappa = new google.maps.Map(mapContainer, mapOptions);

		await disegnaMarcatori(position);
		await disegnaQuartierGenerale(position);
	});

	async function creaMappa() {
		console.log(window.location.search);
		if (window.location.search != "") {
			let id = window.location.search.split("=")[1];
			console.log(id);
			let position = await geocode("Fossano, Via San Michele, 68");
			let mapOptions = {
				"center": position,
				"zoom": 8,
				"styles": [{
					"featureType": "poi",
					"stylers": [{ "visibility": "off" }]
				}]
			}
			mappa = new google.maps.Map(mapContainer, mapOptions);

			await disegnaMarcatoriId(id, position);
			await disegnaQuartierGenerale(position);
		}
	}

	async function disegnaQuartierGenerale(position) {
		let markerOptions = {
			"map": mappa,
			"center": position,
			"icon": "img/sede.png",
			"zoom": 8,
			"position": position,
			"title": "Quartiere Generale",
			// "label": { "fontSize": '12pt',}
		}

		let marker = new google.maps.Marker(markerOptions);
		var latLng = new google.maps.LatLng(position);
		mappa.panTo(latLng);

		marker.addListener("click", function () {
			showDettagliQuartierGenerale();
		});
	}


	async function disegnaMarcatoriId(id, position) {
		_apriDettagli.show();
		let rq = inviaRichiesta('POST', '/api/trovaPerizieId', { "username": id });
		rq.then(async function (response) {
			console.log(response);

			if (response.data == "") {
				await Swal.fire("Nessuna perizia caricata", "", "error");

				cerca.trigger("click");
				window.location.href = "index.html";
			}
			else {
				for (let perizia of response.data) {

					let markerOptions = {
						"map": mappa,
						"center": position,
						"zoom": 8,
						"position": { "lat": perizia.latitudine, "lng": perizia.longitudine },
						"title": perizia._id,
						// "label": { "fontSize": '12pt',}
					}

					let marker = new google.maps.Marker(markerOptions);
					let posArrivo = new google.maps.LatLng(perizia.latitudine, perizia.longitudine);
					//mappa.panTo(latLng);

					marker.addListener("click", function () {
						showDettails(perizia, position, posArrivo);
					});
				}
			}
		});
		rq.catch(errore);
	}

	async function disegnaMarcatori(position) {
		console.log("position" + position);
		let rq = inviaRichiesta('POST', '/api/trovaPerizie');
		rq.then(async function (response) {
			console.log(response);
			for (let perizia of response.data) {
				let markerOptions = {
					"map": mappa,
					"center": position,
					"zoom": 8,
					"position": { "lat": perizia.latitudine, "lng": perizia.longitudine },
					"title": perizia._id,
					// "label": { "fontSize": '12pt', "text": "PERIZIA" }	
				}

				let marker = new google.maps.Marker(markerOptions);
				let posArrivo = new google.maps.LatLng(perizia.latitudine, perizia.longitudine);
				//mappa.panTo(latLng);

				marker.addListener("click", function () {
					showDettails(perizia, position, posArrivo);
				});
			}
		});
		rq.catch(errore);

	}

	function caricaDropDown() {
		_selectUtenti.empty();
		$("<option>").text("Tutti").val("0").appendTo(_selectUtenti);
		let rq = inviaRichiesta('POST', '/api/perizie');
		rq.then(function (response) {
			for (let item of response.data) {
				$("<option>").text(item.idName).prop("name", item._id).appendTo(_selectUtenti);
			}
		});
		rq.catch(errore);
	}

	function caricaUtenti() {
		let rq = inviaRichiesta('POST', '/api/perizie');
		rq.then(function (response) {
			console.log(response.data);
			tabellaUtenti(response);
		});
		rq.catch(errore);
	}

	function tabellaUtenti(response) {
		$("#tbodyUtenti").empty();
		for (let utente of response.data) {
			let tr = $("<tr>").appendTo($("#tbodyUtenti"));
			$("<td>").text(utente._id).appendTo(tr);
			$("<td>").text(utente.idName).appendTo(tr);
			$("<td>").text(utente.username).appendTo(tr);
			let td = $("<td>").appendTo(tr);
			$("<img>").prop("src", `img/maps.png`).appendTo(td).css({ "width": "25px", "heigt": "25px" }).on("click", async function () {

				window.location.href = `index.html?id=${utente.username}`;
				let position = await geocode("Fossano, Via San Michele, 68");
				let mapOptions = {
					"center": position,
					"zoom": 10,
					"styles": [{
						"featureType": "poi",
						"stylers": [{ "visibility": "off" }]
					}]
				}
				mappa = new google.maps.Map(mapContainer, mapOptions);
			});
			td = $("<td>").appendTo(tr);
			$("<img>").prop("src", `img/elimina.png`).appendTo(td).css({ "width": "25px", "heigt": "25px" }).on("click", function () {
				swal({
					title: `sei sicuro di voler cancellare ${utente.idName}?`,
					text: "una volta cancellato non potrai più recuperarlo!",
					icon: "warning",
					buttons: true,
					dangerMode: true,
				})
					.then((willDelete) => {
						if (willDelete) {
							let request = inviaRichiesta("DELETE", `/api/utenti/${utente._id}`);
							request.catch(errore);
							request.then(function (response) {
								swal(`${utente.idName} è stato cancellato con successo`, {
									icon: "success",
								});
								caricaUtenti();
								caricaDropDown();
							});

						} else {
							swal(`${utente.idName} non è stato cancellato`);
						}
					});

			});

		}
	}

	function showDettagliQuartierGenerale() {
		let testo = "TechSolutions Innovations un'azienda all'avanguardia nel settore della tecnologia e dell'innovazione. Fondata nel 2010 da un team di esperti provenienti dalle migliori università e società tech del mondo, TechSolutions si è rapidamente affermata come leader globale nel fornire soluzioni innovative per le sfide tecnologiche più complesse.Specializzata nello sviluppo di software su misura, applicazioni mobile, intelligenza artificiale e soluzioni di analisi dati, TechSolutions si distingue per la sua capacità di fornire prodotti e servizi di altissima qualità, personalizzati per soddisfare le esigenze specifiche dei clienti.";
		let content = `<div><p>${testo}</p></div>`;
		let sweetAlertOptions = {
			"title": "Quartiere Generale",
			"showCloseButton": true,
			"width": 800,
			"icon": "info",
			"html": content
			//"html": content
		}
		Swal.fire(sweetAlertOptions);
	}

	async function showDettails(perizia, position, posArrivo) {
		let lat = perizia.latitudine
		let lng = perizia.longitudine
		let latLng = new google.maps.LatLng(lat, lng);
		let geocoder = new google.maps.Geocoder();

		console.log("latitudine" + lat + "longitudine" + lng);

		let address = await prendiAddress(geocoder, latLng);
		console.log("address " + address);

		let content = $("<div>");
		$("<button>").text("VISUALIZZA DETTAGLI").addClass("btn btn-primary").prop({"id":"btnn", "value":perizia._id}).appendTo(content);
		let table = $("<table>").addClass("table table-striped").css("margin-top", "2%").appendTo(content);
		let thead = $("<thead>").appendTo(table);
		$("<tr>").append($("<th>").text("id")).append($("<th>").text("Data")).append($("<th>").text("Address")).appendTo(thead);
		let tbody = $("<tbody>").appendTo(table);
		$("<h2>").text(`Descrizione`).appendTo(content);
		$("<p>").text(perizia.descrizione).appendTo(content);
		$("<tr>").append($("<td>").text(perizia._id)).append($("<td>").text(perizia.data)).append($("<td>").text(address)).appendTo(tbody);

		let sweetAlertOptions = {
			"title": `Perizia di ${perizia.username}`,
			"showCancelButton": true,
			"showCloseButton": true,
			"showDenyButton": true,
			"denyButtonText": "MODIFICA PERIZIA",
			"denyButtonColor": "#9da8cd",
			"confirmButtonText": "TRACCIA PERCORSO",
			"cancelButtonText": "CHIUDI",
			"width": 800,
			"html": content.html()
		}
		Swal.fire(sweetAlertOptions).then(function (results) {
			if (results.isConfirmed) {
				let posPartenza = position;
				console.log("posArrivo" + posArrivo);
				disegnaPercorsoSingolo(posPartenza, posArrivo, mapContainer);
			}
			else if (results.isDenied) {
				window.location.href = `modificaPerizia.html?id=${perizia._id}`;
			}
		});
	}
	
	$(document).on("click","#btnn",function(){
		window.location.href = `dettagliPerizia.html?id=${$(this).prop("value")}`;
	})

	function prendiAddress(geocoder, latLng) {
		return new Promise(function (resolve, reject) {
			geocoder.geocode({
				'latLng': latLng
			}, function (results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					if (results[0]) {
						resolve(results[0].formatted_address);
					} else {
						resolve('No results found');
					}
				} else {
					reject('Geocoder failed due to: ' + status);
				}
			});
		});

	}

	function disegnaPercorsoSingolo(partenza, arrivo, mapContainer) {
		_apriDettagli.prop("disabled", false);
		let routeOptions = {
			'origin': partenza,
			'destination': arrivo,
			'travelMode': google.maps.TravelMode.DRIVING,
			'provideRouteAlternatives': false,
			'avoidTolls': false
		}
		let directionsService = new google.maps.DirectionsService()
		let promise = directionsService.route(routeOptions)

		promise.then((result) => {
			if (result.status == google.maps.DirectionsStatus.OK) {
				console.log(result.routes[0])
				let mapOptions = {}
				let map = new google.maps.Map(mapContainer, mapOptions)
				let rendererOptions = {
					'polylineOptions': {
						'strokeColor': '#44F', //Colore percorso
						'strokeWeight': 6,		//Spessore percorso
						//'zIndex':100					//Livello di posizionamento
					}
				}
				let directionsRenderer = new google.maps.DirectionsRenderer(rendererOptions)
				directionsRenderer.setMap(map)
				//Tracciamento del percorso
				directionsRenderer.setDirections(result)
				//Visualizzazione dettagli
				_mapPanel.innerHTML = ""
				directionsRenderer.setPanel(_mapPanel)
				//Calcolo distanza e tempo
				let distanza = result.routes[0].legs[0].distance.text
				let tempo = result.routes[0].legs[0].duration.text
				_divMsg.html("Distanza: " + distanza + "<br> Tempo di percorrenza: " + tempo)
			}

		});
	}
});