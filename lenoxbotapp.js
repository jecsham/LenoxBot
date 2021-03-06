const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const token = require('./settings.json').token;
const fs = require('fs');
const Enmap = require('enmap');
const chalk = require('chalk');
const NewsAPI = require('newsapi');
const EnmapLevel = require('enmap-level');
const express = require('express');
const session = require('express-session');
const url = require('url');
const moment = require('moment');
const passport = require('passport');
const Strategy = require('passport-discord').Strategy;
const handlebars = require('express-handlebars');
const handlebarshelpers = require('handlebars-helpers')();
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

client.wait = require('util').promisify(setTimeout);
client.guildconfs = new Enmap({
	provider: new EnmapLevel({
		name: 'guildsettings'
	})
});
client.botconfs = new Enmap({
	provider: new EnmapLevel({
		name: 'botconfs'
	})
});
client.userdb = new Enmap({
	provider: new EnmapLevel({
		name: 'userdb'
	})
});
client.cooldowns = new Enmap({
	provider: new EnmapLevel({
		name: 'cooldowns'
	})
});

client.queue = new Map();
client.skipvote = new Map();
client.newsapi = new NewsAPI('351893454fd1480ea4fe2f0eac0307c2');

// Check if the Discord Bot List key was set
if (settings.dbl_apikey && settings.dbl_apikey !== '') {
	const DBL = require('dblapi.js');
	client.dbl = new DBL(settings.dbl_apikey);
	client.dbl.getVotes(true);
}

// Check if settings.json is correctly configuered
if (!settings.token || settings.token === '' || !settings.prefix || settings.prefix === '' || !settings.sqlitefilename || settings.sqlitefilename === '') {
	console.error(chalk.red('\nsettings.json file is not correctly configuered!\n'));
	return process.exit(42);
}


fs.readdir('./events/', (err, files) => {
	if (err) return console.error(err);
	files.forEach(file => {
		const eventFunction = require(`./events/${file}`);
		const eventName = file.split('.')[0];
		client.on(eventName, (...args) => eventFunction.run(client, ...args));
	});
});

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
const categories = ['partner', 'currency', 'botowner', 'administration', 'moderation', 'fun', 'help', 'music', 'nsfw', 'searches', 'utility', 'staff', 'application', 'tickets', 'customcommands'];
categories.forEach(c => {
	fs.readdir(`./commands/${c}/`, (err, files) => {
		if (err) throw err;
		console.log(chalk.green(`[Commandlogs] Loaded ${files.length} commands of module ${c}`));

		files.forEach(f => {
			const props = require(`./commands/${c}/${f}`);
			client.commands.set(props.help.name, props);
			props.conf.aliases.forEach(alias => {
				client.aliases.set(alias, props.help.name);
			});
		});
	});
});


// Client login to Discord API
client.login(token);

// All website stuff

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	limit: '50mb',
	extended: false
}));
app.use(cookieParser());

app.engine('handlebars', handlebars({
	defaultLayout: 'main',
	layoutsDir: `${__dirname}/views/layouts/`,
	helpers: handlebarshelpers
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

app.use(express.static('public'));

passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((obj, done) => {
	done(null, obj);
});

const scopes = ['identify', 'guilds'];

passport.use(new Strategy({
	clientID: settings.clientID_Auth,
	clientSecret: settings.clientSecret_Auth,
	callbackURL: settings.callbackURL_Auth,
	scope: scopes
}, ((accessToken, refreshToken, profile, done) => {
	process.nextTick(() => done(null, profile));
})));

app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/loginpressedbutton', passport.authenticate('discord', {
	scope: scopes
}));

app.get('/callback',
	passport.authenticate('discord', {
		failureRedirect: '/error'
	}),
	(req, res) => {
		res.redirect('/servers');
	});

app.listen(80, err => {
	if (err) return console.log(err);
});

app.get('/', (req, res) => {
	try {
		const check = [];
		if (req.user) {
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (((req.user.guilds[i].permissions) & 8) === 8) {
					check.push(req.user.guilds[i]);
				}
			}
		}

		return res.render('index', {
			user: req.user,
			guilds: check,
			client: client,
			botstats: client.botconfs.get('botstats')
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/home', (req, res) => {
	try {
		const check = [];
		if (req.user) {
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (((req.user.guilds[i].permissions) & 8) === 8) {
					check.push(req.user.guilds[i]);
				}
			}
		}

		return res.render('index', {
			user: req.user,
			guilds: check,
			client: client,
			botstats: client.botconfs.get('botstats')
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/invite', (req, res) => res.redirect('https://discordapp.com/oauth2/authorize?client_id=354712333853130752&scope=bot&permissions=8'));

app.get('/discord', (req, res) => res.redirect('https://discordapp.com/invite/c7DUz35'));

app.get('/status', (req, res) => res.redirect('https://lenoxbot.statuskit.com/'));

app.get('/policy', (req, res) => res.render('policy'));

app.get('/blog', (req, res) => res.redirect('https://medium.com/lenoxbot'));

app.get('/ban', (req, res) => res.redirect('https://goo.gl/forms/NKoVsl8y5wOePCYT2'));

app.get('/apply', (req, res) => res.redirect('https://goo.gl/forms/jOyjxAheOHaDYyoF2'));

app.get('/survey', (req, res) => res.redirect('https://goo.gl/forms/2sS8U9JoYjeWHFF83'));

app.get('/logout', (req, res) => {
	try {
		req.logOut();
		return res.redirect('home');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/commands', (req, res) => {
	try {
		const validation = ['administration', 'help', 'music', 'fun', 'searches', 'nsfw', 'utility', 'moderation', 'application', 'currency', 'tickets'];

		const commandlist = client.commands.filter(c => validation.includes(c.help.category) && c.conf.enabled === true).array();
		const newcommandlist = [];
		commandlist.map(cmd => {
			const lang = require('./languages/en-US.json');
			cmd.help.description = lang[`${cmd.help.name}_description`];
			cmd.conf.newuserpermissions = cmd.conf.userpermissions.length > 0 ? cmd.conf.userpermissions.join(', ') : '';
			cmd.conf.newaliases = cmd.conf.aliases.length > 0 ? cmd.conf.aliases.join(', ') : '';
			newcommandlist.push(cmd);
		});

		return res.render('commands', {
			user: req.user,
			client: client,
			commands: newcommandlist
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/donate', (req, res) => {
	try {
		return res.render('donate', {
			user: req.user,
			client: client
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/donationsuccess', (req, res) => {
	try {
		return res.render('donationsuccess', {
			user: req.user,
			client: client
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/documentation', (req, res) => res.redirect('https://docs.lenoxbot.com'));

app.get('/nologin', (req, res) => {
	try {
		const check = [];
		if (req.user) {
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (((req.user.guilds[i].permissions) & 8) === 8) {
					check.push(req.user.guilds[i]);
				}
			}
		}

		return res.render('index', {
			notloggedin: true,
			user: req.user,
			guilds: check,
			client: client
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/oauth2problem', (req, res) => {
	try {
		const check = [];
		if (req.user) {
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (((req.user.guilds[i].permissions) & 8) === 8) {
					req.user.guilds[i].lenoxbot = client.guilds.get(req.user.guilds[i].id) ? true : false;
					check.push(req.user.guilds[i]);
				}
			}
		}

		return res.render('oauth2problem', {
			user: req.user,
			guilds: check,
			client: client
		});
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/servers', async (req, res) => {
	try {
		if (req.user) {
			const check = [];

			for (let i = 0; i < req.user.guilds.length; i++) {
				if (client.guildconfs.get(req.user.guilds[i].id) && client.guilds.get(req.user.guilds[i].id)) {
					const dashboardid = req.user.guilds[i].id;
					const tableload = client.guildconfs.get(dashboardid);


					if (!tableload.dashboardpermissionroles) {
						tableload.dashboardpermissionroles = [];
						await client.guildconfs.set(dashboardid, tableload);
					}

					if (tableload.dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
						let allwhitelistedrolesoftheuser = 0;

						for (let index2 = 0; index2 < tableload.dashboardpermissionroles.length; index2++) {
							if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
							if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(tableload.dashboardpermissionroles[index2])) {
								allwhitelistedrolesoftheuser += 1;
							}
						}
						if (allwhitelistedrolesoftheuser !== tableload.dashboardpermissionroles.length) {
							req.user.guilds[i].lenoxbot = client.guilds.get(req.user.guilds[i].id) ? true : false;

							if (req.user.guilds[i].lenoxbot === true) {
								req.user.guilds[i].memberscount = client.guilds.get(req.user.guilds[i].id).memberCount;
							}
							check.push(req.user.guilds[i]);
						}
					} else if (((req.user.guilds[i].permissions) & 8) === 8) {
						req.user.guilds[i].lenoxbot = client.guilds.get(req.user.guilds[i].id) ? true : false;

						if (req.user.guilds[i].lenoxbot === true) {
							req.user.guilds[i].memberscount = client.guilds.get(req.user.guilds[i].id).memberCount;
						}

						check.push(req.user.guilds[i]);
					}
				} else if (((req.user.guilds[i].permissions) & 8) === 8) {
					req.user.guilds[i].lenoxbot = client.guilds.get(req.user.guilds[i].id) ? true : false;

					if (req.user.guilds[i].lenoxbot === true) {
						req.user.guilds[i].memberscount = client.guilds.get(req.user.guilds[i].id).memberCount;
					}

					check.push(req.user.guilds[i]);
				}
			}
			return res.render('servers', {
				user: req.user,
				guilds: check,
				client: client
			});
		}
		return res.redirect('nologin');
	} catch (error) {
		console.log(error);
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/tickets/:ticketid/submitticketanswer', async (req, res) => {
	try {
		if (req.user) {
			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');
			if (botconfs.tickets[req.params.ticketid].authorid !== req.user.id) return res.redirect('../error');

			const ticket = botconfs.tickets[req.params.ticketid];

			const length = Object.keys(ticket.answers).length + 1;

			req.body.newticketanswer = req.body.newticketanswer.replace(/(?:\r\n|\r|\n)/g, '\n');

			ticket.answers[length] = {
				authorid: req.user.id,
				guildid: req.params.id,
				date: new Date(),
				content: req.body.newticketanswer,
				timelineconf: ''
			};

			await client.botconfs.set('botconfs', botconfs);

			if (client.guildconfs.get(ticket.guildid) && client.guildconfs.get(ticket.guildid).tickets.status === true) {
				const tableload = client.guildconfs.get(ticket.guildid);
				const lang = require(`./languages/${tableload.language}.json`);

				const ticketembedanswer = lang.mainfile_ticketembedanswer.replace('%ticketid', ticket.ticketid);
				const embed = new Discord.RichEmbed()
					.setURL(`https://lenoxbot.com/dashboard/${ticket.guildid}/tickets/${ticket.ticketid}/overview`)
					.setTimestamp()
					.setColor('#ccffff')
					.setTitle(lang.mainfile_ticketembedtitle)
					.setDescription(ticketembedanswer);

				try {
					client.channels.get(client.guildconfs.get(ticket.guildid).tickets.notificationchannel).send({
						embed
					});
				} catch (error) {
					'undefined';
				}
			}

			return res.redirect(url.format({
				pathname: `/tickets/${ticket.ticketid}/overview`,
				query: {
					submitticketanswer: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/tickets/:ticketid/submitnewticketstatus', async (req, res) => {
	try {
		if (req.user) {
			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');
			if (botconfs.tickets[req.params.ticketid].authorid !== req.user.id) return res.redirect('../error');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');

			const ticket = botconfs.tickets[req.params.ticketid];

			if (ticket.status === req.body.newstatus) return res.redirect(`/tickets/${ticket.ticketid}/overview`);

			ticket.status = req.body.newstatus;

			const length = Object.keys(ticket.answers).length + 1;

			if (ticket.status === 'closed') {
				ticket.answers[length] = {
					authorid: req.user.id,
					guildid: req.params.id,
					date: new Date(),
					content: `${client.users.get(ticket.authorid) ? client.users.get(ticket.authorid).tag : ticket.authorid} closed the ticket!`,
					timelineconf: ''
				};
			} else if (ticket.status === 'open') {
				ticket.answers[length] = {
					authorid: req.user.id,
					guildid: req.params.id,
					date: new Date(),
					content: `${client.users.get(ticket.authorid) ? client.users.get(ticket.authorid).tag : ticket.authorid} opened the ticket!`,
					timelineconf: ''
				};
			}

			await client.botconfs.set('botconfs', botconfs);

			return res.redirect(url.format({
				pathname: `/tickets/${ticket.ticketid}/overview`,
				query: {
					submitnewticketstatus: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/tickets/:ticketid/overview', async (req, res) => {
	try {
		if (req.user) {
			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');
			if (botconfs.tickets[req.params.ticketid].authorid !== req.user.id) return res.redirect('../error');

			const ticket = botconfs.tickets[req.params.ticketid];

			botconfs.tickets[req.params.ticketid].newdate = moment(botconfs.tickets[req.params.ticketid].date).format('MMMM Do YYYY, h:mm:ss a');

			botconfs.tickets[req.params.ticketid].author = client.users.get(botconfs.tickets[req.params.ticketid].authorid).tag;

			for (const index in ticket.answers) {
				ticket.answers[index].author = client.users.get(ticket.answers[index].authorid) ? client.users.get(ticket.answers[index].authorid).tag : ticket.answers[index].authorid;
				ticket.answers[index].newdate = moment(ticket.answers[index].date).format('MMMM Do YYYY, h:mm:ss a');
			}

			return res.render('ticket', {
				user: req.user,
				client: client,
				ticket: ticket,
				answers: Object.keys(botconfs.tickets[req.params.ticketid].answers).length === 0 ? false : botconfs.tickets[req.params.ticketid].answers,
				status: botconfs.tickets[req.params.ticketid].status === 'open' ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

// ADMIN PANEL

app.get('/dashboard/:id/overview', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].memberscountincrement = Math.floor(client.guilds.get(req.user.guilds[index].id).memberCount / 170) + 1;

			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;
			req.user.guilds[index].channelscountincrement = Math.floor(client.guilds.get(req.user.guilds[index].id).channels.size / 170) + 1;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;
			req.user.guilds[index].rolescountincrement = Math.floor(client.guilds.get(req.user.guilds[index].id).roles.size / 170) + 1;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].lenoxbotjoined = client.guilds.get(req.user.guilds[index].id).members.get('354712333853130752') ? moment(client.guilds.get(req.user.guilds[index].id).members.get('354712333853130752').joinedAt).format('MMMM Do YYYY, h:mm:ss a') : 'Undefined';

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			let activatedmodules = 0;
			for (const prop in client.guildconfs.get(req.user.guilds[index].id).modules) {
				if (client.guildconfs.get(req.user.guilds[index].id).modules[prop] === 'true') {
					activatedmodules += 1;
				}
			}

			req.user.guilds[index].activatedmodules = activatedmodules;

			const check = req.user.guilds[index];
			let logs;

			if (client.guildconfs.get(dashboardid).globallogs) {
				const thelogs = client.guildconfs.get(dashboardid).globallogs;
				logs = thelogs.sort((a, b) => {
					if (a.date < b.date) {
						return 1;
					}
					if (a.date > b.date) {
						return -1;
					}
					return 0;
				}).slice(0, 15);
			} else {
				logs = null;
			}

			return res.render('dashboard', {
				user: req.user,
				guilds: check,
				client: client,
				logs: logs
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitlogs', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (req.body[Object.keys(req.body)[0]] === 'false') {
				tableload[Object.keys(req.body)[0]] = 'false';
			} else {
				tableload[Object.keys(req.body)[0]] = 'true';
				tableload[`${[Object.keys(req.body)[0]]}channel`] = client.guilds.get(dashboardid).channels.find('name', `${req.body[Object.keys(req.body)[0]]}`).id;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}
			tableload.globallogs.push({
				action: `Changed the ${Object.keys(req.body)[0]} settings!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitselfassignableroles', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (req.body.newselfassignableroles) {
				const newselfassignableroles = req.body.newselfassignableroles;
				const array = [];

				if (Array.isArray(newselfassignableroles)) {
					for (let i = 0; i < newselfassignableroles.length; i++) {
						array.push(newselfassignableroles[i]);
					}
					tableload.selfassignableroles = array;
				} else {
					array.push(newselfassignableroles);
					tableload.selfassignableroles = array;
				}
			} else {
				tableload.selfassignableroles = [];
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated self-assignable roles!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittogglexp', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newxpchannels = req.body.newxpchannels;
			const array = [];
			const tableload = client.guildconfs.get(dashboardid);

			if (Array.isArray(newxpchannels)) {
				for (let i = 0; i < newxpchannels.length; i++) {
					array.push(client.guilds.get(req.user.guilds[index].id).channels.find('name', newxpchannels[i]).id);
				}
				tableload.togglexp.channelids = array;
			} else {
				array.push(client.guilds.get(req.user.guilds[index].id).channels.find('name', newxpchannels).id);
				tableload.togglexp.channelids = array;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated togglexp-channels!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitbyemsg', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newbyemsg = req.body.newbyemsg;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.byemsg = newbyemsg;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the bye message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitwelcomemsg', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newwelcomemsg = req.body.newwelcomemsg;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.welcomemsg = newwelcomemsg;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the welcome message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitprefix', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newprefix = req.body.newprefix;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.prefix = newprefix;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}
			tableload.globallogs.push({
				action: `Changed the prefix of the bot!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitlanguage', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newlanguage = req.body.newlanguage;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.language = newlanguage;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the language of the bot!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitcommanddeletion', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newcommanddeletion = req.body.newcommanddeletion;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commanddel = newcommanddeletion;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the commanddeletion settings!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitmuterole', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newmuterole = req.body.newmuterole;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.muterole = newmuterole;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the muterole!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittogglechatfilter', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newchatfilter = req.body.newchatfilter;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.chatfilter.chatfilter = newchatfilter;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Toggled the chatfilter!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittogglexpmessages', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newxpmessages = req.body.newxpmessages;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.xpmessages = newxpmessages;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Toggled the XP messages!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitchatfilterarray', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		let index;
		if (req.user) {
			index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			const newchatfilterarray = req.body.newchatfilterarray.replace(/\s/g, '').split(',');

			for (let i = 0; i < newchatfilterarray.length; i++) {
				for (let index3 = 0; index3 < newchatfilterarray.length; index3++) {
					if (newchatfilterarray[i].toLowerCase() === newchatfilterarray[index3].toLowerCase() && i !== index3) {
						newchatfilterarray.splice(index3, 1);
					}
				}
			}

			tableload.chatfilter.array = newchatfilterarray;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated the chatfilter entries!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittogglewelcome', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newwelcome = req.body.newwelcome;

			const tableload = client.guildconfs.get(dashboardid);

			if (newwelcome === 'false') {
				tableload.welcome = 'false';
			} else {
				tableload.welcome = 'true';
				tableload.welcomechannel = newwelcome;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Toggled the welcome message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittogglebye', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newbye = req.body.newbye;

			const tableload = client.guildconfs.get(dashboardid);

			if (newbye === 'false') {
				tableload.bye = 'false';
			} else {
				tableload.bye = 'true';
				tableload.byechannel = newbye;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Toggled the bye message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submittoggleannounce', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newannounce = req.body.newannounce;

			const tableload = client.guildconfs.get(dashboardid);

			if (newannounce === 'false') {
				tableload.announce = 'false';
				tableload.announcechannel = '';
			} else {
				tableload.announce = 'true';
				tableload.announcechannel = newannounce;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the announce settings!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitpermissionsticket', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.dashboardticketpermissions = Number(req.body.newpermissionticket);

			tableload.globallogs.push({
				action: `Changed the required permissions for the ticket panel!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitpermissionsapplication', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.dashboardapplicationpermissions = Number(req.body.newpermissionapplication);

			tableload.globallogs.push({
				action: `Changed the required permissions for the applications panel!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/administration/submitpermissionsdashboard', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (!tableload.dashboardpermissionroles) {
				tableload.dashboardpermissionroles = [];
			}

			if (req.body.newpermissiondashboard) {
				const newpermissiondashboard = req.body.newpermissiondashboard;
				const array = [];

				if (Array.isArray(newpermissiondashboard)) {
					for (let i = 0; i < newpermissiondashboard.length; i++) {
						array.push(newpermissiondashboard[i]);
					}
					tableload.dashboardpermissionroles = array;
				} else {
					array.push(newpermissiondashboard);
					tableload.dashboardpermissionroles = array;
				}
			} else {
				tableload.dashboardpermissionroles = [];
			}

			tableload.globallogs.push({
				action: `Changed the required permissions for the dashboard!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/administration`,
				query: {
					submitadministration: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/administration', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			req.user.guilds[index].welcomemsg = client.guildconfs.get(req.user.guilds[index].id).welcomemsg;
			req.user.guilds[index].byemsg = client.guildconfs.get(req.user.guilds[index].id).byemsg;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();

			const tableload = client.guildconfs.get(req.user.guilds[index].id);
			if (tableload.togglexp) {
				for (let i = 0; i < channels.length; i++) {
					if (tableload.togglexp.channelids.includes(channels[i].id)) {
						channels[i].togglexpset = true;
					}
					if (tableload.welcomechannel === channels[i].id) {
						channels[i].welcomeset = true;
					}
					if (tableload.byechannel === channels[i].id) {
						channels[i].byeset = true;
					}
					if (tableload.announcechannel === channels[i].id) {
						channels[i].announceset = true;
					}
				}
			}
			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			const check = req.user.guilds[index];
			for (let index2 = 0; index2 < roles.length; index2++) {
				if (tableload.selfassignableroles.includes(roles[index2].id)) {
					roles[index2].selfassignablerolesset = true;
				}
				if (tableload.muterole === roles[index2].id) {
					roles[index2].muteroleset = true;
				}
				if (tableload.dashboardpermissionroles.includes(roles[index2].id)) {
					roles[index2].dashboardpermissionset = true;
				}
			}

			const commands = client.commands.filter(r => r.help.category === 'administration' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}
				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const languages = [{
				name: 'english',
				alias: 'en-US'
			},
			{
				name: 'german',
				alias: 'de-DE'
			},
			{
				name: 'french',
				alias: 'fr-FR'
			}];

			if (tableload.language) {
				for (let index3 = 0; index3 < languages.length; index3++) {
					if (tableload.language === languages[index3].alias) {
						languages[index3].set = true;
					}
				}
			}

			const confs = {};
			if (tableload) {
				for (let i = 0; i < channels.length; i++) {
					if (channels[i].id === tableload.modlogchannel) {
						if (tableload.modlog === 'true') {
							channels[i].modlogset = true;
						} else {
							confs.modlogdeactivated = true;
						}
					}

					if (channels[i].id === tableload.chatfilterlogchannel) {
						if (tableload.chatfilterlog === 'true') {
							channels[i].chatfilterset = true;
							confs.chatfilterset = true;
						} else {
							confs.chatfilterdeactivated = true;
						}
					}

					if (channels[i].id === tableload.messagedeletelogchannel) {
						if (tableload.messagedeletelog === 'true') {
							channels[i].messagedeleteset = true;
							confs.messagedeleteset = true;
						} else {
							confs.messagedeletedeactivated = true;
						}
					}

					if (channels[i].id === tableload.messageupdatelogchannel) {
						if (tableload.messageupdatelog === 'true') {
							channels[i].messageupdateset = true;
							confs.messageupdateset = true;
						} else {
							confs.messageupdatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.channelupdatelogchannel) {
						if (tableload.channelupdatelog === 'true') {
							channels[i].channelupdateset = true;
							confs.channelupdateset = true;
						} else {
							confs.channelupdatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.channelcreatelogchannel) {
						if (tableload.channeldeletelog === 'true') {
							channels[i].channelcreateset = true;
							confs.channelcreateset = true;
						} else {
							confs.channelcreatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.channeldeletelogchannel) {
						if (tableload.channeldeletelog === 'true') {
							channels[i].channeldeleteset = true;
							confs.channeldeleteset = true;
						} else {
							confs.channeldeletedeactivated = true;
						}
					}

					if (channels[i].id === tableload.memberupdatelogchannel) {
						if (tableload.memberupdatelog === 'true') {
							channels[i].memberupdateset = true;
							confs.memberupdateset = true;
						} else {
							confs.memberupdatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.presenceupdatelogchannel) {
						if (tableload.presenceupdatelog === 'true') {
							channels[i].presenceupdateset = true;
							confs.presenceupdateset = true;
						} else {
							confs.presenceupdatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.welcomelogchannel) {
						if (tableload.welcomelog === 'true') {
							channels[i].welcomeset = true;
							confs.welcomeset = true;
						} else {
							confs.welcomelogdeactivated = true;
						}
					}

					if (channels[i].id === tableload.byelogchannel) {
						if (tableload.byelog === 'true') {
							channels[i].byeset = true;
							confs.byeset = true;
						} else {
							confs.byelogdeactivated = true;
						}
					}

					if (channels[i].id === tableload.rolecreatelogchannel) {
						if (tableload.rolecreatelog === 'true') {
							channels[i].rolecreateset = true;
							confs.rolecreateset = true;
						} else {
							confs.rolecreatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.roledeletelogchannel) {
						if (tableload.roledeletelog === 'true') {
							channels[i].roledeleteset = true;
							confs.roledeleteset = true;
						} else {
							confs.roledeletedeactivated = true;
						}
					}

					if (channels[i].id === tableload.roleupdatelogchannel) {
						if (tableload.roleupdatelog === 'true') {
							channels[i].roleupdateset = true;
							confs.roleupdateset = true;
						} else {
							confs.roleupdatedeactivated = true;
						}
					}

					if (channels[i].id === tableload.guildupdatelogchannel) {
						if (tableload.guildupdatelog === 'true') {
							channels[i].guildupdateset = true;
							confs.guildupdateset = true;
						} else {
							confs.guildupdatedeactivated = true;
						}
					}
				}
			}

			const permissions = {
				administrator: {
					name: 'Administrator',
					number: 8
				},
				kickmembersbanmembers: {
					name: 'Kick Members & Ban Members (Standard)',
					number: 6
				},
				manageserver: {
					name: 'Manage Server',
					number: 32
				},
				managemessages: {
					name: 'Manage Messages',
					number: 8192
				}
			};

			for (const x in permissions) {
				if (tableload.dashboardticketpermissions === permissions[x].number) {
					permissions[x].ticketpermissionset = true;
				}
				if (tableload.dashboardapplicationpermissions === permissions[x].number) {
					permissions[x].applicationpermissionset = true;
				}
			}

			return res.render('dashboardadministration', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				confs: confs,
				announcedeactivated: client.guildconfs.get(dashboardid).announce === 'true' ? false : true,
				muteroledeactivated: client.guildconfs.get(dashboardid).muterole === '' ? true : false,
				commanddeletionset: client.guildconfs.get(dashboardid).commanddel === 'true' ? true : false,
				chatfilterset: client.guildconfs.get(dashboardid).chatfilter.chatfilter === 'true' ? true : false,
				xpmesssagesset: client.guildconfs.get(dashboardid).xpmessages === 'true' ? true : false,
				languages: languages,
				chatfilterarray: client.guildconfs.get(req.user.guilds[index].id).chatfilter ? client.guildconfs.get(req.user.guilds[index].id).chatfilter.array.join(',') : '',
				commands: commands,
				permissions: permissions,
				submitadministration: req.query.submitadministration ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/moderation/submittempbananonymous', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (!tableload.muteanonymous) {
				tableload.muteanonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			if (!tableload.tempbananonymous) {
				tableload.tempbananonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			tableload.tempbananonymous = req.body.newtempbananonymous;

			tableload.globallogs.push({
				action: `Changed the settings of the anonymous temporary ban!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/moderation`,
				query: {
					submitmoderation: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/moderation/submitmuteanonymous', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (!tableload.muteanonymous) {
				tableload.muteanonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			if (!tableload.tempbananonymous) {
				tableload.tempbananonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			tableload.muteanonymous = req.body.newmuteanonymous;

			tableload.globallogs.push({
				action: `Changed the settings of the anonymous mute!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/moderation`,
				query: {
					submitmoderation: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/moderation/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/moderation`,
				query: {
					submitmoderation: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/moderation/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/moderation`,
				query: {
					submitmoderation: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/moderation', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(dashboardid);

			const commands = client.commands.filter(r => r.help.category === 'moderation' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			if (!tableload.muteanonymous) {
				tableload.muteanonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			if (!tableload.tempbananonymous) {
				tableload.tempbananonymous = 'false';
				await client.guildconfs.set(dashboardid, tableload);
			}

			return res.render('dashboardmoderation', {
				user: req.user,
				muteanonymous: tableload.muteanonymous === 'true' ? true : false,
				tempbananonymous: tableload.tempbananonymous === 'true' ? true : false,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitmoderation: req.query.submitmoderation ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/help/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/help`,
				query: {
					submithelp: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/help/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/help`,
				query: {
					submithelp: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/help', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(dashboardid);

			const commands = client.commands.filter(r => r.help.category === 'help' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardhelp', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submithelp: req.query.submithelp ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/music/submitchannelblacklist', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newchannelblacklist = req.body.newchannelblacklist;
			const array = [];
			const tableload = client.guildconfs.get(dashboardid);

			if (Array.isArray(newchannelblacklist)) {
				for (let i = 0; i < newchannelblacklist.length; i++) {
					array.push(client.guilds.get(req.user.guilds[index].id).channels.find('name', newchannelblacklist[i]).id);
				}
				tableload.musicchannelblacklist = array;
			} else {
				array.push(client.guilds.get(req.user.guilds[index].id).channels.find('name', newchannelblacklist).id);
				tableload.musicchannelblacklist = array;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated blacklisted music-channels!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/music`,
				query: {
					submitmusic: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/music/submitnewmusicaction', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const serverQueue = client.queue.get(dashboardid);

			if (req.body.newmusicaction === 'play') {
				if (serverQueue.playing === true) {
					serverQueue.playing = false;
					serverQueue.connection.dispatcher.pause();
				} else {
					serverQueue.playing = true;
					serverQueue.connection.dispatcher.resume();
				}
			} else if (req.body.newmusicaction === 'stop') {
				serverQueue.songs = [];
				serverQueue.connection.dispatcher.destroy();
			} else {
				serverQueue.connection.dispatcher.destroy();
			}

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/music`,
				query: {
					submitmusic: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/music/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/music`,
				query: {
					submitmusic: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/music/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/music`,
				query: {
					submitmusic: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/music', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const voicechannels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `voice`).array();
			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);
			if (tableload.musicchannelblacklist) {
				for (let i = 0; i < channels.length; i++) {
					if (tableload.musicchannelblacklist.includes(channels[i].id)) {
						channels[i].channelblacklistset = true;
					}
				}
			}

			const commands = client.commands.filter(r => r.help.category === 'music' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardmusic', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				voicechannels: voicechannels,
				roles: roles,
				musiccurrentlyplaying: client.queue.get(dashboardid) ? true : false,
				song: client.queue.get(dashboardid) ? client.queue.get(dashboardid).songs[0].title : false,
				commands: commands,
				submitmusic: req.query.submitmusic ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/fun/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/fun`,
				query: {
					submitfun: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/fun/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/fun`,
				query: {
					submitfun: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/fun', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);

			const commands = client.commands.filter(r => r.help.category === 'fun' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardfun', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitfun: req.query.submitfun ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/searches/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/searches`,
				query: {
					submitsearches: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/searches/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/searches`,
				query: {
					submitsearches: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/searches', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);

			const commands = client.commands.filter(r => r.help.category === 'searches' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardsearches', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitsearches: req.query.submitsearches ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/nsfw/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/nsfw`,
				query: {
					submitnsfw: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/nsfw/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/nsfw`,
				query: {
					submitnsfw: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/nsfw', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);

			const commands = client.commands.filter(r => r.help.category === 'nsfw' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardnsfw', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitnsfw: req.query.submitnsfw ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/utility/submitsendembed', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			const embed = new Discord.RichEmbed();

			embed.setTitle(req.body.embedtitle);

			try {
				embed.setColor(req.body.embedcolor);
			} catch (error) {
				throw new Error('No color selected!');
			}

			if (req.body.embeddescription) {
				embed.setDescription(req.body.embeddescription);
			}

			if (req.body.embedlink) {
				embed.setURL(req.body.embedlink);
			}

			if (req.body.embedtimestamp) {
				embed.setTimestamp();
			}

			if (req.body.embedthumbnail) {
				embed.setThumbnail(req.body.embedthumbnail);
			}

			if (req.body.embedfooter) {
				embed.setFooter(req.body.embedfooter);
			}

			const embedchannel = client.guilds.get(dashboardid).channels.get(req.body.sendembedchannel);

			embedchannel.send({
				embed
			});

			tableload.globallogs.push({
				action: `An embed was sent (#${embedchannel.name}) `,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/utility`,
				query: {
					submitutility: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/utility/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/utility`,
				query: {
					submitutility: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/utility/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/utility`,
				query: {
					submitutility: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/utility', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);

			const commands = client.commands.filter(r => r.help.category === 'utility' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardutility', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitutility: req.query.submitutility ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/applications/:applicationid/submitdeleteapplication', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardapplicationpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardapplicationpermissions) !== client.guildconfs.get(dashboardid).dashboardapplicationpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);
			if (tableload.application.applications[req.params.applicationid] === 'undefined') return res.redirect('../error');

			delete tableload.application.applications[req.params.applicationid];

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/applications`,
				query: {
					submitdeleteapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/applications/:applicationid/submitnewvote', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardapplicationpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardapplicationpermissions) !== client.guildconfs.get(dashboardid).dashboardapplicationpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);
			if (tableload.application.applications[req.params.applicationid] === 'undefined') return res.redirect('../error');

			const application = tableload.application.applications[req.params.applicationid];

			if (req.body.newvote === 'true' && !application.yes.includes(req.user.id) && !application.no.includes(req.user.id)) {
				application.yes.push(req.user.id);
			} else if (!application.no.includes(req.user.id) && !application.yes.includes(req.user.id)) {
				application.no.push(req.user.id);
			}

			try {
				if (application.yes.length >= tableload.application.reactionnumber) {
					await client.users.get(application.authorid).send(tableload.application.acceptedmessage);
					const role = client.guilds.get(dashboardid).roles.get(tableload.application.role);
					if (role) {
						await client.guilds.get(dashboardid).members.get(application.authorid).addRole(role);
					}
					application.status = 'closed';
					application.acceptedorrejected = 'accepted';
				} else if (application.no.length >= tableload.application.reactionnumber) {
					await client.users.get(application.authorid).send(tableload.application.rejectedmessage);
					const role = client.guilds.get(dashboardid).roles.get(tableload.application.denyrole);
					if (role) {
						await client.guilds.get(dashboardid).members.get(application.authorid).addRole(role);
					}
					application.status = 'closed';
					application.acceptedorrejected = 'rejected';
				}
			} catch (error) {
				'undefined';
			}

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/applications/${req.params.applicationid}/overview`,
				query: {
					submitnewticketstatus: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/applications/:applicationid/overview', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardapplicationpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardapplicationpermissions) !== client.guildconfs.get(dashboardid).dashboardapplicationpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);
			if (tableload.application.applications[req.params.applicationid] === 'undefined') return res.redirect('../error');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const check = req.user.guilds[index];

			for (const index2 in tableload.application.applications) {
				tableload.application.applications[index2].author = client.users.get(tableload.application.applications[index2].authorid) ? client.users.get(tableload.application.applications[index2].authorid).tag : tableload.application.applications[index2].authorid;
				tableload.application.applications[index2].newdate = moment(tableload.application.applications[index2].date).format('MMMM Do YYYY, h:mm:ss a');
			}

			let votecheck = true;
			if (tableload.application.applications[req.params.applicationid].yes.includes(req.user.id) || tableload.application.applications[req.params.applicationid].no.includes(req.user.id)) {
				votecheck = false;
			}

			return res.render('application', {
				user: req.user,
				guilds: check,
				client: client,
				application: tableload.application.applications[req.params.applicationid],
				yeslength: tableload.application.applications[req.params.applicationid].yes.length,
				nolength: tableload.application.applications[req.params.applicationid].no.length,
				status: tableload.application.applications[req.params.applicationid].status === 'open' ? true : false,
				vote: votecheck
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/applications', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (client.guildconfs.get(dashboardid).dashboardapplicationpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardapplicationpermissions) !== client.guildconfs.get(dashboardid).dashboardapplicationpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(dashboardid);
			const newobject = {};
			const oldobject = {};

			for (const index2 in tableload.application.applications) {
				if (tableload.application.applications[index2].guildid === dashboardid && tableload.application.applications[index2].status === 'open') {
					newobject[index2] = tableload.application.applications[index2];
					tableload.application.applications[index2].author = client.users.get(tableload.application.applications[index2].authorid) ? client.users.get(tableload.application.applications[index2].authorid).tag : tableload.application.applications[index2].authorid;
					tableload.application.applications[index2].newdate = moment(tableload.application.applications[index2].date).format('MMMM Do YYYY, h:mm:ss a');
				}
				if (tableload.application.applications[index2].guildid === dashboardid && tableload.application.applications[index2].status === 'closed') {
					oldobject[index2] = tableload.application.applications[index2];
					tableload.application.applications[index2].author = client.users.get(tableload.application.applications[index2].authorid) ? client.users.get(tableload.application.applications[index2].authorid).tag : tableload.application.applications[index2].authorid;
					tableload.application.applications[index2].newdate = moment(tableload.application.applications[index2].date).format('MMMM Do YYYY, h:mm:ss a');
				}
			}

			return res.render('dashboardapplications', {
				user: req.user,
				guilds: check,
				client: client,
				applicationscheck: Object.keys(newobject).length === 0 ? false : true,
				applications: newobject,
				oldapplicationscheck: Object.keys(oldobject).length === 0 ? false : true,
				oldapplications: oldobject
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitnewacceptedmsg', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newacceptedmsg = req.body.newacceptedmsg;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.application.acceptedmessage = newacceptedmsg;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the application accepted message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitnewrejectedmsg', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const newrejectedmsg = req.body.newrejectedmsg;

			const tableload = client.guildconfs.get(dashboardid);

			tableload.application.rejectedmessage = newrejectedmsg;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Changed the application rejected message!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitdenyrole', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (req.body.newdenyrole === 'false') {
				tableload.application.denyrole = '';
			} else {
				const newdenyrole = req.body.newdenyrole;
				tableload.application.denyrole = newdenyrole;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated the application role for rejected canidates!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitrole', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			if (req.body.newrole === 'false') {
				tableload.application.role = '';
			} else {
				const newrole = req.body.newrole;
				tableload.application.role = newrole;
			}

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated the application role for accepted canidates!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitreactionnumber', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			const newreactionnumber = req.body.newreactionnumber;

			tableload.application.reactionnumber = newreactionnumber;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Updated application reactionnumber!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/submitapplication', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			const newapplication = req.body.newapplication;

			tableload.application.status = newapplication;

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Activated/Deactivated the application system!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/application/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/application`,
				query: {
					submitapplication: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/application', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			req.user.guilds[index].reactionnumber = client.guildconfs.get(req.user.guilds[index].id).application.reactionnumber;

			req.user.guilds[index].acceptedmessage = client.guildconfs.get(req.user.guilds[index].id).application.acceptedmessage;
			req.user.guilds[index].rejectedmessage = client.guildconfs.get(req.user.guilds[index].id).application.rejectedmessage;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(dashboardid);
			if (tableload.application) {
				for (let i = 0; i < channels.length; i++) {
					if (tableload.application.votechannel === channels[i].id) {
						channels[i].votechannelset = true;
					}
					if (tableload.application.archivechannellog === channels[i].id) {
						channels[i].archivechannelset = true;
					}
				}
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();
			if (tableload.application) {
				for (let i2 = 0; i2 < roles.length; i2++) {
					if (tableload.application.role === roles[i2].id) {
						roles[i2].roleset = true;
					}
					if (tableload.application.denyrole === roles[i2].id) {
						roles[i2].denyroleset = true;
					}
				}
			}

			const commands = client.commands.filter(r => r.help.category === 'application' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			return res.render('dashboardapplication', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitapplication: req.query.submitapplication ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/currency/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/currency`,
				query: {
					submitcurrency: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/currency/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/currency`,
				query: {
					submitcurrency: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/currency', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].memberscount = client.guilds.get(req.user.guilds[index].id).memberCount;
			req.user.guilds[index].membersonline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'online').length;
			req.user.guilds[index].membersdnd = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'dnd').length;
			req.user.guilds[index].membersidle = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'idle').length;
			req.user.guilds[index].membersoffline = client.guilds.get(req.user.guilds[index].id).members.array().filter(m => m.presence.status === 'offline').length;

			req.user.guilds[index].channelscount = client.guilds.get(req.user.guilds[index].id).channels.size;

			req.user.guilds[index].rolescount = client.guilds.get(req.user.guilds[index].id).roles.size;

			req.user.guilds[index].ownertag = client.guilds.get(req.user.guilds[index].id).owner.user.tag;

			req.user.guilds[index].prefix = client.guildconfs.get(req.user.guilds[index].id).prefix;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(req.user.guilds[index].id);

			const commands = client.commands.filter(r => r.help.category === 'currency' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(req.user.guilds[index].id).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardcurrency', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				submitcurrency: req.query.submitcurrency ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/tickets/:ticketid/submitticketanswer', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardticketpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardticketpermissions) !== client.guildconfs.get(dashboardid).dashboardticketpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');

			const ticket = botconfs.tickets[req.params.ticketid];

			const length = Object.keys(ticket.answers).length + 1;

			req.body.newticketanswer = req.body.newticketanswer.replace(/(?:\r\n|\r|\n)/g, '\n');

			ticket.answers[length] = {
				authorid: req.user.id,
				guildid: req.params.id,
				date: new Date(),
				content: req.body.newticketanswer,
				timelineconf: 'timeline-inverted'
			};

			await client.botconfs.set('botconfs', botconfs);

			try {
				const tableload = client.guildconfs.get(dashboardid);
				const lang = require(`./languages/${tableload.language}.json`);
				const newanswer = lang.mainfile_newanswer.replace('%link', `https://lenoxbot.com/tickets/${ticket.ticketid}/overview`);
				client.users.get(ticket.authorid).send(newanswer);
			} catch (error) {
				'undefined';
			}

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/tickets/${ticket.ticketid}/overview`,
				query: {
					submitticketanswer: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/tickets/:ticketid/submitnewticketstatus', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardticketpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardticketpermissions) !== client.guildconfs.get(dashboardid).dashboardticketpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');

			const ticket = botconfs.tickets[req.params.ticketid];

			if (ticket.status === req.body.newstatus) return res.redirect(`/dashboard/${dashboardid}/tickets/${ticket.ticketid}/overview`);

			ticket.status = req.body.newstatus;

			const length = Object.keys(ticket.answers).length + 1;

			if (ticket.status === 'closed') {
				ticket.answers[length] = {
					authorid: req.user.id,
					date: new Date(),
					content: `${client.users.get(req.user.id) ? client.users.get(req.user.id).tag : req.user.id} closed the ticket!`,
					timelineconf: 'timeline-inverted'
				};
			} else if (ticket.status === 'open') {
				ticket.answers[length] = {
					authorid: req.user.id,
					date: new Date(),
					content: `${client.users.get(req.user.id) ? client.users.get(req.user.id).tag : req.user.id} opened the ticket!`,
					timelineconf: 'timeline-inverted'
				};
			}

			await client.botconfs.set('botconfs', botconfs);

			try {
				const tableload = client.guildconfs.get(dashboardid);
				const lang = require(`./languages/${tableload.language}.json`);
				const statuschange = lang.mainfile_statuschange.replace('%status', ticket.status).replace('%link', `https://lenoxbot.com/tickets/${ticket.ticketid}/overview`);
				client.users.get(ticket.authorid).send(statuschange);
			} catch (error) {
				'undefined';
			}

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/tickets/${ticket.ticketid}/overview`,
				query: {
					submitnewticketstatus: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/tickets/:ticketid/overview', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');
			if (client.guildconfs.get(dashboardid).dashboardticketpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardticketpermissions) !== client.guildconfs.get(dashboardid).dashboardticketpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}
			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const botconfs = await client.botconfs.get('botconfs');
			if (botconfs.tickets[req.params.ticketid] === 'undefined') return res.redirect('../error');

			const check = req.user.guilds[index];

			const ticket = botconfs.tickets[req.params.ticketid];

			botconfs.tickets[req.params.ticketid].newdate = moment(botconfs.tickets[req.params.ticketid].date).format('MMMM Do YYYY, h:mm:ss a');

			botconfs.tickets[req.params.ticketid].author = client.users.get(botconfs.tickets[req.params.ticketid].authorid) ? client.users.get(botconfs.tickets[req.params.ticketid].authorid).tag : botconfs.tickets[req.params.ticketid].authorid;

			/* eslint guard-for-in: 0 */
			for (const index2 in ticket.answers) {
				ticket.answers[index2].author = client.users.get(ticket.answers[index2].authorid) ? client.users.get(ticket.answers[index2].authorid).tag : ticket.answers[index2].authorid;
				ticket.answers[index2].newdate = moment(ticket.answers[index2].date).format('MMMM Do YYYY, h:mm:ss a');
			}

			return res.render('dashboardticket', {
				user: req.user,
				guilds: check,
				client: client,
				ticket: ticket,
				answers: Object.keys(botconfs.tickets[req.params.ticketid].answers).length === 0 ? false : botconfs.tickets[req.params.ticketid].answers,
				status: botconfs.tickets[req.params.ticketid].status === 'open' ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/tickets/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/tickets`,
				query: {
					submittickets: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/tickets/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/tickets`,
				query: {
					submittickets: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/tickets', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (client.guildconfs.get(dashboardid).dashboardticketpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardticketpermissions) !== client.guildconfs.get(dashboardid).dashboardticketpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].reactionnumber = client.guildconfs.get(req.user.guilds[index].id).application.reactionnumber;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const botconfs = client.botconfs.get('botconfs');
			const newobject = {};
			const oldobject = {};

			for (const index2 in botconfs.tickets) {
				if (botconfs.tickets[index2].guildid === dashboardid && botconfs.tickets[index2].status === 'open') {
					newobject[index2] = botconfs.tickets[index2];
					botconfs.tickets[index2].author = client.users.get(botconfs.tickets[index2].authorid).tag;
					botconfs.tickets[index2].newdate = moment(botconfs.tickets[index2].date).format('MMMM Do YYYY, h:mm:ss a');
				}
				if (botconfs.tickets[index2].guildid === dashboardid && botconfs.tickets[index2].status === 'closed') {
					oldobject[index2] = botconfs.tickets[index2];
					botconfs.tickets[index2].author = client.users.get(botconfs.tickets[index2].authorid).tag;
					botconfs.tickets[index2].newdate = moment(botconfs.tickets[index2].date).format('MMMM Do YYYY, h:mm:ss a');
				}
			}

			const tableload = client.guildconfs.get(dashboardid);
			const commands = client.commands.filter(r => r.help.category === 'tickets' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			const roles = client.guilds.get(dashboardid).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardtickets', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				ticketszero: Object.keys(newobject).length === 0 ? false : true,
				tickets: newobject,
				ticketszeroold: Object.keys(oldobject).length === 0 ? false : true,
				oldtickets: oldobject,
				commands: commands,
				submittickets: req.query.submittickets ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/customcommands/customcommand/:command/submitdeletecommand', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);

			for (let i = 0; i < tableload.customcommands.length; i++) {
				if (tableload.customcommands[i].name === req.params.command.toLowerCase()) {
					tableload.customcommands.splice(i, 1);
				}
			}

			tableload.globallogs.push({
				action: `Deleted the "${req.params.command}" custom command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/customcommands`,
				query: {
					submitcustomcommands: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/customcommands/customcommand/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);

			for (let i = 0; i < tableload.customcommands.length; i++) {
				if (tableload.customcommands[i].name === req.params.command.toLowerCase()) {
					tableload.customcommands[i].enabled = req.body.statuschange;
				}
			}

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" custom command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/customcommands`,
				query: {
					submitcustomcommands: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/customcommands/customcommand/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = await client.guildconfs.get(dashboardid);

			let newDescription;
			const newResponse = req.body.newcommandanswer;
			if (req.body.newdescription) {
				newDescription = req.body.newdescription;
			}

			for (let i = 0; i < tableload.customcommands.length; i++) {
				if (tableload.customcommands[i].name === req.params.command.toLowerCase()) {
					tableload.customcommands[i].description = newDescription;
					tableload.customcommands[i].commandanswer = newResponse;
				}
			}

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" custom command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/customcommands`,
				query: {
					submitcustomcommands: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/customcommands/:command/submitcommandstatuschange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].status = req.body.statuschange;

			tableload.globallogs.push({
				action: `Activated/Deactivated the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/customcommands`,
				query: {
					submitcustomcommands: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/customcommands/:command/submitcommandchange', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			tableload.commands[req.params.command].bannedchannels = req.body.newblacklistedchannels;

			const channelsarray = [];
			const rolesarray = [];
			const whitelistedrolesarray = [];
			let newcooldown = '';
			if (req.body.newblacklistedchannels) {
				if (Array.isArray(req.body.newblacklistedchannels)) {
					for (let i = 0; i < req.body.newblacklistedchannels.length; i++) {
						channelsarray.push(req.body.newblacklistedchannels[i]);
					}
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				} else {
					channelsarray.push(req.body.newblacklistedchannels);
					tableload.commands[req.params.command].bannedchannels = channelsarray;
				}
			} else {
				tableload.commands[req.params.command].bannedchannels = [];
			}

			if (req.body.newblacklistedroles) {
				if (Array.isArray(req.body.newblacklistedroles)) {
					for (let i = 0; i < req.body.newblacklistedroles.length; i++) {
						rolesarray.push(req.body.newblacklistedroles[i]);
					}
					tableload.commands[req.params.command].bannedroles = rolesarray;
				} else {
					rolesarray.push(req.body.newblacklistedroles);
					tableload.commands[req.params.command].bannedroles = rolesarray;
				}
			} else {
				tableload.commands[req.params.command].bannedroles = [];
			}

			if (req.body.newwhitelistedroles) {
				if (Array.isArray(req.body.newwhitelistedroles)) {
					for (let i = 0; i < req.body.newwhitelistedroles.length; i++) {
						whitelistedrolesarray.push(req.body.newwhitelistedroles[i]);
					}
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				} else {
					whitelistedrolesarray.push(req.body.newwhitelistedroles);
					tableload.commands[req.params.command].whitelistedroles = whitelistedrolesarray;
				}
			} else {
				tableload.commands[req.params.command].whitelistedroles = [];
			}

			newcooldown = Number(req.body.newcooldown) * 1000;
			tableload.commands[req.params.command].cooldown = `${newcooldown}`;

			tableload.globallogs.push({
				action: `Changed the settings of the "${req.params.command}" command!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/customcommands`,
				query: {
					submitcustomcommands: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/customcommands', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (client.guildconfs.get(dashboardid).dashboardticketpermissions) {
				if (((req.user.guilds[index].permissions) & client.guildconfs.get(dashboardid).dashboardticketpermissions) !== client.guildconfs.get(dashboardid).dashboardticketpermissions) return res.redirect('/servers');
			} else if (((req.user.guilds[index].permissions) & 6) !== 6) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			req.user.guilds[index].reactionnumber = client.guildconfs.get(req.user.guilds[index].id).application.reactionnumber;

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const tableload = client.guildconfs.get(dashboardid);
			const commands = client.commands.filter(r => r.help.category === 'customcommands' && r.conf.dashboardsettings === true).array();
			for (let i = 0; i < commands.length; i++) {
				const englishstrings = require('./languages/en-US.json');
				commands[i].help.description = englishstrings[`${commands[i].help.name}_description`];
				if (tableload.commands[commands[i].help.name].status === 'true') {
					commands[i].conf.enabled = true;
				} else {
					commands[i].conf.enabled = false;
				}

				commands[i].bannedchannels = tableload.commands[commands[i].help.name].bannedchannels;
				commands[i].bannedroles = tableload.commands[commands[i].help.name].bannedroles;
				commands[i].whitelistedroles = tableload.commands[commands[i].help.name].whitelistedroles;
				commands[i].cooldown = tableload.commands[commands[i].help.name].cooldown / 1000;
			}

			if (!tableload.customcommands) {
				tableload.customcommands = [];
				await client.guildconfs.set(dashboardid, tableload);
			}

			const customcommands = tableload.customcommands;

			for (let index2 = 0; index2 < tableload.customcommands.length; index2++) {
				if (client.users.get(tableload.customcommands[index2].creator)) {
					customcommands[index2].newcreator = client.users.get(tableload.customcommands[index2].creator).tag;
				}
				customcommands[index2].newcommandCreatedAt = new Date(tableload.customcommands[index2].commandCreatedAt).toUTCString();
				customcommands[index2].newstatus = tableload.customcommands[index2].enabled === 'true' ? true : false;
			}

			const roles = client.guilds.get(dashboardid).roles.filter(r => r.name !== '@everyone').array();

			return res.render('dashboardcustomcommands', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				roles: roles,
				commands: commands,
				customcommands: customcommands,
				isCustomCommands: customcommands.length === 0 ? false : true,
				submitcustomcommands: req.query.submitcustomcommands ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.post('/dashboard/:id/modules/submitmodules', async (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const tableload = client.guildconfs.get(dashboardid);

			const name = Object.keys(req.body)[0];
			tableload.modules[name.toLowerCase()] = req.body[name];

			if (!tableload.globallogs) {
				tableload.globallogs = [];
				client.guildconfs.set(dashboardid, tableload);
			}

			tableload.globallogs.push({
				action: `Activated/Deactivated the ${Object.keys(req.body)[0]} module!`,
				username: req.user.username,
				date: Date.now(),
				showeddate: new Date().toUTCString()
			});

			await client.guildconfs.set(dashboardid, tableload);

			return res.redirect(url.format({
				pathname: `/dashboard/${dashboardid}/modules`,
				query: {
					submitmodules: true
				}
			}));
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/modules', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const channels = client.guilds.get(req.user.guilds[index].id).channels.filter(textChannel => textChannel.type === `text`).array();
			const check = req.user.guilds[index];

			const modules = {};

			const tableload = client.guildconfs.get(dashboardid);

			const moduleslist = ['Moderation', 'Help', 'Music', 'Fun', 'Searches', 'NSFW', 'Utility', 'Application', 'Currency', 'Tickets', 'Customcommands'];

			for (let i = 0; i < moduleslist.length; i++) {
				const config = {
					name: '',
					description: '',
					status: ''
				};

				config.name = moduleslist[i];

				const lang = require('./languages/en-US.json');
				config.description = lang[`modules_${moduleslist[i].toLowerCase()}`];

				if (tableload.modules[moduleslist[i].toLowerCase()] === 'true') {
					config.status = true;
				} else {
					config.status = false;
				}

				modules[moduleslist[i].toLowerCase()] = config;
			}

			return res.render('dashboardmodules', {
				user: req.user,
				guilds: check,
				client: client,
				channels: channels,
				modules: modules,
				submitmodules: req.query.submitmodules ? true : false
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/dashboard/:id/lastlogs', (req, res) => {
	try {
		const dashboardid = res.req.originalUrl.substr(11, 18);
		if (req.user) {
			let index = -1;
			for (let i = 0; i < req.user.guilds.length; i++) {
				if (req.user.guilds[i].id === dashboardid) {
					index = i;
				}
			}

			if (index === -1) return res.redirect('/servers');

			if (!client.guildconfs.get(dashboardid).dashboardpermissionroles) {
				client.guildconfs.get(dashboardid).dashboardpermissionroles = [];
			}

			if (client.guildconfs.get(dashboardid).dashboardpermissionroles.length !== 0 && client.guilds.get(dashboardid).ownerID !== req.user.id) {
				let allwhitelistedrolesoftheuser = 0;

				for (let index2 = 0; index2 < client.guildconfs.get(dashboardid).dashboardpermissionroles.length; index2++) {
					if (!client.guilds.get(dashboardid).members.get(req.user.id)) return res.redirect('/servers');
					if (!client.guilds.get(dashboardid).members.get(req.user.id).roles.has(client.guildconfs.get(dashboardid).dashboardpermissionroles[index2])) {
						allwhitelistedrolesoftheuser += 1;
					}
				}
				if (allwhitelistedrolesoftheuser === client.guildconfs.get(dashboardid).dashboardpermissionroles.length) {
					return res.redirect('/servers');
				}
			} else if (((req.user.guilds[index].permissions) & 8) !== 8) {
				return res.redirect('/servers');
			}

			if (!client.guilds.get(req.user.guilds[index].id)) return res.redirect('/servers');

			const check = req.user.guilds[index];
			let logs;

			if (client.guildconfs.get(dashboardid).globallogs) {
				const thelogs = client.guildconfs.get(dashboardid).globallogs;
				logs = thelogs.sort((a, b) => {
					if (a.date < b.date) {
						return 1;
					}
					if (a.date > b.date) {
						return -1;
					}
					return 0;
				});
			} else {
				logs = null;
			}

			return res.render('dashboardlastlogs', {
				user: req.user,
				guilds: check,
				client: client,
				logs: logs
			});
		}
		return res.redirect('/nologin');
	} catch (error) {
		return res.redirect(url.format({
			pathname: `/error`,
			query: {
				statuscode: 500,
				message: error.message
			}
		}));
	}
});

app.get('/error', (req, res) => {
	const check = [];
	if (req.user) {
		for (let i = 0; i < req.user.guilds.length; i++) {
			if (((req.user.guilds[i].permissions) & 8) === 8) {
				check.push(req.user.guilds[i]);
			}
		}
	}

	let fix = false;
	let howtofix = '';

	if (req.query.message === "Cannot read property 'prefix' of null") {
		fix = true;
		howtofix = 'Write a textmessage in a textchannel on your discord server';
	}
	if (req.query.message === "Cannot read property 'dashboardpermissionroles' of null") {
		fix = true;
		howtofix = 'Write a textmessage in a textchannel on your discord server';
	}

	res.render('error', {
		user: req.user,
		guilds: check,
		client: client,
		statuscode: req.query.statuscode,
		message: req.query.message,
		fix: fix,
		howtofix: howtofix
	});
});

// catch error and forward to error handler


app.use((req, res) => {
	const err = new Error('Not Found');
	err.status = 404;
	return res.redirect(url.format({
		pathname: `/error`,
		query: {
			statuscode: 404,
			message: 'Page not found'
		}
	}));
});
