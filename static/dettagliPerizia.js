$(document).ready(async function () {
	let _image = $(".image");
	let _content = $(".content");
	let _title = $(".title");
	let _dettagliPerizia = $("#dettagliPerizia");
	let _btnCancelPerizia = $("#btnCancelPerizia");



	let id = window.location.search.split("=")[1];
	console.log(id);
	_btnCancelPerizia.hide();

	await caricaGoogleMaps();
	await getPerizia(id);

	_btnCancelPerizia.on("click", async function () {
		window.location.href = "index.html";
	});

	function getPerizia(id) {
		let request = inviaRichiesta("POST", `/api/perizie/${id}`);
		request.catch(errore);
		request.then(async function (response) {
			$("<img>").prop("src", response.data.foto[0]).appendTo(_image).on("click", function () {
				let content = $("<div>").css("text-align", "center");
				$("<div>").css({"margin":"auto"}).appendTo(content);
				for (let foto of response.data.foto) {
					$("<img>").prop("src", foto).css({"width":"200px"}).appendTo(content);
				}
				$("<input>").prop({"disabled":true,"id":"commentoM","value":response.data.commento}).css({"width":"80%"}).appendTo(content);

				let sweetAlertOptions = {
					"title": `FOTO DELLA PERIZIA DI ${response.data.username}`,
					"showConfirmButton": true,
					"confirmButtonText": "OK",
					"width": 800,
					"html": content.html()
				}
				Swal.fire(sweetAlertOptions)
			});
			console.log(response);
			_title.text("PERIZIA DI: " + response.data.username);
			$("<div>").text(response.data.descrizione).appendTo(_content);

			//address//
			let lat = response.data.latitudine
			let lng = response.data.longitudine
			let latLng = new google.maps.LatLng(lat, lng);
			let geocoder = new google.maps.Geocoder();
			let address = await prendiAddress(geocoder, latLng);

			//table//
			let table = $("<table>").addClass("table table-striped").css("margin-top", "2%").appendTo(_dettagliPerizia);
			let thead = $("<thead>").appendTo(table);
			$("<tr>").append($("<th>").text("Id")).append($("<th>").text("Data")).append($("<th>").text("Ora")).append($("<th>").text("Address")).appendTo(thead);
			let tbody = $("<tbody>").appendTo(table);
			$("<tr>").append($("<td>").text(response.data._id)).append($("<td>").text(response.data.data)).append($("<td>").text(response.data.ora)).append($("<td>").text(address)).appendTo(tbody);
			
			_btnCancelPerizia.show();
		});
	}
	// function prendiImmagine() {
	// 	let rq = inviaRichiesta('POST', '/api/prendiImmagini');
	// 	rq.then(function (response) {
	// 		console.log(response);
	// 		$("<img>").prop("src", response.data.url).appendTo(_image);
	// 	});
	// 	rq.catch(errore);
	// }

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
});
