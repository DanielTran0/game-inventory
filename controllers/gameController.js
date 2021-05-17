const { body, validationResult } = require('express-validator');
const async = require('async');
const db = require('../db');

const gameCoreDatabaseCalls = (id) => {
	return {
		game: async () => {
			return db.oneOrNone('SELECT * FROM game WHERE id = $1', [id]);
		},
		gamecompany: async () => {
			return db.oneOrNone('SELECT * FROM gamecompany WHERE gameid = $1', [id]);
		},
		gamegenres: async () => {
			return db.any('SELECT * FROM gamegenre WHERE gameid = $1', [id]);
		},
		companies: async () => {
			return db.any('SELECT * FROM company');
		},
		genres: async () => {
			return db.any('SELECT * FROM genre');
		},
	};
};

const findCompanyFromId = (gamecompany, companies) => {
	return companies.filter((company) => gamecompany.companyid === company.id);
};

const findGenresFromIds = (gamegenres, genres) => {
	const genreIds = gamegenres.map((gamegenre) => gamegenre.genreid);
	return genres.filter((genre) => genreIds.includes(genre.id));
};

// Display index page
exports.index = (req, res) => {
	res.redirect('/games');
};

// Display list of all games
exports.game_list = async (req, res, next) => {
	try {
		const games = await db.any('SELECT * FROM game');
		res.render('./game/game_list', { title: 'All Games', games });
	} catch (error) {
		next(error);
	}
};

// Display details about a specific game
exports.game_detail = (req, res, next) => {
	async.series(gameCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.game === null) {
			const error = new Error('Game not Found');
			return error;
		}

		const company = findCompanyFromId(results.gamecompany, results.companies);
		const genres = findGenresFromIds(results.gamegenres, results.genres);
		const systems = [
			{ name: 'PS3', available: results.game.ps3 },
			{ name: 'PS4', available: results.game.ps4 },
			{ name: 'PS5', available: results.game.ps5 },
		];
		const availableSystems = systems.filter((system) => system.available);

		return res.render('./game/game_detail', {
			title: results.game.name,
			game: results.game,
			company,
			genres,
			availableSystems,
		});
	});
};

// Display game create form on GET
exports.game_create_get = (req, res, next) => {
	async.parallel(
		{
			companies: async () => {
				return db.any('SELECT * FROM company');
			},
			genres: async () => {
				return db.any('SELECT * FROM genre');
			},
		},
		(err, results) => {
			if (err) return next(err);

			const companies = results.companies.sort((a, b) => a.name > b.name);

			return res.render('./game/game_form', {
				title: 'Add Game',
				companies,
				genres: results.genres,
				game: { systems: [{}, {}, {}] },
			});
		}
	);
};

// Handle game create on POST
exports.game_create_post = [
	(req, res, next) => {
		if (!(req.body.genres instanceof Array)) {
			if (req.body.genres === undefined) req.body.genres = [];
			else req.body.genres = Array.from(req.body.genres);
		}
		if (!(req.body.system instanceof Array)) {
			if (req.body.system === undefined) req.body.system = [];
			else req.body.system = Array.from(req.body.system);
		}
		next();
	},
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum game name length is 3')
		.escape(),
	body('price')
		.trim()
		.notEmpty()
		.withMessage('Price required')
		.isInt({ min: 1, max: 1000 })
		.withMessage('Min Max price 1-1000')
		.escape()
		.toInt(),
	body('copies')
		.trim()
		.notEmpty()
		.withMessage('Copies required')
		.isInt({ min: 1, max: 1000 })
		.withMessage('Min Max copies 1-1000')
		.escape()
		.toInt(),
	body('companies')
		.trim()
		.notEmpty()
		.withMessage('Company required')
		.escape()
		.toInt(),
	body('system.*').escape(),
	body('genres.*').escape(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const genreIds = req.body.genres.map((id) => +id);
		const systemIds = req.body.system.map((id) => +id);
		const systems = [{ id: 3 }, { id: 4 }, { id: 5 }];
		const { name, price, copies } = req.body;
		let imageName = '';

		for (let i = 0; i < systems.length; i += 1) {
			if (systemIds.indexOf(systems[i].id) > -1) {
				systems[i].checked = true;
			} else systems[i].checked = false;
		}

		if (req.file) imageName = req.file.filename;
		if (!errors.isEmpty()) {
			async.parallel(
				{
					companies: async () => {
						return db.any('SELECT * FROM company');
					},
					genres: async () => {
						return db.any('SELECT * FROM genre');
					},
				},
				(err, results) => {
					if (err) return next(err);

					const checkedGenres = [...results.genres];

					for (let i = 0; i < results.genres.length; i += 1) {
						if (genreIds.indexOf(checkedGenres[i].id) > -1)
							checkedGenres[i].checked = true;
					}

					return res.render('./game/game_form', {
						title: 'Add Game',
						game: { ...req.body, systems },
						companies: results.companies,
						genres: checkedGenres,
						errors: errors.array(),
					});
				}
			);
			return null;
		}

		return async.parallel(
			{
				gameExists: async () => {
					return db.oneOrNone('SELECT id FROM game WHERE name = $1', [name]);
				},
				newGame: async () => {
					return db.one(
						'INSERT INTO game (name, ps3, ps4, ps5, copies, price, image) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
						[
							name,
							systems[0].checked,
							systems[1].checked,
							systems[2].checked,
							copies,
							price,
							imageName,
						]
					);
				},
			},
			async (err, results) => {
				if (err) return next(err);
				if (results.gameExists)
					return res.redirect(`/game/${results.gameExists.id}`);

				await db.none(
					'INSERT INTO gamecompany (gameid, companyid) VALUES($1, $2)',
					[results.newGame.id, req.body.companies]
				);

				for (let i = 0; i < genreIds.length; i += 1) {
					// limited connections
					// eslint-disable-next-line no-await-in-loop
					await db.none(
						'INSERT INTO gamegenre (gameid, genreid) VALUES($1, $2)',
						[results.newGame.id, genreIds[i]]
					);
				}

				return res.redirect(`/game/${results.newGame.id}`);
			}
		);
	},
];

// Display game update form on GET
exports.game_update_get = (req, res, next) => {
	async.series(gameCoreDatabaseCalls(req.params.id), (err, results) => {
		if (err) return next(err);
		if (results.game === null) {
			const error = new Error('Game not found');
			return next(error);
		}
		const genreIds = results.gamegenres.map((id) => +id.genreid);
		const checkedGenres = [...results.genres];
		const systems = [
			{ name: 'PS3', checked: results.game.ps3 },
			{ name: 'PS4', checked: results.game.ps4 },
			{ name: 'PS5', checked: results.game.ps5 },
		];

		for (let i = 0; i < results.genres.length; i += 1) {
			if (genreIds.indexOf(checkedGenres[i].id) > -1)
				checkedGenres[i].checked = true;
		}

		return res.render('./game/game_form', {
			title: 'Update Game',
			companies: results.companies,
			genres: checkedGenres,
			game: {
				...results.game,
				companies: results.gamecompany.companyid,
				systems,
			},
		});
	});
};

// Handle game update on POST
exports.game_update_post = [
	(req, res, next) => {
		if (!(req.body.genres instanceof Array)) {
			if (req.body.genres === undefined) req.body.genres = [];
			else req.body.genres = Array.from(req.body.genres);
		}
		if (!(req.body.system instanceof Array)) {
			if (req.body.system === undefined) req.body.system = [];
			else req.body.system = Array.from(req.body.system);
		}
		next();
	},
	body('name')
		.trim()
		.isLength({ min: 3 })
		.withMessage('Minimum game name length is 3')
		.escape(),
	body('price')
		.trim()
		.notEmpty()
		.withMessage('Price required')
		.isInt({ min: 1, max: 1000 })
		.withMessage('Min Max price 1-1000')
		.escape()
		.toInt(),
	body('copies')
		.trim()
		.notEmpty()
		.withMessage('Copies required')
		.isInt({ min: 1, max: 1000 })
		.withMessage('Min Max copies 1-1000')
		.escape()
		.toInt(),
	body('companies')
		.trim()
		.notEmpty()
		.withMessage('Company required')
		.escape()
		.toInt(),
	body('system.*').escape(),
	body('genres.*').escape(),
	async (req, res, next) => {
		const errors = validationResult(req);
		const genreIds = req.body.genres.map((id) => +id);
		const systemIds = req.body.system.map((id) => +id);
		const systems = [{ id: 3 }, { id: 4 }, { id: 5 }];
		const { name, price, copies, companies } = req.body;
		let imageName = '';

		for (let i = 0; i < systems.length; i += 1) {
			if (systemIds.indexOf(systems[i].id) > -1) {
				systems[i].checked = true;
			} else systems[i].checked = false;
		}

		if (req.file) imageName = req.file.filename;
		if (!errors.isEmpty()) {
			async.parallel(
				{
					companies: async () => {
						return db.any('SELECT * FROM company');
					},
					genres: async () => {
						return db.any('SELECT * FROM genre');
					},
				},
				(err, results) => {
					if (err) return next(err);

					const checkedGenres = [...results.genres];

					for (let i = 0; i < results.genres.length; i += 1) {
						if (genreIds.indexOf(checkedGenres[i].id) > -1)
							checkedGenres[i].checked = true;
					}

					return res.render('./game/game_form', {
						title: 'Add Game',
						game: { ...req.body, systems },
						companies: results.companies,
						genres: checkedGenres,
						errors: errors.array(),
					});
				}
			);
			return null;
		}

		return async.parallel(
			{
				updateGame: async () => {
					return db.none(
						'Update game SET (name, ps3, ps4, ps5, copies, price, image) = ($1, $2, $3, $4, $5, $6, $8) WHERE id = $7',
						[
							name,
							systems[0].checked,
							systems[1].checked,
							systems[2].checked,
							copies,
							price,
							req.params.id,
							imageName,
						]
					);
				},
				updateCompany: async () => {
					return db.none(
						'Update gamecompany SET companyid = $2 WHERE gameid = $1',
						[req.params.id, companies]
					);
				},
				deleteOldGameGenres: async () => {
					return db.none('DELETE FROM gamegenre WHERE gameid = ($1)', [
						req.params.id,
					]);
				},
			},
			async (err) => {
				if (err) return next(err);

				for (let i = 0; i < genreIds.length; i += 1) {
					// limited connections
					// eslint-disable-next-line no-await-in-loop
					await db.none(
						'INSERT INTO gamegenre (gameid, genreid) VALUES($1, $2)',
						[req.params.id, genreIds[i]]
					);
				}

				return res.redirect(`/game/${req.params.id}`);
			}
		);
	},
];

// Display game delete form on GET
exports.game_delete_get = async (req, res, next) => {
	try {
		const game = await db.oneOrNone('SELECT * FROM game WHERE id = $1', [
			req.params.id,
		]);
		res.render('./game/game_delete', { title: 'Delete Game', game });
	} catch (error) {
		next(error);
	}
};

// Handle game delete on POST
exports.game_delete_post = (req, res, next) => {
	async.series(
		{
			gamegenre: async () => {
				return db.none('DELETE FROM gamegenre WHERE gameid = $1', [
					req.body.id,
				]);
			},
			gamecomapny: async () => {
				return db.none('DELETE FROM gamecompany WHERE gameid = $1', [
					req.body.id,
				]);
			},
			game: async () => {
				return db.none('DELETE FROM game WHERE id = $1', [req.body.id]);
			},
		},
		(err) => {
			if (err) return next(err);

			return res.redirect('/games');
		}
	);
};
