const fs = require('fs');

const bodyParser = require('body-parser');
const cors = require('cors');
const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');

const server = jsonServer.create();
const router = jsonServer.router('./database.json');
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));
const hoteldb = JSON.parse(fs.readFileSync('./hotels.json', 'UTF-8'));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = '12345';

const expiresIn = '1h';

// Create a token from a payload
function createToken(payload) {
	return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
	return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
}

// Check if the user exists in database
function isAuthenticated({ email, phone }) {
	return userdb.users.findIndex((user) => user.email === email && user.phone === phone) !== -1;
}

function addReview(id, newReview,jsonObj) {
  console.log("in")
  for (var i = 0; i < jsonObj.length; i++) {
    if (jsonObj[i].id == id) {
      console.log(jsonObj[i].id)
      jsonObj[i].reviews = jsonObj[i].reviews.concat([newReview]);
      return;
    }
  }
}

// Register New User
server.post('/register', (req, res) => {
	console.log('register endpoint called; request body:');
	console.log(req.body);
	const { email, password, address, phone, name } = req.body;

	if (isAuthenticated({ email, phone }) === true) {
		const status = 401;
		const message = 'Email and phone already exist';
		res.status(status).json({ status, message });
		return;
	}

	fs.readFile('./users.json', (err, data) => {
		if (err) {
			const status = 401;
			const message = err;
			res.status(status).json({ status, message });
			return;
		}

		// Get current users data
		var data = JSON.parse(data.toString());

		// Get the id of last user
		var last_item_id = data.users[data.users.length - 1].id;

		//Add new user
		data.users.push({
			id: last_item_id + 1,
			email: email,
			password: password,
			address: address,
			phone: phone,
			name: name,
		}); //add some data
		var writeData = fs.writeFile('./users.json', JSON.stringify(data), (err, result) => {
			// WRITE
			if (err) {
				const status = 401;
				const message = err;
				res.status(status).json({ status, message });
				return;
			}
		});
	});
  req.cookies.id = last_item_id + 1;
	// Create token for new user
	const access_token = createToken({ email, password });
	console.log('Access Token:' + access_token);
	res.status(200).json({ access_token });
});

// -------------->
// Login to one of the users from ./users.json
server.post('/login', (req, res) => {
	console.log('login endpoint called; request body:');
	console.log(req.body);
	const { email, password } = req.body;
	if (isAuthenticated({ email, password }) === false) {
		const status = 401;
		const message = 'Incorrect email or password';
		res.status(status).json({ status, message });
		return;
	}
	const access_token = createToken({ email, password });
	console.log('Access Token:' + access_token);
	res.status(200).json({ access_token });
});

//-------------------------> Add Review
server.post('/addReview/:hotel', (req, res) => {
	console.log('addReview endpoint called call with params; request params:');
	console.log(req.params.hotel);
	console.log(req.body);
	const { reviews } = req.body;
	var hotel_id = req.params.hotel;
  /**/
	fs.readFile('./hotels.json', (err, data) => {
		if (err) {
			const status = 401;
			const message = err;
			res.status(status).json({ status, message });
			return;
		}

		// Get current hotels data
		var data = JSON.parse(data.toString());
    // console.log(data.hotels);
		// Get the id of last user
    const result = hoteldb.hotels.filter((item) => {item.id == hotel_id});
    
    //add review data
    addReview(hotel_id,reviews,data.hotels)
    //console.log(data.hotels);
		var writeData = fs.writeFile('./hotels.json', JSON.stringify(data), (err, result) => {
			// WRITE
			if (err) {
				const status = 401;
				const message = err;
				res.status(status).json({ status, message });
				return;
			}
		});
  });
  res.status(200).json({ message:"Review Addded Successfully" });
});

//--------------------------- post => /bookRoom/:hotel
server.post('/bookRoom/:hotel', (req, res) => {
	console.log('bookRoom endpoint ; request params:');
  const { startDate,endDate,noOfPersons,noOfRooms,typeOfRoom,hotelName } = req.body;
  //var userId = req.cookies.id;
  var hotelId = req.params.hotel;
  console.log({ startDate,endDate,noOfPersons,noOfRooms,typeOfRoom,hotelName });
	fs.readFile('./bookings.json', (err, data) => {
		if (err) {
			const status = 401;
			const message = err;
			res.status(status).json({ status, message });
			return;
		}
		// Get current hotels data
    var data = JSON.parse(data.toString());
    var last_item_id = data.bookings[data.bookings.length - 1].id;
    data.bookings.push({
      id: last_item_id+1,
      //userId: userId, 
      hotelId: hotelId,
      startDate: startDate,
      endDate: endDate,
      noOfPersons: noOfPersons,
      noOfRooms: noOfRooms,
      typeOfRoom: typeOfRoom,
      hotelName: hotelName})

		var writeData = fs.writeFile('./booking.json', JSON.stringify(data), (err, result) => {
			// WRITE
			if (err) {
				const status = 401;
				const message = err;
				res.status(status).json({ status, message });
				return;
			}
		});
  });
  res.status(200).json({ message:"Booking Successful" });
});






server.use(/^(?!\/).*$/, (req, res, next) => {
	if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
		const status = 401;
		const message = 'Error in authorization format';
		res.status(status).json({ status, message });
		return;
	}
	try {
		let verifyTokenResult;
		verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

		if (verifyTokenResult instanceof Error) {
			const status = 401;
			const message = 'Access token not provided';
			res.status(status).json({ status, message });
			return;
		}
		next();
	} catch (err) {
		const status = 401;
		const message = 'Error access_token is revoked';
		res.status(status).json({ status, message });
	}
});



server.use(router);

server.listen(8000, () => {
	console.log('Run Auth API Server');
});
