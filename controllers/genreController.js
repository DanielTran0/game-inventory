const { body, validationResult } = require('express-validator');
const async = require('async');
const db = require('../db');

const genreCoreDatabaseCalls = (id) => {
	return {
		genre: async () => {
			return db.oneOrNone('SELECT * FROM genre WHERE id = $1', [id]);
		},
		gamegenres: async () => {
			return db.any('SELECT * FROM gamegenre WHERE genreid = $1', [id]);
		},
		games: async () => {
			return db.any('SELECT * FROM game');
		},
	};
};

const findGamesFromIds = (gameGenres, games) => {
	const gameIds = gameGenres.map((gameGenre) => gameGenre.gameid);
	return games.filter((game) => gameIds.includes(game.id));
};

// Display list of all genres
exports.genre_list = async (req, res, next) => {
	try {
		const genres = await db.any('SELECT * FROM genre');
		res.render('./genre/genre_list', {
			title: 'All Genres',
			genres,
		});
	} catch (error) {
		next(error);
	}
};

// Display details about a specific genre
exports.genre_detail = (req, res, next) => {
	async.parallel(genreCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.genre === null) {
			const error = new Error('Genres not found');
			return next(error);
		}

		const games = findGamesFromIds(results.gamegenres, results.games);

		return res.render('./genre/genre_detail', {
			title: results.genre.name,
			genre: results.genre,
			games,
		});
	});
};

// Display genre create form on GET
exports.genre_create_get = (req, res) => {
	res.render('./genre/genre_form', { title: 'Add Genre' });
};

// Handle genre create on POST
exports.genre_create_post = [
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum genre name length is 3')
		.escape(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const { name } = req.body;

		if (!errors.isEmpty()) {
			return res.render('./genre/genre_form', {
				title: 'Create Genre',
				genre: { name },
				errors: errors.array(),
			});
		}

		try {
			const genreExists = await db.oneOrNone(
				'SELECT id FROM genre WHERE name = $1',
				[name]
			);

			if (genreExists) {
				return res.redirect(`/genre/${genreExists.id}`);
			}

			const newGenre = await db.one(
				'INSERT INTO genre(name) VALUES($1) RETURNING id',
				[name]
			);

			return res.redirect(`/genre/${newGenre.id}`);
		} catch (error) {
			return next(error);
		}
	},
];

// Display genre update form on GET
exports.genre_update_get = async (req, res, next) => {
	try {
		const genre = await db.oneOrNone('SELECT * FROM genre WHERE id = $1', [
			req.params.id,
		]);

		if (genre === null) {
			const error = new Error('Genre not found');
			return next(error);
		}

		return res.render('./genre/genre_form', { title: 'Update Genre', genre });
	} catch (error) {
		return next(error);
	}
};

// Handle genre update on POST
exports.genre_update_post = [
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum genre name length is 3')
		.escape(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const genre = req.body.name;

		if (!errors.isEmpty())
			return res.render('./genre/genre_form', {
				title: 'Update Genre',
				genre,
				errors: errors.array(),
			});

		try {
			const genreExists = await db.oneOrNone(
				'SELECT * FROM genre WHERE name = $1',
				[genre]
			);

			if (genreExists && genreExists.id !== Number(req.params.id))
				return res.redirect(`/genre/${genreExists.id}`);

			await db.none('UPDATE genre SET name = $1 WHERE id = $2', [
				genre,
				req.params.id,
			]);
			return res.redirect(`/genre/${req.params.id}`);
		} catch (error) {
			return next(error);
		}
	},
];

// Display genre delete form on GET
exports.genre_delete_get = (req, res, next) => {
	async.parallel(genreCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.genre === null) return res.redirect('/genres');

		const games = findGamesFromIds(results.gamegenres, results.games);

		return res.render('./genre/genre_delete', {
			title: 'Delete Genre',
			genre: results.genre,
			games,
		});
	});
};

// Handle genre delete on POST
exports.genre_delete_post = async (req, res, next) => {
	async.parallel(genreCoreDatabaseCalls(req.body.id), async (err, results) => {
		if (err) return next(err);

		const games = findGamesFromIds(results.gamegenres, results.games);

		if (games.length > 0)
			return res.render('./genre/genre_delete', {
				title: 'Delete Genre',
				genre: results.genre,
				games,
			});

		try {
			await db.none('DELETE FROM genre WHERE id = $1', [req.body.id]);
			return res.redirect('/genres');
		} catch (error) {
			return next(error);
		}
	});
};
