/* Envia o formulário sem recarregar a página. Sem JS, o formulário continua a funcionar via admin-post.php. */
(function () {
	'use strict';

	document.addEventListener('submit', function (event) {
		var form = event.target.closest && event.target.closest('.nlfp__form');
		if (!form || typeof window.fetch !== 'function') return;

		event.preventDefault();

		var msg = form.querySelector('.nlfp__msg');
		var btn = form.querySelector('.nlfp__btn');

		function show(text, ok) {
			msg.textContent = text;
			msg.classList.toggle('is-success', ok);
			msg.classList.toggle('is-error', !ok);
		}

		btn.disabled = true;
		form.classList.add('is-loading');

		fetch(window.nlfpData.ajaxUrl, {
			method: 'POST',
			body: new FormData(form),
			credentials: 'same-origin'
		})
			.then(function (res) { return res.json(); })
			.then(function (json) {
				show(json.data && json.data.message ? json.data.message : window.nlfpData.messages.error, !!json.success);
				if (json.success) form.reset();
			})
			.catch(function () {
				show(window.nlfpData.messages.error, false);
			})
			.finally(function () {
				btn.disabled = false;
				form.classList.remove('is-loading');
			});
	});
})();
