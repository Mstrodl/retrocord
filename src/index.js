#!/usr/bin/env node

const logo = `______ _____ ___________ _____ _____ _________________
| ___ \\  ___|_   _| ___ \\  _  /  __ \\  _  | ___ \\  _  \\
| |_/ / |__   | | | |_/ / | | | /  \\/ | | | |_/ / | | |
|    /|  __|  | | |    /| | | | |   | | | |    /| | | |
| |\\ \\| |___  | | | | \\ \\ \\_/ / \\__/\\ \\_/ / |\\ \\| |/ /
\\_| \\_\\____/  \\_/ \\_| \\_|\\___/ \\____/\\___/\\_| \\_|___/
                   The best in life
`;

const fs = require('fs');
const os = require('os');
const path = require('path');
const Discord = require('discord.js');
const vorpal = require('vorpal')();
const spinner = require('ora')('Loading...').start();
const center = require('./util/center');
const hexToRgb = require('./util/hexToRgb');
const chalk = vorpal.chalk;
const colors = require('ansi-256-colors');
const emoji = require('node-emoji');
const username = require('./util/username');
const LocalStorage = require('node-localstorage').LocalStorage;
const getTermInfo = require('./util/getTermInfo');

const lp = (v, n, c = '0') => String(v).length >= n ? `${v}` : (String(c).repeat(n) + v).slice(-n);

const timestamp = vorpal.timestamp = (d = new Date(), mdy = false) =>
  `${mdy ? `${lp(d.getFullYear().toString(), 2)}-${lp((d.getMonth() + 1).toString(), 2)}-${lp(d.getDate().toString(), 2)} ` : ''}
${lp(d.getHours().toString(), 2)}:
${lp(d.getMinutes().toString(), 2)}:
${lp(d.getSeconds().toString(), 2)}
`.replace(/\n/g, '');

const logMessage = vorpal.logMessage = (message) => {
  let name = message.author.username;
  let color = (...x) => colors.fg.getRgb(5, 5, 5) + x.join(' ') + colors.reset;
  let content = message.content;

  for (const mention of message.mentions.users.values()) {
    if (mention.id === client.user.id) {
      content = content.replace(new RegExp(`<@!?${mention.id}>`, 'g'), chalk.red.bold(`@${client.user.username}`));
      process.stdout.write('\x07');
    } else {
      content = content.replace(new RegExp(`<@!?${mention.id}>`, 'g'), `@${mention.username}`);
    }
  }

  if (message.member) {
    color = (...x) => {
      const role = message.member.roles.filter(r => r.color !== 0).last();
      if (!role) return colors.fg.getRgb(5, 5, 5) + x.join(' ') + colors.reset;
      const c = hexToRgb(role.hexColor);
      return colors.fg.getRgb(c.r, c.g, c.b) + x.join(' ') + colors.reset;
    };
  }

  for (const match of content.match(/:[^:]+:/g) || []) content = content.replace(match, emoji.get(match));

  if (message.type !== 'DEFAULT') {
    switch (message.type) {
      case 'RECIPIENT_ADD':
        break;
      case 'RECIPIENT_REMOVE':
        break;
      case 'CALL':
        break;
      case 'CHANNEL_NAME_CHANGE':
        break;
      case 'CHANNEL_ICON_CHANGE':
        break;
      case 'PINS_ADD':
        vorpal.log(`${chalk.yellow(timestamp(message.createdAt))} ${color(`${name}#${message.author.discriminator}`)} ${chalk.bold('pinned a message!')}`);
        break;
      default:
        break;
    }
  } else {
    vorpal.log(`${chalk.yellow(timestamp(message.createdAt))} ${color(`${name}#${message.author.discriminator}`)} ${content}`);
  }
};

const client = vorpal.discord = new Discord.Client();
const uname = username();
const termInfo = getTermInfo();

const DELIMITER = termInfo.font.toLowerCase().includes('nerd') ? '' : '>';

const OS_STORAGE_PATHS = {
  linux: '/home/{user}/.retrocord',
  win32: 'C:\\Users\\{user}\\AppData\\Roaming\\retrocord',
  darwin: '/Users/{user}/Library/Application Support/retrocord',
};

const OS_STORAGE_PATH = OS_STORAGE_PATHS[os.platform()].replace('{user}', uname);

if (!fs.existsSync(OS_STORAGE_PATH)) {
  console.warn(`New storage cache in \`${OS_STORAGE_PATH}\``);
  fs.mkdirSync(OS_STORAGE_PATH);
}

const LOCALSTORAGE_PATH = path.join(OS_STORAGE_PATH, 'cache');

if (!fs.existsSync(LOCALSTORAGE_PATH)) fs.mkdirSync(LOCALSTORAGE_PATH);

const localStorage = new LocalStorage(LOCALSTORAGE_PATH);

vorpal.current = {};

vorpal.find('help').remove();
vorpal.find('exit').remove();

require('./commands/help')(vorpal);
require('./commands/join')(vorpal);
require('./commands/nick')(vorpal);
require('./commands/search')(vorpal);
require('./commands/shrug')(vorpal);
require('./commands/catcher')(vorpal);
require('./commands/game')(vorpal);

vorpal.command('/exit', 'exit').action(() => {
  vorpal.log('bye!');
  process.exit(0);
});

vorpal.command('/login <token>')
  .action((args, cb) => {
    localStorage.setItem('token', args.token);
    vorpal.log(chalk.bold('Token saved, use /logout to log out, or /exit to exit'));
    client.login(args.token).then(() => cb()).catch(() => {
      localStorage.removeItem('token');
      vorpal.log(chalk.bold('INVALID TOKEN!'));
      client.destroy();
      process.exit();
    });
  });

vorpal.command('/logout')
  .action((args, cb) => {
    localStorage.removeItem('token');
    client.destroy();
    process.exit();
    return cb();
  });

client.on('message', message => {
  if (message.channel.id !== vorpal.current.channel) return;
  if (client.user.blocked.has(message.author.id)) return;
  logMessage(message);
});

client.once('ready', () => {
  spinner.stop();
  if (client.user.bot) {
    vorpal.log(chalk.yellow.bold('NO BOTS'));
    localStorage.removeItem('token');
    client.destroy();
    process.exit();
  }
  console.log(center(logo));
  console.log(center(`Connected as ${client.user.username}#${client.user.discriminator}`));
  if (client.user.premium) console.log(center(' 🎉  with Discord Nitro! 🎉'));
  console.log('\n');
  vorpal.delimiter(DELIMITER).show();
});

vorpal.history('retrocord');
let token = localStorage.getItem('token');
if (!token) {
  spinner.stop();
  vorpal.delimiter(DELIMITER).show();
  vorpal.log(chalk.bold('You are not logged in, please use the login command!'));
} else {
  client.login(token).catch(() => {
    localStorage.removeItem('token');
    vorpal.log(chalk.bold('INVALID TOKEN!'));
    client.destroy();
    process.exit();
  });
}
