var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var mkdirp = require('mkdirp');
var touch = require('touch');

const { stringify } = require('querystring');

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const networks = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      if (!networks[name]) {
        networks[name] = [];
      }
      networks[name].push(net.address);
    }
  }
}

const logFile = 'dist/log.json';

mkdirp.sync(path.dirname(logFile));

function writeSync(data) {
  let data_str = JSON.stringify(data, null, 2);
  fs.writeFileSync(logFile, data_str);
  fs.writeFileSync(logFile + (new Date()).toISOString().replace(/[:.]/g, "_"), data_str); // write backup
}

function getData() {
  try {
    return JSON.parse(fs.readFileSync(logFile));
  } catch (e) {
    return {
      teams: ["team1", "team2"],
      answers: { 1: 123, 2: 456, 3: 789 },
      submissions: [],
    };
  }
}

writeSync(getData())

app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

app.use('/jquery', express.static('node_modules/jquery/dist/'));
app.use('/bootstrap', express.static('node_modules/bootstrap/dist/'));

let html = `
  <style>
    li { width: 300px; clear: both }
    label input { float: right }
  </style>
  <form method=POST>
    <li><label>team<input autocomplete=off name=team /></label>
    <li><label>question<input autocomplete=off name=question /></label>
    <li><label>from<input autocomplete=off name=from /></label>
    <li><label>to<input autocomplete=off name=to /></label>
    <li><input type=submit />
  </form>
`;

app.use(express.static('css'));
app.use(express.static('js'));

app.get('/', function (req, res) {
  res.sendFile('scoreboard.html', { root: 'html' });
});

app.get('/log', function (req, res) {
  res.json(getData());
});

app.get('/metadata', function (req, res) {
  let data = getData();
  res.send(JSON.stringify({ teams: data["teams"], answers: data["answers"] }, null, 4));
});

app.post('/metadata', function (req, res) {
  let metadata = JSON.parse(req.body.value);
  let data = getData();
  data.teams = metadata.teams;
  data.answers = metadata.answers;
  writeSync(data);
  res.send("OK");
});

app.post('/add', function (req, res) {
  // This should be synchronous operation so that no two clients write at the same time
  let newRow = {
    date: Date.now(),
    team: +req.body.team,
    question: (+req.body.question),
    from: req.body.from,
    to: req.body.to,
  };
  let data = getData();
  data.submissions.push(newRow);
  writeSync(data);

  res.send('added:' + JSON.stringify(newRow) + html);
});

app.get('/add', function (req, res) {
  res.send(html);
});

app.post('/remove', function (req, res) {
  let data = getData();
  data.submissions = data.submissions.filter(sub => sub.date != req.body.date);
  writeSync(data);

  res.send('removed:' + req.body.date);
});

app.post('/clearall', function (req, res) {
  let data = getData();
  data.submissions = [];
  writeSync(data);

  res.send('clear all');
});

app.listen(3000, '0.0.0.0', function () {
  console.log('Estimathon app running on http://0.0.0.0:3000');
  console.log('IP addresses:');
  console.log(JSON.stringify(networks, null, 4));
});
