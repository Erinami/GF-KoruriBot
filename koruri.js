var Discord = require("discord.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var bot = new Discord.Client();
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var im = require('imagemagick');
const downloader = require('image-downloader');
var wait = require('wait.for');
var fs = require("fs");
// ---------------------------------------- Variable-List Information ------------------------------
var idleArray = [
				"What do you think you're doing?", 
				"Are you trying to say I'm short!?", 
				"Who do you think I am... geez.", 
				"I'll forgive you because I feel good today. It's a special occasion.", 
				"Are you... trying to pick a fight?"
			];

var emojiNames = [
				"akari",
				"bath",
				"birthday",
				"blank",
				"bye",
				"chloe",
				"confuse",
				"congrats",
				"creamsoft",
				"depressed",
				"fail",
				"fatcat",
				"fight",
				"filenames",
				"ganbaru",
				"good",
				"happy",
				"happy2",
				"howsthis",
				"late",
				"lazy",
				"letsgo",
				"loveyou",
				"morning",
				"no",
				"ok",
				"otsukare",
				"panic",
				"peek",
				"please",
				"pout",
				"rock",
				"sad",
				"sad2",
				"search",
				"shake",
				"shock",
				"sleep",
				"smelly",
				"somekanjis",
				"sorry",
				"sunset",
				"surprise",
				"surprise2",
				"team",
				"teretere",
				"thanks",
				"tired",
				"understood",
				"welcome"
			];

// global variables for previously crawled gfkari cards of the same session (no persistance)
var gacha_cards = [];
var event_cards = [];

// global variables for text channels
var testing_channel = null;
var gfkari_channel = null;
var botspam_channel = null;

// global life counter
var global_counter = 0;
var global_start = false;

// cookie data - provide P token, N token, AS_USER_CHECK, gameAuthID, gf-dynalyst-login
var cookie = "sensitive information redacted";

// function for retrying requests for the 'updatecards' functions
function retryAmebaRequest(bot, msg, type, url, attempts, verbose, errmsg, requestFunction) {
	console.log(errmsg);
	// if less than 3 attempts, retry
	if (attempts < 3) {
		console.log("Retrying...");
		var xhrretry = new XMLHttpRequest();
		xhrretry.setDisableHeaderCheck(true);
		xhrretry.open('GET', url);

		// set auth cookies, and user-agent header to mimic google chrome
		xhrretry.setRequestHeader("Cookie", cookie);
		xhrretry.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")

		// send request, and link callback
		xhrretry.send();
		xhrretry.onreadystatechange = function() {
	    	requestFunction(bot, msg, xhrretry, type, url, attempts + 1, verbose);
		}; 
	} else { // else, send an error message to discord if verbose
		if (verbose) {
			msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
		}
	}
}

function checkCards(bot, msg, args, type, verbose) {
	try {
		// get the current dummy account's card page, so we can get the link to the current events page
		var xhr = new XMLHttpRequest();
		xhr.setDisableHeaderCheck(true);
		if (type === 'event') {
			xhr.open('GET', "http://vcard.ameba.jp/card");
		} else if (type === 'gacha') {
			xhr.open('GET', "http://vcard.ameba.jp/cupid");
		} else {
			msg.channel.sendMessage("Whoops, an error occurred! This one is probably Erina's fault.");
			console.log('ERROR: Invalid type given: ' + type);
		}
		
		// set auth cookies, and user-agent header to mimic google chrome
		xhr.setRequestHeader("Cookie", cookie);
		xhr.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")

		// send request, and link callback
		xhr.send();
		if (type === 'event') {
			xhr.onreadystatechange = function() {
	        	crawlMainCards(bot, msg, xhr, type, 'http://vcard.ameba.jp/card', 0, verbose);
	    	};    
		} else {
			xhr.onreadystatechange = function() {
	        	crawlCardImages(bot, msg, xhr, type, 'http://vcard.ameba.jp/cupid', 0, verbose);
	    	};    
		}
		
	} catch (e) {
		console.log(e);
		if (verbose) {
			msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
		}
	}
}

// crawl the dummy account's card page to get the event URL
function crawlMainCards(bot, msg, xhr, type, url, attempts, verbose) {
	// on success, get the source of the page and process it with xpath
	if (xhr.readyState == 4 && xhr.status == 200) {
		try {
			// get response body, and set up dom for xpath
			var body = xhr.responseText;
			var doc = new dom().parseFromString(body);

			// get the url for the event
			var event_nodes = xpath.select("//li[contains(@class, 'event')]/a/@href", doc);
			if (event_nodes.length >= 1) { // successfully found URL, now let's go crawl that page
				var event_url = "http://vcard.ameba.jp" + event_nodes[0].value;
				// get the current dummy account's card page, so we can get the link to the current events page
				var xhrevent = new XMLHttpRequest();
				xhrevent.setDisableHeaderCheck(true);
				xhrevent.open('GET', event_url);

				// set auth cookies, and user-agent header to mimic google chrome
				xhrevent.setRequestHeader("Cookie", cookie);
				xhrevent.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")

				// send request, and link callback
				xhrevent.send();
				xhrevent.onreadystatechange = function() {
		        	crawlCardImages(bot, msg, xhrevent, type, event_url, 0, verbose);
		    	}; 

			} else { // otherwise, we're likely not authenticated
				retryAmebaRequest(bot, msg, type, 'http://vcard.ameba.jp/cards', attempts, verbose, 'ERROR: xpaths for crawlMainCards failed, likely due to invalid credentials.', crawlMainCards);
			}

		} catch (e) {
			retryAmebaRequest(bot, msg, type, 'http://vcard.ameba.jp/cards', attempts, verbose, e, crawlMainCards);
		}

	} else if (xhr.status != 200 && xhr.readyState == 4) {
		console.log(xhr.status);
		retryAmebaRequest(bot, msg, type, 'http://vcard.ameba.jp/cards', attempts, verbose, 'ERROR: XMLHttpRequest for crawlMainCards failed.', crawlMainCards);
	}
}

// crawl for images of cards from the target URL
function crawlCardImages(bot, msg, xhr, type, url, attempts, verbose) {
	if (xhr.readyState == 4 && xhr.status == 200) {
		try {
			// get response body, and set up dom for xpath
			var body = xhr.responseText;
			var doc = new dom().parseFromString(body);

			// get all card images
			var cards_preprocessing = xpath.select("//div[contains(@class, 'relative')]/img[@width=320 and @height=400]/@src", doc);
			if (cards_preprocessing.length >= 1) { // successfully found URL, now send requests to download the images

				// do some preprocessing to the card images loop - get rid of certain card names because they, for some reason, always seem to appear
				var cards = [];
				for (var i = 0; i < cards_preprocessing.length; i++) {
					card_image_name = cards_preprocessing[i].value;
					if (card_image_name.indexOf('4def240876ade0979827de23be7f1c84') == -1 && card_image_name.indexOf('b7d7b72883b5dffbdaae5051aaab607d.jpg') == -1 && card_image_name.indexOf('9a83bb090149c8237fefee916c4e681d.jpg') == -1) {
						cards.push(card_image_name);
					}
				}

				var images = 0;
				var updated = false;
				// send request to card images to download them
				for (var i = 0; i < cards.length; i++) {
					// do a check to see if this card has been seen before - if not, then the set needs to be updated
					if (type === 'event' && event_cards.indexOf(cards[i]) == -1 || type === 'gacha' && gacha_cards.indexOf(cards[i]) == -1) {
						updated = true;
					}
					// get current time in millis for card image name storing
					var d = new Date();
					var time = d.getTime();

					// save card images to local directory
					var name = i.toString() + type + cards[i].substring(cards[i].length - 4, cards[i].length);
					var options = {
						url: cards[i],
						dest: 'cards/' + name
					}

					downloader.image(options).then(({filename, image}) => {
						// upon download finish, call a helper function
				        console.log('File saved to', filename)

				        // update number of images that have been saved so far
				        images = images + 1;

				        // if we've finished downloading all the images to do, we need to combine them using imagemagick
				        if (images >= cards.length) {
				        	if (updated) { // become verbose if new information is seen, and update last seen cards
				        		verbose = 1;
				        		if (type === 'event') {
				        			event_cards = []
				        			for (var z = 0; z < cards.length; z++) {
				        				event_cards.push(cards[z])	
			        				}
				        		} else {
				        			gacha_cards = []
				        			for (var z = 0; z < cards.length; z++) {
				        				gacha_cards.push(cards[z])	
			        				}
				        		}
				        		console.log("NEW UPDATE");
				        	}
				        	// combine images using imagemagick
							var im_array = [];
							for (var i = 0; i < cards.length; i++) {
								im_array.push('cards/' + i.toString() + type + cards[i].substring(cards[i].length - 4, cards[i].length));
							}
							im_array.push("+append");
							im_array.push(time.toString() + ".jpg")
							im.convert(im_array, function(err, stdout) {
								if (err) {
									msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
									console.log(err);
									return;
								}

								// sends the newly created image as well as a description after successful conversion
								if (verbose) {
									if (type === 'event') {
										if (updated) {
											msg.channel.sendMessage("Event information has been updated!")
										}
										msg.channel.sendMessage("Here are the current event cards:")
									} else {
										if (updated) {
											msg.channel.sendMessage("Gacha information has been updated!")
										}
										msg.channel.sendMessage("Here are the current gacha cards:")
									}
									msg.channel.sendFile(time.toString() + ".jpg");
								}
							
							});
				        }
					}).catch((err) => {
						throw err
					})
				}
			} else { // otherwise, we're likely not authenticated
				retryAmebaRequest(bot, msg, type, url, attempts, verbose, 'ERROR: xpaths for crawlCardImages failed, likely due to invalid credentials.', crawlCardImages);
			}

		} catch (e) {
			retryAmebaRequest(bot, msg, type, url, attempts, verbose, e, crawlCardImages);
		}

	} else if (xhr.status != 200 && xhr.readyState == 4) {
		retryAmebaRequest(bot, msg, type, url, attempts, verbose, 'ERROR: XMLHttpRequest for crawlCardImages failed.', crawlCardImages);
	}
}

// -------------------- Commands -------------------------
var commands = {
	".msgclassdebug": {
		description: "Outputs log information about the message being sent to the server. Practically no use, unless you're Erina.",
		usage: "To use: `.msgclassdebug <additional parameters ignored>`",
		image: null,
		action: function(bot, msg, args) {
			console.log(msg);
			msg.channel.sendMessage("I've printed the stuff to console.");
			msg.channel.sendMessage("Let's go check it out! Hurry hurry!");
		}
	},
	".cardroll": {
		description: "Displays a random card image. You can optionally supply probability values for each rarity (they must sum up to 1.0).",
		usage: "To use: `.cardroll (platinum-ticket OR hr-sr10-ticket) OR (N_Probability=## HN_Probability=## R_Probability=## HR_Probability=## SR_Probability=## SSR_Probability=## UR_Probability=##)" + 
				"AND/OR (girl_name=<name_of_girl>)` \n Given probabilities must sum to 1.0. Make sure to replace spaces with '%20'.",
		image: null,
		action: function(bot, msg, args) {
	    	try {
	    		// maps user input fields to json keys to be sent in the request
	    		var validArguments = ['N_Probability', 'HN_Probability', 'R_Probability', 'HR_Probability', 'SR_Probability', 'SSR_Probability', 'UR_Probability', 'girl_name', 'girl_age', 'girl_blood', 'girl_horoscope', 'girl_weight', 'girl_waist', 'girl_attribute', 'girl_height', 'girl_hip', 'girl_bust']
	    		var validArgumentsTranslated = ['N_Probability', 'HN_Probability', 'R_Probability', 'HR_Probability', 'SR_Probability', 'SSR_Probability', 'UR_Probability', 'girl_name_official_eng', 'girl_age', 'girl_blood', 'girl_horoscope_eng', 'girl_weight', 'girl_waist', 'girl_attribute', 'girl_height', 'girl_hip', 'girl_bust']
	    		var validArgumentsType = ['numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'string', 'numeric', 'string', 'string', 'numeric', 'numeric', 'string', 'numeric', 'numeric', 'numeric']
	    		dict = {};

	    		// loops through all arguments that the user has provided
	    		for (x in args) {
	    			var arg = args[x];
	    			// looks for a equals sign to split upon (key and value)
	    			if (arg.indexOf('=') > -1) {
	    				var split = arg.split("=");
	    				if (validArguments.indexOf(split[0]) > -1) {
	    					var index = validArguments.indexOf(split[0]);
	    					var value = split[1];
	    					// looks for a colon to see what kind of comparison operator it is
	    					var operator = "";
	    					if (value.indexOf(':') > -1) { 
	    						var valueSplit = value.split(':');
	    						value = valueSplit[1];
	    						operator = valueSplit[0];
	    					}
	    					// makes sure numeric fields are given numeric values
	    					if (validArgumentsType[index] == 'numeric') {
	    						if (isNaN(value)) {
	    							continue;
	    						}
	    					} 
	    					// check for the comparator to be used
	    					if (operator == 'lt') {
	    						value = 'lt::' + value;
	    					} else if (operator == 'gt') {
	    						value = 'gt::' + value;
	    					} else if (operator == 'eq') {
	    						value = 'eq::' + value;
	    					} else if (validArgumentsType[index] == 'string') {
	    						value = 'lk::' + value;
	    					}

    						dict[validArgumentsTranslated[index]] = value;
    					}
	    				
	    			}
	    		}

	    		// appends request parameters to the end of the url
	    		var url = "http://api.gfkari.com/api/random/card"
	    		if (Object.keys(dict).length > 0) {
	    			url = url + "?";
	    			var counter = 0;
	    			for (key in dict) {
	    				value = dict[key];
	    				url = url + key + "=" + value;
	    				counter = counter + 1;
	    				if (counter < Object.keys(dict).length) {
	    					url = url + '&';
	    				}
	    			}
	    		}

	    		// send request
				var xhr = new XMLHttpRequest();
				xhr.open('GET', url);
				xhr.send();
				xhr.onreadystatechange = checkCardRequest;
				function checkCardRequest(err) {
					if (err) {
						msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
	    				console.log(err);
	    				return;
					}

					try {
						if (xhr.readyState == 4 && xhr.status == 200) {
							// get card number from response headers
							var cardNumber = xhr.getResponseHeader("Card_Number");
							// upload picture of card from direct link rather than sending the result of the random roll
							msg.channel.sendFile("http://api.gfkari.com/api/cards/picture/" + cardNumber, 'card.jpg', 'Card Number: ' + cardNumber + '.');
						} else if (xhr.status != 200 && xhr.readyState == 4) {
							msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
							console.log("ERROR: Randomized cardroll response state was not successful.")
						} else {
						}
					} catch (e) {
						msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
						console.log("ERROR: XMLHttpRequest for checkCardRequest was not successful.")
					}
				}
	    	} catch (e) {
	    		msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
	    		console.log(e);
	    	}
		}
	},
	".setattribute": {
		description: "Gives the user that sent the command a role that matches one of Girlfriend Kari's attributes (SWEET, COOL, POP). A few girls of respective rarities are shown in the image below.",
		usage: "To use: `.setattribute <sweet/pop/cool>`",
		image: "redacted",
		action: function(bot, msg, args) {
			try {
				// gets user that sent the message
				var member = msg.member;
				// a role must be specified
				if (args.length < 2) {
					msg.channel.sendMessage(member + " You need to specify the attribute you want to change to!");
				} else {
					// case insensitve check to sweet, cool, and pop
					var type = args[1].toUpperCase();
					if (type === "SWEET" || type === "COOL" || type === "POP") {
						//finds the role
						var role = msg.guild.roles.find("name", type);
						// makes sure member doesn't already have the role
						if (msg.member.roles.has(role.id)) {
							msg.channel.sendMessage(member + " You already have this attribute!");
						} else {
							// gets the three roles we're comparing too
							var sweet = msg.guild.roles.find("name", "SWEET");
							var pop = msg.guild.roles.find("name", "POP");
							var cool = msg.guild.roles.find("name", "COOL");

							// remove the roles if the user has them
							if (member.roles.has(sweet.id)) {
								member.removeRole(sweet);
							}
							if (member.roles.has(pop.id)) {
								member.removeRole(pop);
							}
							if (member.roles.has(cool.id)) {
								member.removeRole(cool);
							}

							// add the new specified role
							member.addRole(role);

							// give a response based on the role added
							msg.channel.sendMessage(member + " You now have the " + role.name + " role!");
						}
					} else {
						msg.channel.sendMessage(member + " The only valid attributes are sweet, cool, and pop! You should know that by now!");
					}
				}
			} catch (e) {
				msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
	    		console.log(e);
			}
		}
	},
	".updateeventcards": {
		description: "Updates and returns the cards available in the current event in Girlfriend Kari.",
		usage: "To use: `.updateeventcards",
		image: null,
		action: function(bot, msg, args) {
			checkCards(bot, msg, args, "event", true);
		}
	},
	".updategachacards": {
		description: "Updates and returns the cards available in the current gacha in Girlfriend Kari.",
		usage: "To use: `.updategachacards",
		image: null,
		action: function(bot, msg, args) {
			checkCards(bot, msg, args, "gacha", true);
		}
	},
	".choose": {
		description: "Have Koruri pick a choice from a set of user-provided options.",
		usage: "To use: `.choose <option_1>, <option_2>, <option_3>, ...",
		image: null,
		action: function(bot, msg, args) {
			try {
				// rejoins the strings after the command with a space
				var new_string = "";
				for (var x = 1; x < args.length; x++) {
					new_string = new_string + args[x] + " ";
				}
				new_string = new_string.trim();
				
				// splits based on comma
				var choices = new_string.split(",");

				// preprocess - make sure all the choices aren't the same!
				var no_options = true;
				for (var c = 1; c < choices.length; c++) {
					if (choices[0].trim() !== choices[c].trim()) {
						no_options = false;
						break;
					}
				}
				if (no_options) {
					msg.channel.sendMessage("I don't really have a choice...");
				} else {
					// chooses a random choice
					var min = 0;
					var max = choices.length;
					var index = Math.floor(Math.random() * (max - min)) + min;

					// make sure the choice selected doesn't have profanity - koruri needs to stay pure!
					// integrate with some sort of other english-dictionary or nlp library in the future?
					if (new RegExp( '\\b(put|your|blocked|profanity|choices|here)\\b', 'i').test(choices[index])) {
						msg.channel.sendMessage("I don't really like this choice.");
					} else if (new RegExp( '\\b(koruri)\\b', 'i').test(choices[index])) {
						msg.channel.sendMessage("Are you talking about me?");
					} else {
						msg.channel.sendMessage(choices[index]);
					}
				}
			} catch (e) {
				msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
				console.log(e);
			}
		}
	}, 
	".ask": {
		description: "Ask Koruri about the future, and she'll tell you the chances of it happening! Similar to an 8-ball.",
		usage: "To use: `.ask <question_content>",
		image: null,
		action: function(bot, msg, args) {
			try {
				var choices_8ball = ["Definitely", "Yes", "Probably", "Maybe", "Probably not", "No", "Definitely not", "Ask again later"];
				var index = Math.floor(Math.random() * (8 - 0) + 0);
				msg.channel.sendMessage(choices_8ball[index]);
			} catch (e) {
				msg.channel.sendMessage("Whoops, an error occurred! It's not my fault... I think?");
				console.log(e);
			}
		}
	}
}

// ---------------- Actual Content ----------------------

bot.on("message", msg => {

	// --------------------------------- Begin Message Listening ------------------------------------------

	// check if user mentioned koruri
    if (msg.isMentioned(bot.user)) {
    	var rand = Math.floor(Math.random() * idleArray.length);
    	try {
    		var sections = msg.content.split(" ");
    		var section = msg.content.split(" ")[1];
    		if (section === "poke") {
    			msg.channel.sendMessage(idleArray[rand]);
    		} else {
    			msg.channel.sendMessage("I don't understand what you're saying!");
    		}
    	} catch (e) {
    		msg.channel.sendMessage("Yes?")
    	}

	// now check for commands (as seen in the commands array above)
    } else if (msg.content.startsWith(".")) {

		try {
			var sections = msg.content.split(" ");
			// check if command is valid
			if (commands[sections[0]]) {
				if (sections.length >= 2 && sections[1] == "help") {
					var command = commands[sections[0]];
					msg.channel.sendMessage(command.description);
					msg.channel.sendMessage(command.usage);
					if (command.image != null) {
						msg.channel.sendFile(command.image);
					}
				} else {
					command = commands[sections[0]];
					command.action(bot, msg, sections);
				}
			}
		} catch (e) {
			// something broke, lets log the error
			msg.channel.sendMessage("Something broke! The error has been logged.");
			console.log(e);
		}

	// now check for emojis
	} else if (msg.content.indexOf(":") > -1) { 
		try {
			sections = msg.content.split(":");
			for (index = 0; index < sections.length; index++) {
				var section = sections[index];
				if (emojiNames.indexOf(section) > -1) { // found a match, send the emoji
					msg.channel.sendFile("http://emoji.gfkari.com/images/emojis/" + section + ".png", section + '.png');
				}
			}
		} catch (e) {
			console.log(e);
		}
	}
	
});

bot.on('ready', () => {
	console.log("I'm ready to go! Let me at 'em!");
	testing_channel = bot.channels.get('redacted');
	gfkari_channel = bot.channels.get('redacted');
	botspam_channel = bot.channels.get('redacted');
	global_start = true;
});

bot.login("BOT TOKEN GOES HERE");

// you're gonna need to spin up a different server to do this stuff
// don't want current server to get ip banned, after all
// following code contains sensitive information, not included here

// bot busy loop for gfkari channel here
if (global_start) {
	// periodically check for updates to event/gacha cards
}

// bot busy loop for notification server crawling here - this should probably be moved to a different bot.
if (global_start) {
	// periodically check for new tweets by PAD, SDVX, torrent notifications, and more
}
