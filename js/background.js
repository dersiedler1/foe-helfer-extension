/*
 * **************************************************************************************
 *
 * Dateiname:                 background.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       19.11.19, 09:44 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// trenne Code vom Globalen Scope
{

	chrome.runtime.onInstalled.addListener(() => {
		let version = chrome.runtime.getManifest().version;

		chrome.tabs.query({active: true, currentWindow: true}, (tabs)=> {
			// sind wir in FoE?
			if(tabs[0].url.indexOf('forgeofempires.com/game/index') > -1){

				// ja? dann neu laden
				if(!isDevMode()){
					chrome.tabs.reload(tabs[0].id);
				}
			}
		});

		if(!isDevMode()){

			// Sprache ermitteln
			let lng = chrome.i18n.getUILanguage();

			// is ein "-" drin? ==> en-en, en-us, en-gb usw...
			if(lng.indexOf('-') > -1){
				lng = lng.split('-')[0];
			}

			// Fallback auf "en"
			if(lng !== 'de' && lng !== 'en'){
				lng = 'en';
			}

			chrome.tabs.create({
				url: 'https://foe-rechner.de/extension/chrome?v=' + version + '&lang=' + lng
			});
		}
	});


	/**
	 * Sind wir im DevMode?
	 *
	 * @returns {boolean}
	 */
	function isDevMode()
	{
		return !('update_url' in chrome.runtime.getManifest());
	}


	let popupWindowId = 0;

	let ChatData = {
		innoCDNset: false,
		innoCDN: 'https://foede.innogamescdn.com/',
		player: /** @type {Record<string, {name: string, portrait: null|string}>} */({})
	};


	function handleWebpageRequests(request, sender, callback) {
		if (request.type === 'message') {
			let t = request.time,
				opt = {
					type: "basic",
					title: request.title,
					message: request.msg,
					iconUrl: "images/app48.png"
				};

			// Desktop Meldung zusammen setzen
			chrome.notifications.create('', opt, (id)=> {

				// nach definiertem Timeout automatisch entfernen
				setTimeout(()=> {chrome.notifications.clear(id)}, t);
			});

		} else if(request.type === 'chat'){

			let url = 'js/web/ws-chat/html/chat.html?player=' + request.player + '&name' + encodeURI(request.name) + '&guild=' + request.guild + '&world=' + request.world,
				popupUrl = chrome.runtime.getURL(url);

			// Prüfen ob ein PopUp mit dieser URL bereits existiert
			chrome.tabs.query({url:popupUrl}, (tab)=>{

				// nur öffnen wenn noch nicht passiert
				if(tab.length < 1){

					let o = {
						url: url,
						type: 'popup',
						width: 500,
						height: 520,
						focused: true
					};

					// Popup erzeugen
					let id = chrome.windows.create(o, (win)=> {
						popupWindowId = win.id;
					});

				// gibt es schon, nach "vorn" holen
				} else {
					chrome.windows.update(popupWindowId, {
						focused:true
					});
				}
			});

		} else if(request.type === 'storeData'){
			chrome.storage.local.set({ [request.key] : request.data });

		} else if(request.type === 'send2Api') {
			let xhr = new XMLHttpRequest();

			xhr.open('POST', request.url);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.send(request.data);
		} else if(request.type === 'setInnoCDN') {
			ChatData.innoCDNset = true;
			ChatData.innoCDN = request.url;
		} else if(request.type === 'getInnoCDN') {
			callback([ChatData.innoCDN, ChatData.innoCDNset]);
		} else if(request.type === 'setPlayerData') {
			ChatData.player[request.world+'-'+request.playerId] = {
				name: request.name,
				portrait: request.portrait
			};
		} else if(request.type === 'getPlayerData') {
			callback(ChatData.player[request.world+'-'+request.playerId]);
		}
	}

	/**
	 * Auf einen response von ant.js lauschen
	 */
	// @ts-ignore
	if (chrome.app) { // Chrome
		chrome.runtime.onMessageExternal.addListener(handleWebpageRequests);
	} else { // Firefox
	}
	chrome.runtime.onMessage.addListener(handleWebpageRequests);

	// ende der Trennung vom Globalen Scope
}
