const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:4200'
}));

let scores = {
    red: 0,
    blue: 0
};

let judgeVotes = {
    red: Array(5).fill(undefined),
    blue: Array(5).fill(undefined)
};

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', ws => {
    ws.on('message', message => {
        console.log(`Received message => ${message}`);
    });
});

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
};

// Middleware to check if judge ID is valid
app.use((req, res, next) => {
    if (req.body.judgeId < 1 || req.body.judgeId > 5) {
        return res.status(400).send('Invalid judge ID');
    }
    next();
});

app.post('/vote', (req, res) => {
    const { judgeId, team, vote } = req.body;
    if (!['red', 'blue'].includes(team) || ![1, -1].includes(vote)) {
        return res.status(400).send('Invalid team or vote');
    }

    // Record the vote
    judgeVotes[team][judgeId - 1] = vote;

    // Count votes
    const votes = judgeVotes[team].filter(v => v !== undefined);
    const positiveVotes = votes.filter(v => v === 1).length;
    const negativeVotes = votes.filter(v => v === -1).length;

    if (positiveVotes >= 3) {
        scores[team] += 1;
        judgeVotes[team] = Array(5).fill(undefined);
        broadcast({ team, score: scores[team] });
        return res.status(200).send(`Score updated for team ${team}. New score: ${scores[team]}`);
    }

    if (negativeVotes >= 3) {
        scores[team] -= 1;
        judgeVotes[team] = Array(5).fill(undefined);
        broadcast({ team, score: scores[team] });
        return res.status(200).send(`Score updated for team ${team}. New score: ${scores[team]}`);
    }

    res.status(200).send(`Vote recorded for team ${team}`);
});

app.post('/reset', (req, res) => {
    scores = {
        red: 0,
        blue: 0
    };
    judgeVotes = {
        red: Array(5).fill(undefined),
        blue: Array(5).fill(undefined)
    };
    broadcast({ red: scores.red, blue: scores.blue });
    res.status(200).send('Scores reset');
});

app.get('/scores', (req, res) => {
    res.status(200).send(scores);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
