let express = require( 'express' );
const fs = require('fs');
let app = express();
let server = require( 'http' ).Server( app );
let io = require( 'socket.io' )( server );
let stream = require( './src/js/stream' );
let path = require( 'path' );
let favicon = require( 'serve-favicon' );

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use( favicon( path.join( __dirname, './src/images/magic.png' ) ) );
app.use(express.static(__dirname + '/src'));

app.get( '/', ( req, res ) => {
    res.sendFile( __dirname + '/src/index.html' );
} );

io.of( '/stream' ).on( 'connection', stream );

server.listen( 3000 );
let activeUsers = [];

app.post('/submit-login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = {
        username: username,
        password: password
    };

    const response = checkUserInJSON(user);
    if (response.error) {
        res.status(400).send(response.error);
    }
    else {
        const socket = io.of('/stream').connected[req.body.socketId];
        if (socket) {
            socket.username = username;
        }
        
        updateUserStatusAndNotify(username, 'active');
        res.status(200).send(response.success);
    }

});

app.post('/submit-signup', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;

    const user = {
        username: username,
        password: password,
        email: email,
        status: 'inactive'
    };

    const response = addUserToJSON(user);

    if (response.error) {
        res.status(400).send(response.error);
    } else {        
        res.status(200).send(response.success);
    }

});


function addUserToJSON(user) {
    // Check if Users.json file exists
    if (fs.existsSync('Users.json')) {
        // File exists, read contents
        const usersData = JSON.parse(fs.readFileSync('Users.json'));

        // Check if username already exists
        if (usersData[user.username]) {
            return { error: 'Username already exists' };
        } else {
            // Add user to existing data
            usersData[user.username] = user;
            fs.writeFileSync('Users.json', JSON.stringify(usersData));
            return { success: 'User added successfully' };
        }
    } else {
        const newUserObject = {
            [user.username]: user
        };
        fs.writeFileSync('Users.json', JSON.stringify(newUserObject));
        return { success: 'File created and user added successfully' };
    }
}


function checkUserInJSON(user) {
    if (fs.existsSync('Users.json')) {
        const usersData = JSON.parse(fs.readFileSync('Users.json'));

        if (usersData[user.username]) {
            if (usersData[user.username].password === user.password) {
                return { success: 'Login successful' };
            } else {
                return { error: 'Incorrect password' };
            }
        } else {
            return { error: 'User not found' };
        }
    } else {
        return { error: 'User not found' };
    }
}

function updateUserStatusAndNotify(username, status) {
    if (status === 'active') {
        activeUsers.push(username);
    } else {
        activeUsers = activeUsers.filter(user => user !== username);
    }

    let users = [];
    if (fs.existsSync('Users.json')) {
        users = JSON.parse(fs.readFileSync('Users.json'));
    }

    users[username].status = status;

    fs.writeFileSync('Users.json', JSON.stringify(users));
}

app.get('/active-users', (req, res) => {
    res.json({ activeUsers });
});

app.post('/update-user-status', (req, res) => {
    const { username, status } = req.body;

    updateUserStatusAndNotify(username, status);
    res.sendStatus(200);
});
