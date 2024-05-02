$(document).ready(async function () {
	let _idPerizia = $("#idPerizia")
	let _usernamePerizia = $("#usernamePerizia")
	let _dataPerizia = $("#dataPerizia")
	let _descrizionePerizia = $("#descrizionePerizia")
	let _oraPerizia = $("#oraPerizia")
	let _btnAggiornaPerizia = $("#btnAggiornaPerizia")
	let _btnCancelPerizia = $("#btnCancelPerizia")

	let id = window.location.search.split("=")[1];
	console.log(id);

	await getPerizia(id);

	function getPerizia(id) {
		let request = inviaRichiesta("POST", `/api/perizie/${id}`);
		request.catch(errore);
		request.then(function (response) {
			console.log(response.data);
			_idPerizia.val(id);
			_usernamePerizia.val(response.data.username);
			_dataPerizia.val(response.data.data);
			_descrizionePerizia.val(response.data.descrizione);
			_oraPerizia.val(response.data.ora);
		});
	}

	_btnAggiornaPerizia.on("click", function () {
		let request = inviaRichiesta("POST", `/api/aggiornaPerizia/${id}`, {
			"username": _usernamePerizia.val(),
			"data": _dataPerizia.val(),
			"descrizione": _descrizionePerizia.val(),
			"ora": _oraPerizia.val()
		});
		request.catch(errore);
		request.then(async function (response) {
			console.log(response.data);
			await swal("Perizia aggiornata", "Perizia aggiornata con successo", "success");
			window.location.href = "index.html";
		});
	});

	_btnCancelPerizia.on("click", async function () {
		await swal("operazione annullata", "nessuna modifica effettuata", "error");
		window.location.href = "index.html";
	});
});
