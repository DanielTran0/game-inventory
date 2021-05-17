const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const multer = require('multer');
const compression = require('compression');
const helmet = require('helmet');
const indexRouter = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const fileStorageEngine = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, 'public', 'images'));
	},
	filename: (req, file, cb) => {
		cb(null, `${Date.now()} -- ${file.originalname}`);
	},
});
const upload = multer({
	storage: fileStorageEngine,
	fileFilter: (req, file, cb) => {
		if (['image/png', 'image/jpeg'].includes(file.mimetype))
			return cb(null, true);

		return cb(null, false);
	},
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
	upload.single('image', (req, res, next) => {
		next();
	})
);

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	next(createError(404));
});

// error handler
app.use((err, req, res) => {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
