var Discord = require("discord.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var bot = new Discord.Client();

// ---------------------------------------- Variable-List Information ------------------------------
idleArray = [
				"What do you think you're doing?", 
				"Are you trying to say I'm short!?", 
				"Who do you think I am... geez.", 
				"I'll forgive you because I feel good today. It's a special occasion.", 
				"Are you... trying to pick a fight?"
			];

emojiNames = [
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

// -------------------- Commands -------------------------
var commands = {
	".msgclassdebug": {
		description: "Outputs log information about the message being sent to the server. Practically no use, unless you're Erina.",
		usage: "To use: `.msgclassdebug <additional parameters ignored>`",
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
		action: function(bot, msg, args) {
	    	try {
	    		validArguments = ['N_Probability', 'HN_Probability', 'R_Probability', 'HR_Probability', 'SR_Probability', 'SSR_Probability', 'UR_Probability', 'girl_name', 'girl_age', 'girl_blood', 'girl_horoscope', 'girl_weight', 'girl_waist', 'girl_attribute', 'girl_height', 'girl_hip', 'girl_bust']
	    		validArgumentsTranslated = ['N_Probability', 'HN_Probability', 'R_Probability', 'HR_Probability', 'SR_Probability', 'SSR_Probability', 'UR_Probability', 'girl_name_official_eng', 'girl_age', 'girl_blood', 'girl_horoscope_eng', 'girl_weight', 'girl_waist', 'girl_attribute', 'girl_height', 'girl_hip', 'girl_bust']
	    		validArgumentsType = ['numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'numeric', 'string', 'numeric', 'string', 'string', 'numeric', 'numeric', 'string', 'numeric', 'numeric', 'numeric']
	    		dict = {};
	    		for (x in args) {
	    			arg = args[x];
	    			if (arg.indexOf('=') > -1) {
	    				split = arg.split("=");
	    				if (validArguments.indexOf(split[0]) > -1) {
	    					index = validArguments.indexOf(split[0]);
	    					value = split[1];
	    					operator = "";
	    					if (value.indexOf(':') > -1) { 
	    						valueSplit = value.split(':');
	    						value = valueSplit[1];
	    						operator = valueSplit[0];
	    					}
	    					if (validArgumentsType[index] == 'numeric') {
	    						if (isNaN(value)) {
	    							continue;
	    						}
	    					} 

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
	    		url = "http://api.gfkari.com/api/random/card"
	    		if (Object.keys(dict).length > 0) {
	    			url = url + "?";
	    			counter = 0;
	    			for (key in dict) {
	    				value = dict[key];
	    				url = url + key + "=" + value;
	    				counter = counter + 1;
	    				if (counter < Object.keys(dict).length) {
	    					url = url + '&';
	    				}
	    			}
	    		}
				xhr = new XMLHttpRequest();
				xhr.open('GET', url);
				xhr.send();
				xhr.onreadystatechange = checkCardRequest;
				function checkCardRequest(e) {
					if (xhr.readyState == 4 && xhr.status == 200) {
						var cardNumber = xhr.getResponseHeader("Card_Number");
						msg.channel.sendFile("http://api.gfkari.com/api/cards/picture/" + cardNumber, 'card.jpg', 'Card Number: ' + cardNumber + '.');
						// msg.channel.sendMessage("http://api.gfkari.com/api/cards/picture/" + cardNumber);
					} else if (xhr.status != 200 && xhr.readyState == 4) {
						msg.channel.sendMessage("Whoops, bad value! Try again... or maybe your luck is just horrible.");
					}
				}
	    	} catch (e) {
	    		msg.channel.sendMessage("Whoops, bad value! Try again... or maybe your luck is just horrible.");
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

    	rand = Math.floor(Math.random() * idleArray.length);
    	try {
    		sections = msg.content.split(" ");
    		section = msg.content.split(" ")[1];
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
			sections = msg.content.split(" ");
			// check if command is valid
			if (commands[sections[0]]) {
				if (sections.length >= 2 && sections[1] == "help") {
					command = commands[sections[0]];
					msg.channel.sendMessage(command.description);
					msg.channel.sendMessage(command.usage);
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
				section = sections[index];
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
  console.log('I am ready!');
});


bot.login("<INSERT TOKEN HERE>");